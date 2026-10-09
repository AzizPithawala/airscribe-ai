/**
 * AirScribe AI — useWebcam Hook
 * §5.1: MediaPipe Hands Configuration
 * §4.5: "MediaPipe Hands results are processed and immediately discarded"
 * §11.2: "Lazy load MediaPipe: defer loading until camera permission granted"
 *
 * CDN approach: @mediapipe/hands is CDN-first. We inject a <script> tag so
 * the library attaches window.Hands. ES module import returns undefined.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSessionStore } from '../../../store/sessionStore';
import {
  MAX_NUM_HANDS,
  MODEL_COMPLEXITY,
  MIN_DETECTION_CONFIDENCE,
  MIN_TRACKING_CONFIDENCE,
} from '../../../constants';
import type { LandmarkPoint } from '../../../types';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';

interface UseWebcamOptions {
  onHandResults: (landmarks: LandmarkPoint[]) => void;
  onNoHand: () => void;
}

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isLoading: boolean;
  isModelReady: boolean;
  cameraActive: boolean;
  error: string | null;
  requestCamera: () => Promise<void>;
  stopCamera: () => void;
}

interface MediaPipeHands {
  setOptions(opts: {
    maxNumHands: number;
    modelComplexity: number;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
    selfieMode: boolean;
  }): void;
  onResults(callback: (results: { multiHandLandmarks?: LandmarkPoint[][] }) => void): void;
  send(opts: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Hands: new (config: { locateFile: (file: string) => string }) => MediaPipeHands;
  }
}

/** Inject a <script> tag; resolves when loaded, idempotent for same src. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      // Already injected — wait a tick then resolve (might still be loading)
      const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Script load error')));
      }
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(script);
  });
}

export function useWebcam({ onHandResults, onNoHand }: UseWebcamOptions): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<MediaPipeHands | null>(null);
  const rafIdRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  // Stable callbacks refs so the rAF loop always calls the latest version
  const onHandResultsRef = useRef(onHandResults);
  const onNoHandRef = useRef(onNoHand);

  const [isLoading, setIsLoading] = useState(false);
  // isModelReady = MediaPipe WASM + weights downloaded and first inference ran
  const [isModelReady, setIsModelReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setCameraReady, setCameraError, setUIState } = useSessionStore();

  // Keep callback refs stable
  useEffect(() => { onHandResultsRef.current = onHandResults; }, [onHandResults]);
  useEffect(() => { onNoHandRef.current = onNoHand; }, [onNoHand]);

  /** Stop camera + hand tracking completely */
  const stopCamera = useCallback(() => {
    // Cancel rAF loop
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    // Stop media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Close MediaPipe session
    if (handsRef.current) {
      try { handsRef.current.close(); } catch { /* ignore */ }
      handsRef.current = null;
    }
    // Clear video src
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsModelReady(false);
    setCameraReady(false);
    setUIState('no-camera');
  }, [setCameraReady, setUIState]);

  const requestCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsModelReady(false);

      // 1. Get camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 2. Lazy-load MediaPipe CDN bundle
      await loadScript(`${MEDIAPIPE_CDN}/hands.js`);

      // Give the script a moment to fully evaluate if needed
      await new Promise((r) => setTimeout(r, 100));

      if (typeof window.Hands !== 'function') {
        throw new Error(
          'MediaPipe Hands could not be loaded. Check your internet connection and try again.'
        );
      }

      // 3. Init MediaPipe Hands instance
      const hands = new window.Hands({
        locateFile: (file: string) => `${MEDIAPIPE_CDN}/${file}`,
      });

      hands.setOptions({
        maxNumHands: MAX_NUM_HANDS,
        modelComplexity: MODEL_COMPLEXITY,
        minDetectionConfidence: MIN_DETECTION_CONFIDENCE,
        minTrackingConfidence: MIN_TRACKING_CONFIDENCE,
        selfieMode: true,
      });

      // 4. Wire results — first callback proves WASM is ready
      hands.onResults((results) => {
        // First result = model fully loaded
        if (!isModelReady) {
          setIsModelReady(true);
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          if (landmarks) {
            onHandResultsRef.current([...landmarks]);
          }
        } else {
          onNoHandRef.current();
        }
      });

      handsRef.current = hands;
      setCameraActive(true);
      setCameraReady(true);
      setCameraError(null);
      setUIState('idle');
      setIsLoading(false);

      // 5. Kick off the detection loop — first send triggers WASM download
      startDetectionLoop(hands);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      setCameraError(message);
      setUIState('no-camera');
      setIsLoading(false);
      setCameraActive(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCameraReady, setCameraError, setUIState]);

  function startDetectionLoop(hands: MediaPipeHands) {
    const detect = async () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && !video.paused) {
        try {
          await hands.send({ image: video });
        } catch {
          // Skip frame on error — next frame retries
        }
      }
      rafIdRef.current = requestAnimationFrame(detect);
    };
    rafIdRef.current = requestAnimationFrame(detect);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      try { handsRef.current?.close(); } catch { /* ignore */ }
    };
  }, []);

  return { videoRef, isLoading, isModelReady, cameraActive, error, requestCamera, stopCamera };
}
