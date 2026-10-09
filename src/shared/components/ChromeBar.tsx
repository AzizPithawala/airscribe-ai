/**
 * AirScribe AI — Chrome Bar (Zone C)
 * §3.1: "Zone C — Control Chrome. 48px height fixed top. Persists across all layouts."
 * Contains: mode, language, settings controls
 */

import { memo, useCallback, useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ModelStatusBadge } from '../../features/recognition/components/ModelStatusBadge';
import { SettingsPanel } from '../../features/settings/components/SettingsPanel';

function ChromeBarInner() {
  const uiState = useSessionStore((s) => s.uiState);
  const clearWords = useSessionStore((s) => s.clearWords);
  const exportText = useSessionStore((s) => s.exportText);
  const showToast = useSessionStore((s) => s.showToast);
  const toggleOutputPanel = useSessionStore((s) => s.toggleOutputPanel);
  const words = useSessionStore((s) => s.words);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const [showSettings, setShowSettings] = useState(false);

  const handleExport = useCallback(() => {
    const text = exportText();
    if (text) {
      navigator.clipboard.writeText(text).catch(() => { /* ignored */ });
      showToast('Text copied to clipboard!', 'success');
    } else {
      showToast('Nothing to export', 'info');
    }
  }, [exportText, showToast]);

  const handleClear = useCallback(() => {
    clearWords();
    showToast('Canvas cleared', 'info');
  }, [clearWords, showToast]);

  const handleThemeToggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <>
    <header className="zone-chrome" id="chrome-bar" role="banner">
      {/* Logo */}
      <div className="zone-chrome__logo">
        <svg
          className="zone-chrome__logo-icon"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="2" />
          <path
            d="M9 18L14 8L19 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 15H17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        AirScribe
        <span style={{ opacity: 0.5, fontWeight: 400, fontSize: '11px' }}>AI</span>
      </div>

      {/* Training indicator (§3.3: training state) */}
      {uiState === 'training' && (
        <div className="training-indicator">
          <div className="training-indicator__spinner" />
          Improving your model…
        </div>
      )}

      {/* Model status indicator (§6.2) */}
      <ModelStatusBadge />

      <div className="zone-chrome__spacer" />

      {/* Action buttons — §3.4: Button equivalents for gestures */}
      <div className="zone-chrome__actions">
        {/* Word count */}
        <span
          style={{
            font: 'var(--text-caption)',
            color: 'var(--ws-text)',
            opacity: 0.6,
            marginRight: 'var(--space-2)',
          }}
        >
          {words.length} words
        </span>

        {/* Clear button (§3.4: fallback for Clear gesture) */}
        <button
          className="btn btn--ghost btn--icon"
          onClick={handleClear}
          title="Clear canvas (Open palm gesture)"
          aria-label="Clear canvas"
          id="chrome-clear-btn"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Export button (§3.4: fallback for Confirm gesture) */}
        <button
          className="btn btn--ghost btn--icon"
          onClick={handleExport}
          title="Export text (Circle gesture)"
          aria-label="Export text"
          id="chrome-export-btn"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 9H12M9 6V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Theme toggle (§3.5) */}
        <button
          className="btn btn--ghost btn--icon"
          onClick={handleThemeToggle}
          title="Toggle dark mode"
          aria-label="Toggle theme"
          id="chrome-theme-btn"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            {theme === 'dark' ? (
              <circle cx="9" cy="9" r="5" stroke="currentColor" strokeWidth="1.5" />
            ) : (
              <path
                d="M9 2C5.68629 2 3 5.13401 3 9C3 12.866 5.68629 16 9 16C12.3137 16 15 12.866 15 9C13 11 11 12 9 12C7 12 5 11 4 9C5 5 7 3 9 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>

        {/* Settings button */}
        <button
          className="btn btn--ghost btn--icon"
          onClick={() => setShowSettings(true)}
          title="Settings"
          aria-label="Open settings"
          id="chrome-settings-btn"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 2.5V4M9 14V15.5M2.5 9H4M14 9H15.5M4.4 4.4L5.5 5.5M12.5 12.5L13.6 13.6M4.4 13.6L5.5 12.5M12.5 5.5L13.6 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Mobile: toggle output panel */}
        <button
          className="btn btn--ghost btn--icon"
          onClick={toggleOutputPanel}
          title="Show text panel"
          aria-label="Toggle text panel"
          id="chrome-panel-btn"
          style={{ display: 'none' }} // visible on mobile via media query
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 6H15M3 10H15M3 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>

      {/* Settings Panel */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
}

export const ChromeBar = memo(ChromeBarInner);
