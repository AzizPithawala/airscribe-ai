/**
 * AirScribe AI — Workspace Component (Zone A)
 * §3.1: "Zone A — dark workspace (webcam + canvas)"
 * §3.5: "Workspace zone uses dark workspace tokens at ALL times regardless of theme"
 * §4.4: Canvas Architecture (Critical Path) — imperative canvas via ref
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSessionStore } from '../../../store/sessionStore';
import { useModelStore } from '../../../store/modelStore';
import { GestureStatusBadge } from './GestureStatusBadge';
import { IdleOverlay } from './IdleOverlay';
import { PermissionOverlay } from './PermissionOverlay';
import { InferenceOverlay } from '../../recognition/components/InferenceOverlay';
import { useWebcam } from '../hooks/useWebcam';
import { useCanvas } from '../hooks/useCanvas';
import { useInference } from '../hooks/useInference';
import { StrokeEngine } from '../StrokeEngine';
import { classifyGesture } from '../gestureRules';
import { LANDMARK } from '../../../types';
import { PALM_CLEAR_HOLD_MS } from '../../../constants';
import type { LandmarkPoint } from '../../../types';

export function Workspace() {
  const uiState = useSessionStore((s) => s.uiState);
  const badgeState = useSessionStore((s) => s.badgeState);
  const cameraReady = useSessionStore((s) => s.cameraReady);
  const cameraError = useSessionStore((s) => s.cameraError);
  const setBadgeState = useSessionStore((s) => s.setBadgeState);
  const setUIState = useSessionStore((s) => s.setUIState);
  const setLastGesture = useSessionStore((s) => s.setLastGesture);
  const removeLastWord = useSessionStore((s) => s.removeLastWord);
  const clearWords = useSessionStore((s) => s.clearWords);
  const showToast = useSessionStore((s) => s.showToast);
  const exportText = useSessionStore((s) => s.exportText);

  // Palm clear hold timer (§5.3: 400ms hold)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHoldStartRef = useRef<number>(0);

  // Model loading progress for visual feedback
  const loadingProgress = useModelStore((s) => s.loadingProgress);
  const modelReady = useModelStore((s) => s.modelReady);

  // Stroke engine with gesture classifier (§4.2: Dependency Inversion)
  const strokeEngine = useMemo(
    () => new StrokeEngine({ classifyGesture }),
    []
  );

  // §8.2: Inference pipeline — connects stroke → preprocessing → ONNX → UI
  const { processStroke } = useInference();

  const isDrawing = uiState === 'drawing';
  const { canvasRef, clearCanvas, drawPoint } = useCanvas({ isDrawing });

  // Handle hand landmarks from MediaPipe
  const handleHandResults = useCallback(
    (landmarks: LandmarkPoint[]) => {
      if (!cameraReady) return;

      const indexTip = landmarks[LANDMARK.INDEX_TIP];
      if (!indexTip) return;

      // Update badge state
      setBadgeState('tracking');

      // Process through stroke engine
      strokeEngine.processFrame(landmarks, indexTip);

      // Update UI state based on drawing
      if (strokeEngine.getIsDrawing()) {
        setUIState('drawing');
        setBadgeState('drawing');
        drawPoint(indexTip.x, indexTip.y);
      } else if (uiState === 'drawing') {
        setUIState('idle');
      }
    },
    [cameraReady, strokeEngine, setBadgeState, setUIState, drawPoint, uiState]
  );

  const handleNoHand = useCallback(() => {
    if (cameraReady) {
      setBadgeState('idle');
      if (uiState === 'drawing') {
        // Complete stroke on hand loss
        strokeEngine.completeStroke();
        setUIState('idle');
      }
    }
  }, [cameraReady, uiState, strokeEngine, setBadgeState, setUIState]);

  const { videoRef, isLoading, isModelReady, cameraActive, error, requestCamera, stopCamera } = useWebcam({
    onHandResults: handleHandResults,
    onNoHand: handleNoHand,
  });

  // Handle gesture events from stroke engine
  useEffect(() => {
    const unsubGesture = strokeEngine.on('gestureDetected', (event) => {
      if (!event.gesture) return;

      const { type } = event.gesture;
      setLastGesture(type);

      switch (type) {
        case 'clear':
          // §5.3: 400ms hold for clear
          if (!clearTimerRef.current) {
            clearHoldStartRef.current = Date.now();
            clearTimerRef.current = setTimeout(() => {
              clearCanvas();
              clearWords();
              showToast('Canvas cleared', 'info');
              setUIState('clear');
              clearTimerRef.current = null;
            }, PALM_CLEAR_HOLD_MS);
          }
          break;

        case 'undo':
          removeLastWord();
          showToast('Last word removed', 'info');
          setUIState('undo');
          break;

        case 'confirm': {
          const text = exportText();
          if (text) {
            navigator.clipboard.writeText(text).catch(() => { /* clipboard may not be available */ });
            showToast('Text copied to clipboard!', 'success');
          }
          setUIState('confirm');
          break;
        }

        case 'pause':
          setBadgeState('paused');
          setUIState('idle');
          break;

        default:
          break;
      }
    });

    const unsubComplete = strokeEngine.on('strokeComplete', (event) => {
      if (event.completedStroke) {
        // §8.2: Full pipeline — stroke → preprocessing worker → ONNX → UI
        processStroke(event.completedStroke);
      }
    });

    return () => {
      unsubGesture();
      unsubComplete();
    };
  }, [
    strokeEngine,
    setLastGesture,
    clearCanvas,
    clearWords,
    removeLastWord,
    showToast,
    setUIState,
    setBadgeState,
    exportText,
  ]);

  // §3.4: Keyboard shortcuts — every gesture has keyboard equivalent
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key.toLowerCase()) {
        case '?':
          showToast('Gestures: ☝️ Index up = Draw · ✌️ Two fingers = Undo · 🖐 Open palm = Clear', 'info');
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            removeLastWord();
            showToast('Last word removed', 'info');
          }
          break;
        case ' ':
          e.preventDefault();
          setBadgeState('paused');
          setUIState('idle');
          break;
        case 'escape':
          if (cameraActive) {
            stopCamera();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [removeLastWord, showToast, setBadgeState, setUIState, cameraActive, stopCamera]);

  // Cleanup stroke engine on unmount
  useEffect(() => {
    return () => strokeEngine.destroy();
  }, [strokeEngine]);

  // Show permission overlay if camera not active
  if (!cameraActive && !isLoading) {
    return <PermissionOverlay onRequestCamera={requestCamera} error={error ?? cameraError} />;
  }

  return (
    <div className="zone-workspace" id="workspace-zone">
      {/* Webcam video (§5.1: selfieMode mirror) */}
      <video
        ref={videoRef}
        className="webcam-video"
        autoPlay
        playsInline
        muted
        style={{ display: cameraReady ? 'block' : 'none' }}
        aria-hidden="true"
      />

      {/* Drawing canvas (§4.4: imperative via ref) */}
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        aria-label="Air writing canvas"
      />

      {/* Status badge (§3.2: always visible, top-right) */}
      <GestureStatusBadge state={badgeState} />

      {/* ── Stop Camera button ─────────────────────────────── */}
      {cameraActive && (
        <button
          className="workspace-stop-btn"
          onClick={stopCamera}
          title="Stop camera (Esc)"
          aria-label="Stop camera"
          id="workspace-stop-camera-btn"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor" />
          </svg>
          Stop Camera
        </button>
      )}

      {/* Inference overlay (§3.3: word-complete, high-confidence, low-confidence) */}
      <InferenceOverlay />

      {/* Model loading progress bar */}
      {!modelReady && loadingProgress > 0 && loadingProgress < 100 && (
        <div className="model-loading-bar">
          <div className="model-loading-bar__fill" style={{ width: `${loadingProgress}%` }} />
        </div>
      )}

      {/* Camera / model initialising spinner */}
      {isLoading && (
        <div className="workspace-loading-overlay">
          <div className="training-indicator__spinner" style={{ width: 32, height: 32 }} />
          <p style={{ font: 'var(--text-body)', color: 'var(--ws-text)', opacity: 0.85 }}>
            Starting camera…
          </p>
        </div>
      )}

      {/* MediaPipe model loading — camera is up but WASM not ready yet */}
      {cameraReady && !isModelReady && !isLoading && (
        <div className="workspace-loading-overlay">
          <div className="training-indicator__spinner" style={{ width: 28, height: 28 }} />
          <p style={{ font: 'var(--text-body)', color: 'var(--ws-text)', opacity: 0.85 }}>
            Loading hand tracking model…
          </p>
          <p style={{ font: 'var(--text-caption)', color: 'var(--ws-text)', opacity: 0.5 }}>
            First load downloads ~10 MB from CDN
          </p>
        </div>
      )}

      {/* Idle overlay — only show once model is ready and no hand detected */}
      {cameraReady && isModelReady && uiState === 'idle' && badgeState === 'idle' && (
        <IdleOverlay />
      )}
    </div>
  );
}
