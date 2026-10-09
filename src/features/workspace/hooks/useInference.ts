/**
 * AirScribe AI — useInference Hook
 * Wires the complete inference pipeline:
 * Stroke Engine → Preprocessing Worker (Comlink) → RecognitionService (ONNX) → UI State
 *
 * §4.4: "React state is only updated on discrete events: word completion, gesture detection, error"
 * §5.4: "Main thread receives only the final Float32Array(4096)"
 * §8.2: RecognitionService manages ONNX session lifecycle
 */

import { useEffect, useRef, useCallback } from 'react';
import * as Comlink from 'comlink';
import { useSessionStore } from '../../../store/sessionStore';
import { useModelStore } from '../../../store/modelStore';
import { recognitionService } from '../../recognition/services/RecognitionService';
import { HIGH_CONFIDENCE_THRESHOLD, MIN_CONFIDENCE } from '../../../constants';
import type { CompletedStroke } from '../../../types';
import type { PreprocessingAPI } from '../../../workers/preprocessing.worker';

/**
 * Hook that manages the full inference pipeline from stroke completion to prediction display.
 * Returns a function to process completed strokes.
 */
export function useInference() {
  const addWord = useSessionStore((s) => s.addWord);
  const setUIState = useSessionStore((s) => s.setUIState);
  const showToast = useSessionStore((s) => s.showToast);
  const sessionId = useSessionStore((s) => s.sessionId);

  const setModelReady = useModelStore((s) => s.setModelReady);
  const setExecutionProvider = useModelStore((s) => s.setExecutionProvider);
  const setModelError = useModelStore((s) => s.setModelError);
  const setLoadingProgress = useModelStore((s) => s.setLoadingProgress);
  const incrementPredictions = useModelStore((s) => s.incrementPredictions);
  const inferenceMode = useModelStore((s) => s.inferenceMode);

  const workerRef = useRef<Comlink.Remote<PreprocessingAPI> | null>(null);
  const initRef = useRef(false);

  // Initialize ONNX runtime and preprocessing worker on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      try {
        // 1. Start preprocessing worker (§5.4: Comlink for typed communication)
        setLoadingProgress(10);
        const worker = new Worker(
          new URL('../../../workers/preprocessing.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = Comlink.wrap<PreprocessingAPI>(worker);
        setLoadingProgress(30);

        // 2. Initialize ONNX Runtime (§6.2)
        setLoadingProgress(50);
        const result = await recognitionService.initialize();
        setLoadingProgress(90);

        if (!result.ok) {
          setModelError(result.error);
          showToast('Model loading failed — using demo mode', 'info');
        }

        // 3. Set execution provider for telemetry (§6.2)
        const provider = recognitionService.getExecutionProvider();
        if (provider === 'webgl' || provider === 'wasm-simd' || provider === 'wasm') {
          setExecutionProvider(provider);
        }

        setModelReady(true);
        setLoadingProgress(100);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Inference init failed';
        setModelError(message);
        showToast(`Model error: ${message}`, 'error');
      }
    }

    init();

    return () => {
      recognitionService.dispose();
    };
  }, [setModelReady, setExecutionProvider, setModelError, setLoadingProgress, showToast]);

  /**
   * Process a completed stroke through the full pipeline:
   * 1. Send to preprocessing worker (§5.4: 8-stage pipeline)
   * 2. Receive Float32Array(4096)
   * 3. Send to RecognitionService (§8.2: ONNX inference)
   * 4. Update UI state based on confidence (§3.3)
   */
  const processStroke = useCallback(
    async (completedStroke: CompletedStroke) => {
      const worker = workerRef.current;
      if (!worker) {
        showToast('Preprocessing worker not ready', 'error');
        return;
      }

      if (!recognitionService.isReady()) {
        showToast('Recognition model not ready', 'error');
        return;
      }

      try {
        // §3.3: word-complete state — "Stroke freezes, inference spinner 100ms"
        setUIState('word-complete');

        // §5.4: Send to preprocessing worker — main thread only receives Float32Array(4096)
        const tensor = await worker.preprocessStroke(
          Comlink.transfer(completedStroke.points, [completedStroke.points.buffer])
        );

        // Check if stroke was too short (discarded by worker)
        if (!tensor || tensor.length === 0) {
          setUIState('idle');
          return;
        }

        // §8.2: Run inference via RecognitionService
        const prediction = await recognitionService.predict(tensor, inferenceMode);

        if (prediction.error) {
          // §3.3: error state — "Red banner, error code, retry option, no data lost"
          setUIState('error');
          showToast(`Recognition failed: ${prediction.error}`, 'error');
          return;
        }

        if (!prediction.text) {
          setUIState('idle');
          return;
        }

        // §3.3: Update UI based on confidence threshold
        if (prediction.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
          // §3.3: high-confidence — "Word appears green, added to timeline, no user action required"
          setUIState('high-confidence');
          incrementPredictions(true);
        } else if (prediction.confidence < MIN_CONFIDENCE) {
          // §3.3: low-confidence — "Word appears amber, correction banner shown, vibration hint"
          setUIState('low-confidence');
          incrementPredictions(false);

          // §3.3: Vibration hint for low confidence
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        } else {
          // Medium confidence — accept but show amber indicator
          setUIState('high-confidence');
          incrementPredictions(true);
        }

        // Add word to session timeline (§3.2: SessionTimeline)
        addWord({
          text: prediction.text,
          confidence: prediction.confidence,
          timestamp: Date.now(),
          strokeId: completedStroke.strokeId,
        });

        // Reset to idle after brief display
        setTimeout(() => {
          setUIState('idle');
        }, 500);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Processing failed';
        setUIState('error');
        showToast(message, 'error');
        setTimeout(() => setUIState('idle'), 2000);
      }
    },
    [addWord, setUIState, showToast, inferenceMode, incrementPredictions, sessionId]
  );

  return { processStroke };
}
