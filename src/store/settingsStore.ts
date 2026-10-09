/**
 * AirScribe AI — Settings Store (Zustand)
 * §3.2: PersonalisationPanel — settings persist to localStorage with GDPR consent gate
 * §8.3: settings table: handPreference, sensitivity, language, theme, consentGiven, consentAt
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HandPreference, WritingStyle, ThemePreference, UserSettings } from '../types';

interface SettingsState extends UserSettings {
  setHandPreference: (pref: HandPreference) => void;
  setSensitivity: (value: number) => void;
  setLanguage: (lang: string) => void;
  setWritingStyle: (style: WritingStyle) => void;
  setTheme: (theme: ThemePreference) => void;
  grantConsent: () => void;
  revokeConsent: () => void;
  getSettings: () => UserSettings;
}

const DEFAULT_SETTINGS: UserSettings = {
  handPreference: 'right',
  sensitivity: 0.5,
  language: 'en-US',
  writingStyle: 'block',
  theme: 'system',
  consentGiven: false,
  consentAt: undefined,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      setHandPreference: (handPreference) => set({ handPreference }),
      setSensitivity: (sensitivity) => set({ sensitivity }),
      setLanguage: (language) => set({ language }),
      setWritingStyle: (writingStyle) => set({ writingStyle }),
      setTheme: (theme) => {
        set({ theme });
        // §3.5: Apply theme via data attribute
        applyTheme(theme);
      },
      grantConsent: () =>
        set({ consentGiven: true, consentAt: new Date().toISOString() }),
      revokeConsent: () =>
        set({ consentGiven: false, consentAt: undefined }),
      getSettings: () => {
        const state = get();
        return {
          handPreference: state.handPreference,
          sensitivity: state.sensitivity,
          language: state.language,
          writingStyle: state.writingStyle,
          theme: state.theme,
          consentGiven: state.consentGiven,
          consentAt: state.consentAt,
        };
      },
    }),
    {
      name: 'airscribe-settings',
    }
  )
);

/**
 * §3.5: Dark mode uses CSS custom properties only.
 * localStorage preference persists. System preference respected on first load.
 */
function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;

  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

// Apply theme on load (§3.5: system preference respected on first load)
export function initTheme(): void {
  const stored = useSettingsStore.getState().theme;
  applyTheme(stored);
}
