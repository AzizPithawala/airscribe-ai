/**
 * AirScribe AI — useCalibration Hook
 * Manages the calibration wizard state machine.
 * §3.2: CalibrationWizard — 3-step modal
 */

import { useState, useCallback, useRef } from 'react';
import { useSettingsStore } from '../../../store/settingsStore';
import {
  CALIBRATION_CHARS,
  CALIBRATION_MIN_STROKES,
} from '../../../constants';

export type CalibrationStep = 'camera' | 'characters' | 'test-word' | 'complete';

interface CalibrationState {
  /** Current step in the wizard */
  step: CalibrationStep;
  /** Current character index during Step 2 */
  charIndex: number;
  /** Number of strokes drawn during calibration */
  strokeCount: number;
  /** Whether calibration has been completed before */
  hasCalibrated: boolean;
  /** Calculated sensitivity from calibration strokes */
  calculatedSensitivity: number;
  /** Calibration stroke velocities for sensitivity calculation */
  velocities: number[];
}

export function useCalibration() {
  const [state, setState] = useState<CalibrationState>({
    step: 'camera',
    charIndex: 0,
    strokeCount: 0,
    hasCalibrated: false,
    calculatedSensitivity: 0.5,
    velocities: [],
  });

  const setSensitivity = useSettingsStore((s) => s.setSensitivity);
  const strokeTimesRef = useRef<number[]>([]);

  /** Navigate to next step */
  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.step === 'camera') return { ...prev, step: 'characters' };
      if (prev.step === 'characters') {
        if (prev.charIndex < CALIBRATION_CHARS.length - 1) {
          return { ...prev, charIndex: prev.charIndex + 1 };
        }
        return { ...prev, step: 'test-word', charIndex: 0 };
      }
      if (prev.step === 'test-word') {
        return { ...prev, step: 'complete', hasCalibrated: true };
      }
      return prev;
    });
  }, []);

  /** Go back to previous step */
  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.step === 'characters' && prev.charIndex > 0) {
        return { ...prev, charIndex: prev.charIndex - 1 };
      }
      if (prev.step === 'characters') return { ...prev, step: 'camera' };
      if (prev.step === 'test-word') {
        return { ...prev, step: 'characters', charIndex: CALIBRATION_CHARS.length - 1 };
      }
      return prev;
    });
  }, []);

  /** Record a calibration stroke and update sensitivity */
  const recordCalibrationStroke = useCallback(
    (velocity: number) => {
      strokeTimesRef.current.push(velocity);

      setState((prev) => {
        const newVelocities = [...prev.velocities, velocity];
        // Calculate sensitivity as inverse of average velocity (normalised to 0-1)
        const avgVelocity =
          newVelocities.reduce((a, b) => a + b, 0) / newVelocities.length;
        const sensitivity = Math.max(0.1, Math.min(1, 1 - avgVelocity * 2));

        return {
          ...prev,
          strokeCount: prev.strokeCount + 1,
          velocities: newVelocities,
          calculatedSensitivity: sensitivity,
        };
      });
    },
    []
  );

  /** Apply calculated sensitivity and mark as complete */
  const applyCalibration = useCallback(() => {
    setSensitivity(state.calculatedSensitivity);
    localStorage.setItem('airscribe-calibrated', 'true');
    setState((prev) => ({ ...prev, hasCalibrated: true, step: 'complete' }));
  }, [state.calculatedSensitivity, setSensitivity]);

  /** Skip calibration with warning */
  const skipCalibration = useCallback(() => {
    localStorage.setItem('airscribe-calibration-skipped', 'true');
    setState((prev) => ({ ...prev, step: 'complete' }));
  }, []);

  /** Check if calibration should show on first launch */
  const shouldShowCalibration = useCallback(() => {
    const hasCalibrated = localStorage.getItem('airscribe-calibrated') === 'true';
    const hasSkipped = localStorage.getItem('airscribe-calibration-skipped') === 'true';
    return !hasCalibrated && !hasSkipped;
  }, []);

  /** Reset to show calibration again (from settings) */
  const resetCalibration = useCallback(() => {
    localStorage.removeItem('airscribe-calibrated');
    localStorage.removeItem('airscribe-calibration-skipped');
    setState({
      step: 'camera',
      charIndex: 0,
      strokeCount: 0,
      hasCalibrated: false,
      calculatedSensitivity: 0.5,
      velocities: [],
    });
  }, []);

  const currentChar = CALIBRATION_CHARS[state.charIndex] ?? 'A';
  const isTestWordReady = state.strokeCount >= CALIBRATION_MIN_STROKES;
  const progress =
    state.step === 'camera'
      ? 0
      : state.step === 'characters'
        ? ((state.charIndex + 1) / CALIBRATION_CHARS.length) * 60 + 10
        : state.step === 'test-word'
          ? 80
          : 100;

  return {
    ...state,
    currentChar,
    isTestWordReady,
    progress,
    totalChars: CALIBRATION_CHARS.length,
    nextStep,
    prevStep,
    recordCalibrationStroke,
    applyCalibration,
    skipCalibration,
    shouldShowCalibration,
    resetCalibration,
  };
}
