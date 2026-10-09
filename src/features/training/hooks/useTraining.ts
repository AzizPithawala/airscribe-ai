/**
 * AirScribe AI — useTraining Hook
 * §6.5: Self-Learning Pipeline wired to UI
 * Polls for training readiness, triggers training, updates model store
 */

import { useCallback, useEffect, useRef } from 'react';
import { useModelStore } from '../../../store/modelStore';
import { useSessionStore } from '../../../store/sessionStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { trainingService } from '../services/TrainingService';
import { db } from '../../../shared/db';

const TRAINING_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

export function useTraining() {
  const activeModelId = useModelStore((s) => s.activeModelId);
  const sessionAccuracy = useModelStore((s) => s.sessionAccuracy);
  const setActiveModelId = useModelStore((s) => s.setActiveModelId);
  const setPendingFeedbackCount = useModelStore((s) => s.setPendingFeedbackCount);
  const setLastTrainedAt = useModelStore((s) => s.setLastTrainedAt);
  const setUIState = useSessionStore((s) => s.setUIState);
  const showToast = useSessionStore((s) => s.showToast);
  const consentGiven = useSettingsStore((s) => s.consentGiven);

  const userId = 'local-user'; // §9.1: Local anonymous user
  const isTrainingRef = useRef(false);

  /** Run training if conditions are met */
  const runTrainingIfReady = useCallback(async () => {
    if (!consentGiven) return;
    if (isTrainingRef.current) return;

    const canTrain = await trainingService.canTrain(userId);
    if (!canTrain) return;

    isTrainingRef.current = true;
    setUIState('training');

    try {
      const result = await trainingService.checkAndTrain(
        userId,
        activeModelId,
        sessionAccuracy
      );

      if (result.ok && result.value) {
        const training = result.value;

        if (training.promoted !== 'rejected') {
          setActiveModelId(training.modelId);
          setLastTrainedAt(new Date().toISOString());
          showToast(
            `Model improved! Accuracy: ${(training.validationAccuracy * 100).toFixed(1)}%`,
            'success'
          );
        } else {
          showToast('Training rejected — regression detected. Keeping current model.', 'info');
        }
      }
    } catch {
      // Non-critical — training is background task
    } finally {
      isTrainingRef.current = false;
      setUIState('idle');
    }
  }, [consentGiven, activeModelId, sessionAccuracy, setActiveModelId, setLastTrainedAt, setUIState, showToast]);

  /** Record user correction as feedback */
  const recordFeedback = useCallback(
    async (params: {
      strokeId: string;
      stroke: Float32Array;
      predicted: string;
      corrected: string;
      sessionId: string;
    }) => {
      if (!consentGiven) return;

      await trainingService.recordFeedback({
        userId,
        ...params,
        modelId: activeModelId,
      });

      // Update pending count in store
      try {
        const count = await db.feedback.where('userId').equals(userId).count();
        setPendingFeedbackCount(count);
      } catch {
        // Non-critical
      }
    },
    [consentGiven, activeModelId, setPendingFeedbackCount]
  );

  // §6.5: Periodic training check
  useEffect(() => {
    if (!consentGiven) return;

    const interval = setInterval(runTrainingIfReady, TRAINING_CHECK_INTERVAL_MS);
    // Also check on mount
    runTrainingIfReady();

    return () => clearInterval(interval);
  }, [consentGiven, runTrainingIfReady]);

  return { runTrainingIfReady, recordFeedback };
}
