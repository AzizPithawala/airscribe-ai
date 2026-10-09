/**
 * AirScribe AI — Named Constants
 * §4.2: "No magic numbers. All numeric constants defined in constants.ts with JSDoc explaining the rationale."
 * §4.3: src/constants.ts
 */

// ─── MediaPipe Configuration (§5.1) ─────────────────────────────────────────

/** Max hands to detect. Single-hand use case reduces compute. §5.1 */
export const MAX_NUM_HANDS = 1;

/** Full model complexity for cursive detection accuracy. §5.1 */
export const MODEL_COMPLEXITY = 1;

/** Balanced detection confidence — avoids false positives. §5.1 */
export const MIN_DETECTION_CONFIDENCE = 0.75;

/** Slightly lower than detection; allows recovery from brief occlusion. §5.1 */
export const MIN_TRACKING_CONFIDENCE = 0.65;

// ─── Gesture Thresholds (§5.3) ──────────────────────────────────────────────

/** Drawing gesture confidence threshold. §5.3 */
export const DRAW_GESTURE_THRESHOLD = 0.7;

/** Palm clear gesture hold time in ms to prevent accidental clears. §5.3 */
export const PALM_CLEAR_HOLD_MS = 400;

/** Palm normal z-component threshold for palm facing camera. §5.3 */
export const PALM_NORMAL_Z_THRESHOLD = 0.5;

/** Minimum finger extension above MCP for open palm detection. §5.3 */
export const FINGER_EXTENSION_THRESHOLD = 0.15;

// ─── Stroke Processing (§5.4, §5.5) ─────────────────────────────────────────

/** Circular stroke buffer capacity — points beyond composited to offscreen canvas. §4.4 */
export const STROKE_BUFFER_SIZE = 512;

/** Outlier rejection: points > N standard deviations from rolling mean velocity. §5.4 */
export const OUTLIER_STD_DEVS = 3;

/** Ramer-Douglas-Peucker epsilon for temporal downsampling. §5.4 */
export const RDP_EPSILON = 0.005;

/** Maximum points per stroke after downsampling. §5.4 */
export const MAX_POINTS_PER_STROKE = 100;

/** Catmull-Rom spline tension parameter. §5.4 */
export const CATMULL_ROM_TENSION = 0.5;

/** CNN input grid size in pixels. §5.4 */
export const CNN_INPUT_SIZE = 64;

/** Padding on each side of the 64×64 grid. §5.4 */
export const CNN_INPUT_PADDING = 4;

/** Minimum viable stroke threshold — strokes below this are noise. §5.5 */
export const MIN_STROKE_POINTS = 10;

/** Occlusion buffer hold time in ms before auto-completing stroke. §5.5 */
export const OCCLUSION_BUFFER_MS = 800;

/** Total float values in preprocessed tensor (64×64). §5.4 */
export const TENSOR_SIZE = 4096;

// ─── Recognition & Confidence (§6.1, §6.3) ──────────────────────────────────

/** High confidence threshold — predictions above this are accepted as-is. §3.3 */
export const HIGH_CONFIDENCE_THRESHOLD = 0.92;

/** Low confidence threshold — below this triggers NLP + correction UI. §6.3, §3.3 */
export const MIN_CONFIDENCE = 0.85;

/** Landmark confidence fallback threshold — use DIP instead of tip. §5.5 */
export const LANDMARK_CONFIDENCE_FALLBACK = 0.6;

// ─── Self-Learning (§6.5) ───────────────────────────────────────────────────

/** Minimum pending feedback samples to trigger training. §6.5 */
export const TRAIN_SAMPLE_THRESHOLD = 50;

/** Minimum hours since last training before allowing retrain. §6.5 */
export const TRAIN_COOLDOWN_HOURS = 1;

/** Regression delta threshold — model rejected if accuracy drops more than this. §6.4 */
export const REGRESSION_THRESHOLD = -0.01;

/** Canary traffic percentage for new model. §6.4 */
export const CANARY_TRAFFIC_PERCENT = 0.10;

/** Canary observation period in hours. §6.4 */
export const CANARY_PERIOD_HOURS = 24;

/** Model validation dataset size. §6.4 */
export const VALIDATION_SET_SIZE = 1000;

/** Maximum days to retain rolled-back models. §6.4 */
export const MODEL_RETENTION_DAYS = 30;

// ─── API (§7.1) ─────────────────────────────────────────────────────────────

/** API base URL. §7.1 */
export const API_BASE_URL = 'https://api.airscribe.ai/v1';

/** Rate limit for /predict endpoint. §7.1 */
export const PREDICT_RATE_LIMIT = 60; // per minute

/** Rate limit for /train endpoint. §7.1 */
export const TRAIN_RATE_LIMIT = 5; // per hour

/** Predict timeout in ms. §7.1 */
export const PREDICT_TIMEOUT_MS = 5000;

/** Train timeout in ms. §7.1 */
export const TRAIN_TIMEOUT_MS = 120_000;

// ─── Retry Configuration (§8.2) ─────────────────────────────────────────────

/** Maximum retry attempts for inference. §8.2 */
export const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff in ms. §8.2 */
export const RETRY_BASE_DELAY_MS = 100;

// ─── Performance (§11.1) ────────────────────────────────────────────────────

/** Target end-to-end latency in ms. §1.3 */
export const TARGET_E2E_LATENCY_MS = 150;

/** Target minimum FPS. §1.3 */
export const TARGET_MIN_FPS = 28;

/** Target character recognition accuracy. §1.3 */
export const TARGET_CHAR_ACCURACY = 0.92;

/** Target gesture recognition accuracy. §1.3 */
export const TARGET_GESTURE_ACCURACY = 0.95;

/** Maximum acceptable memory growth over 10 minutes in bytes. §1.3 */
export const MAX_MEMORY_GROWTH_10MIN = 50 * 1024 * 1024; // 50MB

// ─── NLP (§6.3) ─────────────────────────────────────────────────────────────

/** Maximum edit distance for SymSpell spell correction. §6.3 */
export const SYMSPELL_MAX_DISTANCE = 2;

/** Number of autocomplete suggestions shown. §6.3 */
export const SUGGESTION_COUNT = 3;

/** Context window for trigram model (previous N tokens). §6.3 */
export const TRIGRAM_CONTEXT_WINDOW = 2;

// ─── Data Retention (§9.1) ──────────────────────────────────────────────────

/** Auto-purge completed strokes older than N days. §4.5 */
export const STROKE_RETENTION_DAYS = 30;

/** Auto-purge feedback data older than N days. §9.1 */
export const FEEDBACK_RETENTION_DAYS = 90;

// ─── UI (§2.7, §3.2) ───────────────────────────────────────────────────────

/** Minimum touch target size in pixels. §2.7 */
export const MIN_TOUCH_TARGET_PX = 44;

/** Control chrome height in pixels. §3.1 */
export const CHROME_HEIGHT_PX = 48;

/** Sentry session replay max buffer in seconds. §4.5 */
export const SENTRY_REPLAY_BUFFER_S = 60;

/** Beam search width for CRNN decoding. §6.1 */
export const BEAM_SEARCH_WIDTH = 5;

// ─── Calibration (§3.2) ─────────────────────────────────────────────────────

/** Reference characters for calibration — selected for stroke diversity. §3.2 Step 2 */
export const CALIBRATION_CHARS = ['A', 'e', 'S', 'w', '3'] as const;

/** Number of calibration steps. §3.2 */
export const CALIBRATION_STEPS = 3;

/** Default sensitivity value (0-1 range). §3.2 */
export const DEFAULT_SENSITIVITY = 0.5;

/** Minimum strokes required during calibration test word. §3.2 Step 3 */
export const CALIBRATION_MIN_STROKES = 3;

