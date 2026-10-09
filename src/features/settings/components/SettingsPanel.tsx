/**
 * AirScribe AI — SettingsPanel Component
 * §3.2: PersonalisationPanel — accessible from Settings icon in ChromeBar.
 * §8.3: settings table: handPreference, sensitivity, language, theme, consentGiven
 */

import { memo, useCallback, useState } from 'react';
import { useSettingsStore } from '../../../store/settingsStore';
import type { HandPreference, WritingStyle, ThemePreference } from '../../../types';

interface SettingsPanelProps {
  readonly onClose: () => void;
}

function SettingsPanelInner({ onClose }: SettingsPanelProps) {
  const {
    handPreference,
    sensitivity,
    language,
    writingStyle,
    theme,
    consentGiven,
    setHandPreference,
    setSensitivity,
    setLanguage,
    setWritingStyle,
    setTheme,
    grantConsent,
    revokeConsent,
  } = useSettingsStore();

  const [showConsentConfirm, setShowConsentConfirm] = useState(false);

  const handleSensitivityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSensitivity(parseFloat(e.target.value));
    },
    [setSensitivity]
  );

  const handleConsentToggle = useCallback(() => {
    if (consentGiven) {
      setShowConsentConfirm(true);
    } else {
      grantConsent();
    }
  }, [consentGiven, grantConsent]);

  const handleResetCalibration = useCallback(() => {
    localStorage.removeItem('airscribe-calibrated');
    localStorage.removeItem('airscribe-calibration-skipped');
    onClose();
    // Reload to trigger calibration wizard
    window.location.reload();
  }, [onClose]);

  return (
    <div
      className="settings-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      id="settings-panel"
    >
      {/* Backdrop */}
      <div
        className="settings-panel__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="settings-panel__content">
        {/* Header */}
        <div className="settings-panel__header">
          <h2 className="settings-panel__title">Settings</h2>
          <button
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="Close settings"
            id="settings-close-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="settings-panel__body">
          {/* ── Section: Appearance ── */}
          <SettingsSection title="Appearance" icon="🎨">
            <SettingsRow label="Theme" htmlFor="settings-theme">
              <div className="settings-segment" role="group" aria-label="Theme selection">
                {(['light', 'dark', 'system'] as ThemePreference[]).map((t) => (
                  <button
                    key={t}
                    id={`settings-theme-${t}`}
                    className={`settings-segment__btn ${theme === t ? 'settings-segment__btn--active' : ''}`}
                    onClick={() => setTheme(t)}
                    aria-pressed={theme === t}
                  >
                    {t === 'light' ? '☀️ Light' : t === 'dark' ? '🌙 Dark' : '🖥 System'}
                  </button>
                ))}
              </div>
            </SettingsRow>
          </SettingsSection>

          {/* ── Section: Writing ── */}
          <SettingsSection title="Writing" icon="✍️">
            <SettingsRow label="Hand Preference" htmlFor="settings-hand">
              <div className="settings-segment" role="group" aria-label="Hand preference">
                {(['left', 'right'] as HandPreference[]).map((h) => (
                  <button
                    key={h}
                    id={`settings-hand-${h}`}
                    className={`settings-segment__btn ${handPreference === h ? 'settings-segment__btn--active' : ''}`}
                    onClick={() => setHandPreference(h)}
                    aria-pressed={handPreference === h}
                  >
                    {h === 'left' ? '🤚 Left' : '✋ Right'}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label="Writing Style" htmlFor="settings-style">
              <div className="settings-segment" role="group" aria-label="Writing style">
                {(['block', 'print', 'cursive'] as WritingStyle[]).map((s) => (
                  <button
                    key={s}
                    id={`settings-style-${s}`}
                    className={`settings-segment__btn ${writingStyle === s ? 'settings-segment__btn--active' : ''}`}
                    onClick={() => setWritingStyle(s)}
                    aria-pressed={writingStyle === s}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </SettingsRow>

            <SettingsRow label={`Sensitivity: ${Math.round(sensitivity * 100)}%`} htmlFor="settings-sensitivity">
              <input
                type="range"
                id="settings-sensitivity"
                className="settings-slider"
                min="0.1"
                max="1"
                step="0.05"
                value={sensitivity}
                onChange={handleSensitivityChange}
                aria-valuemin={10}
                aria-valuemax={100}
                aria-valuenow={Math.round(sensitivity * 100)}
              />
              <div className="settings-slider-labels">
                <span>Low</span>
                <span>High</span>
              </div>
            </SettingsRow>

            <SettingsRow label="Language" htmlFor="settings-language">
              <select
                id="settings-language"
                className="settings-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
                <option value="de-DE">Deutsch</option>
                <option value="zh-CN">中文 (简体)</option>
                <option value="ar-SA">العربية</option>
              </select>
            </SettingsRow>
          </SettingsSection>

          {/* ── Section: Calibration ── */}
          <SettingsSection title="Calibration" icon="🎯">
            <p style={{ font: 'var(--text-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Recalibrate if your recognition accuracy has decreased or you've changed your writing style.
            </p>
            <button
              className="btn btn--secondary"
              onClick={handleResetCalibration}
              id="settings-recalibrate-btn"
              style={{ width: '100%' }}
            >
              🔄 Recalibrate
            </button>
          </SettingsSection>

          {/* ── Section: Privacy ── */}
          <SettingsSection title="Privacy & Data" icon="🔒">
            <SettingsRow label="Personalised Learning" htmlFor="settings-consent">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <button
                  id="settings-consent"
                  role="switch"
                  aria-checked={consentGiven}
                  className={`settings-toggle ${consentGiven ? 'settings-toggle--on' : ''}`}
                  onClick={handleConsentToggle}
                >
                  <span className="settings-toggle__thumb" />
                </button>
                <span style={{ font: 'var(--text-caption)', color: 'var(--color-text-secondary)' }}>
                  {consentGiven ? 'Enabled — improving your model' : 'Disabled'}
                </span>
              </div>
            </SettingsRow>
            <p style={{ font: 'var(--text-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
              Stroke data stays on your device. Used only to improve your personal recognition model.
            </p>
          </SettingsSection>
        </div>

        {/* Footer */}
        <div className="settings-panel__footer">
          <span style={{ font: 'var(--text-caption)', color: 'var(--color-text-secondary)' }}>
            AirScribe AI v0.1.0
          </span>
          <button className="btn btn--primary" onClick={onClose} id="settings-done-btn">
            Done
          </button>
        </div>
      </div>

      {/* Consent revoke confirmation */}
      {showConsentConfirm && (
        <div className="settings-panel__confirm" role="alertdialog" aria-label="Revoke consent confirmation">
          <div className="settings-panel__confirm-card">
            <h3 style={{ font: 'var(--text-h3)', color: 'var(--color-warning)', marginBottom: 'var(--space-3)' }}>
              ⚠️ Disable Learning?
            </h3>
            <p style={{ font: 'var(--text-body)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              Disabling personalised learning will prevent your model from improving. Existing local data will be retained.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setShowConsentConfirm(false)} id="settings-consent-cancel-btn">
                Keep Enabled
              </button>
              <button
                className="btn btn--secondary"
                style={{ color: 'var(--color-warning)' }}
                onClick={() => { revokeConsent(); setShowConsentConfirm(false); }}
                id="settings-consent-confirm-btn"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsSection({ title, icon, children }: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <div className="settings-section__header">
        <span aria-hidden="true">{icon}</span>
        <h3 className="settings-section__title">{title}</h3>
      </div>
      <div className="settings-section__body">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ label, htmlFor, children }: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-row">
      <label className="settings-row__label" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="settings-row__control">
        {children}
      </div>
    </div>
  );
}

export const SettingsPanel = memo(SettingsPanelInner);
