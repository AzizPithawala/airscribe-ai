/**
 * AirScribe AI — Model Store (Zustand)
 * §6.4: Model versioning & safety system
 * §8.2: modelStore manages ONNX session lifecycle and model version state
 */

import { create } from 'zustand';
import type { ModelStatus } from '../types';

interface ModelState {
  /** Currently active model ID */
  readonly activeModelId: string;
  /** Canary model ID if in canary deployment */
  readonly canaryModelId: string | null;
  /** Current model status */
  readonly modelStatus: ModelStatus;
  /** Whether the ONNX session is loaded and ready */
  readonly modelReady: boolean;
  /** Model loading progress (0–100) */
  readonly loadingProgress: number;
  /** Execution provider detected at startup (§6.2) */
  readonly executionProvider: 'webgl' | 'wasm-simd' | 'wasm' | null;
  /** Pending feedback count for training trigger */
  readonly pendingFeedbackCount: number;
  /** Last training timestamp */
  readonly lastTrainedAt: string | null;
  /** Current session accuracy estimate */
  readonly sessionAccuracy: number;
  /** Total predictions in session */
  readonly sessionPredictions: number;
  /** Correct predictions (not corrected by user) */
  readonly sessionCorrect: number;
  /** Inference mode (§6.1) */
  readonly inferenceMode: 'char' | 'word';
  /** Error state */
  readonly modelError: string | null;

  // Actions
  setModelReady: (ready: boolean) => void;
  setLoadingProgress: (progress: number) => void;
  setExecutionProvider: (provider: 'webgl' | 'wasm-simd' | 'wasm') => void;
  setActiveModelId: (id: string) => void;
  setModelError: (error: string | null) => void;
  setInferenceMode: (mode: 'char' | 'word') => void;
  incrementPredictions: (correct: boolean) => void;
  setPendingFeedbackCount: (count: number) => void;
  setLastTrainedAt: (timestamp: string) => void;
}

export const useModelStore = create<ModelState>((set) => ({
  activeModelId: 'base-cnn-v1',
  canaryModelId: null,
  modelStatus: 'active',
  modelReady: false,
  loadingProgress: 0,
  executionProvider: null,
  pendingFeedbackCount: 0,
  lastTrainedAt: null,
  sessionAccuracy: 0,
  sessionPredictions: 0,
  sessionCorrect: 0,
  inferenceMode: 'char',
  modelError: null,

  setModelReady: (modelReady) => set({ modelReady }),
  setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
  setExecutionProvider: (executionProvider) => set({ executionProvider }),
  setActiveModelId: (activeModelId) => set({ activeModelId }),
  setModelError: (modelError) => set({ modelError }),
  setInferenceMode: (inferenceMode) => set({ inferenceMode }),

  incrementPredictions: (correct) =>
    set((state) => {
      const sessionPredictions = state.sessionPredictions + 1;
      const sessionCorrect = state.sessionCorrect + (correct ? 1 : 0);
      return {
        sessionPredictions,
        sessionCorrect,
        sessionAccuracy: sessionPredictions > 0 ? sessionCorrect / sessionPredictions : 0,
      };
    }),

  setPendingFeedbackCount: (pendingFeedbackCount) => set({ pendingFeedbackCount }),
  setLastTrainedAt: (lastTrainedAt) => set({ lastTrainedAt }),
}));
