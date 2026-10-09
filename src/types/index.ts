/**
 * AirScribe AI — Global TypeScript Interfaces & Enums
 * §4.3: Global TypeScript interfaces and enums
 * §4.2: Strict TypeScript, no `any`, all parameters typed
 */

// ─── Gesture Types (§3.4) ───────────────────────────────────────────────────

/** All recognised gesture types per §3.4 */
export type GestureType =
  | 'draw'
  | 'clear'
  | 'undo'
  | 'confirm'
  | 'pause'
  | 'space'
  | 'backspace'
  | 'none';

/** Gesture detection result from the rule-based classifier */
export interface GestureResult {
  readonly type: GestureType;
  readonly confidence: number;
  readonly timestamp: number;
}

// ─── Hand Tracking Types (§5.1, §5.2) ──────────────────────────────────────

/** MediaPipe hand landmark indices used by AirScribe (§5.2) */
export const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  PINKY_MCP: 17,
} as const;

/** Single 3D landmark point from MediaPipe */
export interface LandmarkPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly visibility?: number;
}

// ─── Stroke Types (§4.4) ────────────────────────────────────────────────────

/** Stroke buffer data schema per §4.4 */
export interface StrokeData {
  readonly strokeId: string;
  readonly points: Float32Array;
  readonly timestamps: Uint32Array;
  readonly pressure: Float32Array;
  readonly fingerIndex: 0 | 1 | 2 | 3 | 4;
  readonly complete: boolean;
}

/** Completed stroke ready for preprocessing */
export interface CompletedStroke {
  readonly strokeId: string;
  readonly points: Float32Array;
  readonly timestamps: Uint32Array;
  readonly pressure: Float32Array;
}

// ─── Recognition Types (§6.1, §6.3) ─────────────────────────────────────────

/** Inference mode: CNN char-level or CRNN word-level (§6.1) */
export type InferenceMode = 'char' | 'word';

/** Prediction result from RecognitionService (§8.2) */
export interface Prediction {
  readonly text: string | null;
  readonly confidence: number;
  readonly alternatives: ReadonlyArray<{ text: string; confidence: number }>;
  readonly modelId: string;
  readonly latencyMs: number;
  readonly error?: string;
}

// ─── UI State Machine (§3.3) ────────────────────────────────────────────────

/** All 13 UI states from the complete state map (§3.3) */
export type UIState =
  | 'no-camera'
  | 'loading'
  | 'idle'
  | 'hand-detected'
  | 'drawing'
  | 'word-complete'
  | 'high-confidence'
  | 'low-confidence'
  | 'correction'
  | 'undo'
  | 'clear'
  | 'confirm'
  | 'error'
  | 'training';

/** Gesture status badge states (§3.2) */
export type StatusBadgeState = 'idle' | 'tracking' | 'drawing' | 'paused' | 'error';

// ─── Model Versioning (§6.4) ────────────────────────────────────────────────

/** Model version status lifecycle (§6.4) */
export type ModelStatus = 'candidate' | 'canary' | 'active' | 'rolled-back' | 'archived';

/** Model version registry entry (§6.4) */
export interface ModelVersion {
  readonly modelId: string;
  readonly parentModelId: string | null;
  readonly trainedAt: string; // ISO 8601
  readonly sampleCount: number;
  readonly validationAccuracy: number;
  readonly baselineAccuracy: number;
  readonly regressionDelta: number;
  readonly status: ModelStatus;
}

// ─── Feedback (§6.5) ────────────────────────────────────────────────────────

/** Feedback entry for self-learning pipeline (§6.5) */
export interface FeedbackEntry {
  readonly id?: number; // auto-increment
  readonly userId: string;
  readonly strokeId: string;
  readonly stroke: Float32Array;
  readonly predicted: string;
  readonly corrected: string;
  readonly modelId: string;
  readonly sessionId: string;
  readonly createdAt: string;
}

// ─── Session (§8.3) ─────────────────────────────────────────────────────────

/** Session record in IndexedDB (§8.3) */
export interface SessionRecord {
  readonly sessionId: string;
  readonly userId: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly wordCount: number;
  readonly accuracyEstimate: number;
}

/** Recognised word in session timeline (§3.2) */
export interface RecognisedWord {
  readonly id: string;
  readonly text: string;
  readonly confidence: number;
  readonly timestamp: number;
  readonly strokeId: string;
  readonly corrected?: string;
}

// ─── Settings (§3.2, §8.3) ──────────────────────────────────────────────────

/** Hand preference setting */
export type HandPreference = 'left' | 'right';

/** Writing style preference (§3.2) */
export type WritingStyle = 'block' | 'cursive' | 'print';

/** Theme preference (§3.5) */
export type ThemePreference = 'light' | 'dark' | 'system';

/** User settings schema (§8.3) */
export interface UserSettings {
  readonly handPreference: HandPreference;
  readonly sensitivity: number;
  readonly language: string;
  readonly writingStyle: WritingStyle;
  readonly theme: ThemePreference;
  readonly consentGiven: boolean;
  readonly consentAt?: string;
}

// ─── Result Type (§4.2) ─────────────────────────────────────────────────────

/** 
 * Result type for explicit error handling (§4.2):
 * "Every async function returns Result<T, E>. No silent catch blocks."
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ─── Language Config (§12.1) ─────────────────────────────────────────────────

/** Language configuration interface (§12.1) */
export interface LanguageConfig {
  readonly languageCode: string; // BCP 47
  readonly charset: readonly string[];
  readonly modelArtifactUrl: string;
  readonly nlpDictionaryUrl: string;
  readonly trigramModelUrl: string;
  readonly rtl: boolean;
  readonly strokeDirection: 'ltr' | 'rtl' | 'ttb';
  readonly minimumDataset: number;
}
