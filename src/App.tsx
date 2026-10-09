/**
 * AirScribe AI — Main Application
 * §3.1: Three-Zone Responsive Layout
 * Zone A — Workspace (dark, camera + canvas)
 * Zone B — Output Panel (light, recognised text)
 * Zone C — Control Chrome (48px fixed top)
 *
 * Phase 2: CalibrationWizard + inference pipeline integration
 */

import { useEffect, useState, useCallback } from 'react';
import { Workspace } from './features/workspace/components/Workspace';
import { SessionTimeline } from './features/workspace/components/SessionTimeline';
import { CorrectionDrawer } from './features/workspace/components/CorrectionDrawer';
import { CalibrationWizard } from './features/calibration/components/CalibrationWizard';
import { ChromeBar } from './shared/components/ChromeBar';
import { Toast } from './shared/components/Toast';
import { useSessionStore } from './store/sessionStore';
import { initTheme } from './store/settingsStore';
import { useTraining } from './features/training/hooks/useTraining';

export default function App() {
  const outputPanelOpen = useSessionStore((s) => s.outputPanelOpen);
  const cameraReady = useSessionStore((s) => s.cameraReady);
  const setUIState = useSessionStore((s) => s.setUIState);

  // CalibrationWizard state (§3.2: shown on first launch)
  const [showCalibration, setShowCalibration] = useState(false);
  const [calibrationDismissed, setCalibrationDismissed] = useState(false);

  // §6.5: Self-learning pipeline — consent-gated, runs in background
  useTraining();

  // Initialize theme on mount (§3.5)
  useEffect(() => {
    initTheme();
  }, []);

  // Set initial UI state
  useEffect(() => {
    if (!cameraReady) {
      setUIState('no-camera');
    }
  }, [cameraReady, setUIState]);

  // §3.2: Show calibration wizard on first launch
  useEffect(() => {
    const hasCalibrated = localStorage.getItem('airscribe-calibrated') === 'true';
    const hasSkipped = localStorage.getItem('airscribe-calibration-skipped') === 'true';

    if (!hasCalibrated && !hasSkipped && cameraReady && !calibrationDismissed) {
      setShowCalibration(true);
    }
  }, [cameraReady, calibrationDismissed]);

  const handleCalibrationComplete = useCallback(() => {
    setShowCalibration(false);
    setCalibrationDismissed(true);
  }, []);

  return (
    <div className="app-layout" id="app-root">
      {/* Zone C: Control Chrome — 48px fixed top (§3.1) */}
      <ChromeBar />

      {/* Main content: Zone A + Zone B */}
      <main className="zone-main">
        {/* Zone A: Workspace */}
        <Workspace />

        {/* Zone B: Output Panel (§3.1) */}
        <aside
          className={`zone-output ${outputPanelOpen ? 'zone-output--open' : ''}`}
          id="output-panel"
          role="complementary"
          aria-label="Recognised text output"
        >
          <SessionTimeline />
        </aside>
      </main>

      {/* Correction Drawer (§3.2) */}
      <CorrectionDrawer />

      {/* Toast notifications */}
      <Toast />

      {/* CalibrationWizard (§3.2: shown on first launch) */}
      {showCalibration && (
        <CalibrationWizard
          onComplete={handleCalibrationComplete}
          cameraReady={cameraReady}
        />
      )}
    </div>
  );
}
