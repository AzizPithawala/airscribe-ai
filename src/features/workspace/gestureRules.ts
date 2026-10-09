/**
 * AirScribe AI — Gesture Rules (Rule-Based Classifier)
 * §5.3: "Gestures are classified using a rule-based classifier on normalised landmark positions,
 * not a learned model. This ensures deterministic, debuggable behaviour.
 * Rules are defined in gestureRules.ts as pure functions."
 *
 * All functions in this file are PURE — no side effects (§4.2).
 */

import type { LandmarkPoint, GestureResult } from '../../types';
import { LANDMARK } from '../../types';
import {
  DRAW_GESTURE_THRESHOLD,
  FINGER_EXTENSION_THRESHOLD,
  PALM_NORMAL_Z_THRESHOLD,
} from '../../constants';

/** Extract a single landmark from the 21-point array */
function getLandmark(landmarks: readonly LandmarkPoint[], index: number): LandmarkPoint {
  const lm = landmarks[index];
  if (!lm) {
    return { x: 0, y: 0, z: 0 };
  }
  return lm;
}

/** Check if a finger tip is extended (tip significantly above PIP joint in y-axis) */
function isFingerExtended(
  landmarks: readonly LandmarkPoint[],
  tipIdx: number,
  pipIdx: number
): boolean {
  const tip = getLandmark(landmarks, tipIdx);
  const pip = getLandmark(landmarks, pipIdx);
  // In MediaPipe, y increases downward, so extended means tip.y < pip.y
  return tip.y < pip.y - FINGER_EXTENSION_THRESHOLD;
}

/** Check if a finger is curled (tip below PIP joint) */
function isFingerCurled(
  landmarks: readonly LandmarkPoint[],
  tipIdx: number,
  pipIdx: number
): boolean {
  const tip = getLandmark(landmarks, tipIdx);
  const pip = getLandmark(landmarks, pipIdx);
  return tip.y > pip.y;
}

/**
 * §5.3 Drawing Gesture Detection
 * Condition: index finger extended (landmark 8 significantly above landmark 6)
 * AND all other fingers curled (tips below their PIP joints)
 * Confidence: ratio of index extension to total hand spread
 * Threshold: ≥ 0.7
 */
export function detectDrawGesture(landmarks: readonly LandmarkPoint[]): GestureResult {
  const indexTip = getLandmark(landmarks, LANDMARK.INDEX_TIP);
  const indexPip = getLandmark(landmarks, 6); // INDEX_PIP
  const wrist = getLandmark(landmarks, LANDMARK.WRIST);

  // Index must be extended
  const indexExtension = indexPip.y - indexTip.y;

  // All other fingers must be curled
  const middleCurled = isFingerCurled(landmarks, LANDMARK.MIDDLE_TIP, 10);
  const ringCurled = isFingerCurled(landmarks, 16, 14); // ring tip vs ring PIP
  const pinkyCurled = isFingerCurled(landmarks, 20, 18); // pinky tip vs pinky PIP
  // thumbCurled not used in confidence calc — palm-clear handles thumb separately

  const handSpread = Math.abs(wrist.y - indexTip.y) || 1;
  const confidence = Math.min(indexExtension / handSpread, 1);

  const isDrawing =
    indexExtension > FINGER_EXTENSION_THRESHOLD &&
    middleCurled &&
    ringCurled &&
    pinkyCurled &&
    confidence >= DRAW_GESTURE_THRESHOLD;

  return {
    type: isDrawing ? 'draw' : 'none',
    confidence: isDrawing ? confidence : 0,
    timestamp: Date.now(),
  };
}

/**
 * §5.3 Palm Clear Gesture
 * Condition: all 5 fingertips above their MCP joints by ≥ 0.15 normalised units
 * AND palm normal vector facing camera (z-component > 0.5)
 * Requires 400ms hold (handled by caller)
 */
export function detectClearGesture(landmarks: readonly LandmarkPoint[]): GestureResult {
  // Check all 5 fingers extended above MCP
  const fingers = [
    { tip: LANDMARK.THUMB_TIP, mcp: 2 },   // thumb
    { tip: LANDMARK.INDEX_TIP, mcp: LANDMARK.INDEX_MCP },
    { tip: LANDMARK.MIDDLE_TIP, mcp: LANDMARK.MIDDLE_MCP },
    { tip: 16, mcp: LANDMARK.RING_MCP },    // ring
    { tip: 20, mcp: 17 },                   // pinky (tip vs MCP)
  ];

  let allExtended = true;
  for (const finger of fingers) {
    const tip = getLandmark(landmarks, finger.tip);
    const mcp = getLandmark(landmarks, finger.mcp);
    if (mcp.y - tip.y < FINGER_EXTENSION_THRESHOLD) {
      allExtended = false;
      break;
    }
  }

  // Palm normal facing camera check
  const wrist = getLandmark(landmarks, LANDMARK.WRIST);
  const indexMcp = getLandmark(landmarks, LANDMARK.INDEX_MCP);
  const pinkyMcp = getLandmark(landmarks, 17);

  // Cross product of wrist→indexMcp × wrist→pinkyMcp
  const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y, z: indexMcp.z - wrist.z };
  const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y, z: pinkyMcp.z - wrist.z };
  const crossZ = v1.x * v2.y - v1.y * v2.x;

  const palmFacingCamera = Math.abs(crossZ) > PALM_NORMAL_Z_THRESHOLD;
  const isClear = allExtended && palmFacingCamera;

  return {
    type: isClear ? 'clear' : 'none',
    confidence: isClear ? 1 : 0,
    timestamp: Date.now(),
  };
}

/**
 * §3.4 Undo Gesture: two fingers extended (index + middle)
 */
export function detectUndoGesture(landmarks: readonly LandmarkPoint[]): GestureResult {
  const indexExtended = isFingerExtended(landmarks, LANDMARK.INDEX_TIP, 6);
  const middleExtended = isFingerExtended(landmarks, LANDMARK.MIDDLE_TIP, 10);
  const ringCurled = isFingerCurled(landmarks, 16, 14);
  const pinkyCurled = isFingerCurled(landmarks, 20, 18);

  const isUndo = indexExtended && middleExtended && ringCurled && pinkyCurled;

  return {
    type: isUndo ? 'undo' : 'none',
    confidence: isUndo ? 0.9 : 0,
    timestamp: Date.now(),
  };
}

/**
 * §3.4 Pause Gesture: closed fist
 */
export function detectPauseGesture(landmarks: readonly LandmarkPoint[]): GestureResult {
  const allCurled =
    isFingerCurled(landmarks, LANDMARK.THUMB_TIP, 3) &&
    isFingerCurled(landmarks, LANDMARK.INDEX_TIP, 6) &&
    isFingerCurled(landmarks, LANDMARK.MIDDLE_TIP, 10) &&
    isFingerCurled(landmarks, 16, 14) &&
    isFingerCurled(landmarks, 20, 18);

  return {
    type: allCurled ? 'pause' : 'none',
    confidence: allCurled ? 0.9 : 0,
    timestamp: Date.now(),
  };
}

/**
 * §3.4 Classify the current hand landmarks into a gesture
 * Priority order ensures draw takes precedence when ambiguous
 */
export function classifyGesture(landmarks: readonly LandmarkPoint[]): GestureResult {
  if (landmarks.length < 21) {
    return { type: 'none', confidence: 0, timestamp: Date.now() };
  }

  // Check gestures in priority order
  const draw = detectDrawGesture(landmarks);
  if (draw.type === 'draw') return draw;

  const undo = detectUndoGesture(landmarks);
  if (undo.type === 'undo') return undo;

  const clear = detectClearGesture(landmarks);
  if (clear.type === 'clear') return clear;

  const pause = detectPauseGesture(landmarks);
  if (pause.type === 'pause') return pause;

  return { type: 'none', confidence: 0, timestamp: Date.now() };
}
