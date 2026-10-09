/**
 * AirScribe AI — CalibrationWizard Component
 * §3.2: "CalibrationWizard — 3-step modal:
 *   Step 1: Camera permission + positioning guide
 *   Step 2: Air-trace 5 reference characters for sensitivity calibration
 *   Step 3: Test a full word
 *   Progress persistence — users can resume; skip option with accuracy warning.
 *   Shown on first launch, accessible from settings thereafter."
 */

import { memo, useEffect, useState } from 'react';
import { useCalibration } from '../hooks/useCalibration';

interface CalibrationWizardProps {
  readonly onComplete: () => void;
  readonly cameraReady: boolean;
}

function CalibrationWizardInner({ onComplete, cameraReady }: CalibrationWizardProps) {
  const {
    step,
    charIndex,
    currentChar,
    progress,
    totalChars,
    calculatedSensitivity,
    nextStep,
    prevStep,
    skipCalibration,
    applyCalibration,
  } = useCalibration();

  const [showSkipWarning, setShowSkipWarning] = useState(false);

  // Auto-advance from camera step when camera is ready
  useEffect(() => {
    if (step === 'camera' && cameraReady) {
      // Brief delay to let user see the success state
      const timer = setTimeout(nextStep, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, cameraReady, nextStep]);

  // Auto-complete when step is 'complete'
  useEffect(() => {
    if (step === 'complete') {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSkipWarning(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="calibration-wizard" role="dialog" aria-modal="true" aria-label="Calibration Wizard" id="calibration-wizard">
      {/* Backdrop */}
      <div className="calibration-wizard__backdrop" />

      <div className="calibration-wizard__content">
        {/* Progress bar */}
        <div className="calibration-wizard__progress">
          <div
            className="calibration-wizard__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step indicator */}
        <div className="calibration-wizard__steps">
          <StepIndicator number={1} label="Camera" active={step === 'camera'} completed={step !== 'camera'} />
          <div className="calibration-wizard__step-divider" />
          <StepIndicator number={2} label="Characters" active={step === 'characters'} completed={step === 'test-word' || step === 'complete'} />
          <div className="calibration-wizard__step-divider" />
          <StepIndicator number={3} label="Test Word" active={step === 'test-word'} completed={step === 'complete'} />
        </div>

        {/* Step content */}
        <div className="calibration-wizard__body">
          {step === 'camera' && (
            <CameraStep cameraReady={cameraReady} />
          )}

          {step === 'characters' && (
            <CharacterStep
              currentChar={currentChar}
              charIndex={charIndex}
              totalChars={totalChars}
              onNext={nextStep}
            />
          )}

          {step === 'test-word' && (
            <TestWordStep onComplete={() => {
              applyCalibration();
              nextStep();
            }} />
          )}

          {step === 'complete' && (
            <CompleteStep sensitivity={calculatedSensitivity} />
          )}
        </div>

        {/* Footer actions */}
        <div className="calibration-wizard__footer">
          {step !== 'camera' && step !== 'complete' && (
            <button
              className="btn btn--ghost"
              onClick={prevStep}
              id="calibration-prev-btn"
            >
              ← Back
            </button>
          )}

          <div style={{ flex: 1 }} />

          {step !== 'complete' && (
            <button
              className="btn btn--ghost"
              onClick={() => setShowSkipWarning(true)}
              style={{ opacity: 0.6 }}
              id="calibration-skip-btn"
            >
              Skip for now
            </button>
          )}

          {step === 'characters' && (
            <button
              className="btn btn--primary"
              onClick={nextStep}
              id="calibration-next-btn"
            >
              {charIndex < totalChars - 1 ? 'Next Character →' : 'Test a Word →'}
            </button>
          )}
        </div>
      </div>

      {/* Skip warning modal */}
      {showSkipWarning && (
        <SkipWarning
          onConfirmSkip={() => {
            skipCalibration();
            onComplete();
          }}
          onCancel={() => setShowSkipWarning(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ number, label, active, completed }: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className={`calibration-step-indicator ${active ? 'calibration-step-indicator--active' : ''} ${completed ? 'calibration-step-indicator--completed' : ''}`}>
      <div className="calibration-step-indicator__circle">
        {completed ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span className="calibration-step-indicator__label">{label}</span>
    </div>
  );
}

function CameraStep({ cameraReady }: { cameraReady: boolean }) {
  return (
    <div className="calibration-wizard__step-content">
      <div className="calibration-wizard__icon-container">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="calibration-wizard__icon" aria-hidden="true">
          <rect x="10" y="20" width="44" height="36" rx="6" stroke="currentColor" strokeWidth="2.5" />
          <path d="M54 32L70 24V56L54 48V32Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="32" cy="38" r="10" stroke="currentColor" strokeWidth="2" />
          {cameraReady && (
            <path d="M26 38L30 42L38 34" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
      <h2 className="calibration-wizard__title">
        {cameraReady ? 'Camera Ready!' : 'Position Your Camera'}
      </h2>
      <p className="calibration-wizard__desc">
        {cameraReady
          ? 'Your camera is working. Let\'s calibrate your writing.'
          : 'Make sure your hand is clearly visible in the webcam frame. Your camera should be at arm\'s length.'}
      </p>
      <div className="calibration-wizard__tips">
        <Tip icon="💡" text="Ensure good lighting — avoid backlighting" />
        <Tip icon="📏" text="Keep your hand 30–60 cm from the camera" />
        <Tip icon="🖐" text="Use your index finger to write in the air" />
      </div>
    </div>
  );
}

function CharacterStep({ currentChar, charIndex, totalChars, onNext }: {
  currentChar: string;
  charIndex: number;
  totalChars: number;
  onNext: () => void;
}) {
  return (
    <div className="calibration-wizard__step-content">
      <p className="calibration-wizard__instruction">
        Trace this character in the air with your index finger
      </p>
      <div className="calibration-wizard__char-display" aria-live="polite">
        <span className="calibration-wizard__char">{currentChar}</span>
      </div>
      <p className="calibration-wizard__char-counter">
        Character {charIndex + 1} of {totalChars}
      </p>
      <p className="calibration-wizard__hint">
        Draw the character as you normally would. This helps calibrate the system to your writing style.
      </p>

      {/* Simulated stroke capture area */}
      <div
        className="calibration-wizard__draw-area"
        onClick={onNext}
        role="button"
        aria-label={`Draw character ${currentChar}, then click to continue`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onNext();
        }}
      >
        <p style={{ font: 'var(--text-caption)', opacity: 0.6 }}>
          Draw "{currentChar}" here, then click Next
        </p>
      </div>
    </div>
  );
}

function TestWordStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="calibration-wizard__step-content">
      <h2 className="calibration-wizard__title">Write a Test Word</h2>
      <p className="calibration-wizard__desc">
        Write the word <strong>"Hello"</strong> in the air to test the system.
      </p>

      <div className="calibration-wizard__test-word">
        <span>Hello</span>
      </div>

      <div
        className="calibration-wizard__draw-area calibration-wizard__draw-area--large"
        onClick={onComplete}
        role="button"
        aria-label="Draw 'Hello' in the air, then click to complete"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onComplete();
        }}
      >
        <p style={{ font: 'var(--text-body)', opacity: 0.6 }}>
          Draw "Hello" here, then click to complete calibration
        </p>
      </div>
    </div>
  );
}

function CompleteStep({ sensitivity }: { sensitivity: number }) {
  return (
    <div className="calibration-wizard__step-content" style={{ textAlign: 'center' }}>
      <div className="calibration-wizard__success-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
          <circle cx="32" cy="32" r="28" stroke="#34D399" strokeWidth="3" />
          <path d="M20 32L28 40L44 24" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="calibration-wizard__title" style={{ color: 'var(--color-success)' }}>
        Calibration Complete!
      </h2>
      <p className="calibration-wizard__desc">
        Sensitivity set to <strong>{Math.round(sensitivity * 100)}%</strong>. You can adjust this anytime in Settings.
      </p>
    </div>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="calibration-wizard__tip">
      <span className="calibration-wizard__tip-icon" aria-hidden="true">{icon}</span>
      <span className="calibration-wizard__tip-text">{text}</span>
    </div>
  );
}

function SkipWarning({ onConfirmSkip, onCancel }: { onConfirmSkip: () => void; onCancel: () => void }) {
  return (
    <div className="calibration-wizard__skip-warning" role="alertdialog" aria-label="Skip calibration warning">
      <div className="calibration-wizard__skip-warning-card">
        <h3 style={{ font: 'var(--text-h3)', color: 'var(--color-warning)', marginBottom: 'var(--space-3)' }}>
          ⚠️ Skip Calibration?
        </h3>
        <p style={{ font: 'var(--text-body)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
          Calibration dramatically improves accuracy. Without it, recognition may be less reliable for your writing style. You can always calibrate later from Settings.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn--ghost" onClick={onCancel} id="calibration-cancel-skip-btn">
            Continue Calibrating
          </button>
          <button className="btn btn--secondary" onClick={onConfirmSkip} id="calibration-confirm-skip-btn" style={{ color: 'var(--color-warning)' }}>
            Skip Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export const CalibrationWizard = memo(CalibrationWizardInner);
