/**
 * AirScribe AI — Session Store (Zustand)
 * §4.1: Zustand for global state — minimal re-render surface
 * §8.2: sessionStore manages UI state, recognised words, and session data
 */

import { create } from 'zustand';
import type { UIState, StatusBadgeState, RecognisedWord, GestureType } from '../types';
import { v4 as uuid } from 'uuid';

interface SessionState {
  // Session identity
  readonly sessionId: string;
  readonly startedAt: string;

  // UI state machine (§3.3)
  readonly uiState: UIState;
  readonly badgeState: StatusBadgeState;

  // Recognised text (§3.2: SessionTimeline)
  readonly words: readonly RecognisedWord[];
  readonly currentText: string;

  // Camera
  readonly cameraReady: boolean;
  readonly cameraError: string | null;

  // Drawer state
  readonly correctionDrawerOpen: boolean;
  readonly selectedWordId: string | null;

  // Output panel (mobile)
  readonly outputPanelOpen: boolean;

  // Toast
  readonly toast: { message: string; type: 'success' | 'error' | 'info' } | null;

  // Last detected gesture
  readonly lastGesture: GestureType;

  // Actions
  setUIState: (state: UIState) => void;
  setBadgeState: (state: StatusBadgeState) => void;
  setCameraReady: (ready: boolean) => void;
  setCameraError: (error: string | null) => void;
  addWord: (word: Omit<RecognisedWord, 'id'>) => void;
  removeLastWord: () => void;
  clearWords: () => void;
  correctWord: (wordId: string, corrected: string) => void;
  openCorrectionDrawer: (wordId: string) => void;
  closeCorrectionDrawer: () => void;
  toggleOutputPanel: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
  setLastGesture: (gesture: GestureType) => void;
  exportText: () => string;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: uuid(),
  startedAt: new Date().toISOString(),

  uiState: 'loading',
  badgeState: 'idle',

  words: [],
  currentText: '',

  cameraReady: false,
  cameraError: null,

  correctionDrawerOpen: false,
  selectedWordId: null,

  outputPanelOpen: false,

  toast: null,

  lastGesture: 'none',

  setUIState: (uiState) => set({ uiState }),
  setBadgeState: (badgeState) => set({ badgeState }),
  setCameraReady: (cameraReady) => set({ cameraReady }),
  setCameraError: (cameraError) => set({ cameraError }),

  addWord: (word) =>
    set((state) => ({
      words: [...state.words, { ...word, id: uuid() }],
      currentText: state.currentText + (state.currentText ? ' ' : '') + (word.text),
    })),

  removeLastWord: () =>
    set((state) => {
      const newWords = state.words.slice(0, -1);
      return {
        words: newWords,
        currentText: newWords.map((w) => w.corrected ?? w.text).join(' '),
      };
    }),

  clearWords: () => set({ words: [], currentText: '' }),

  correctWord: (wordId, corrected) =>
    set((state) => {
      const newWords = state.words.map((w) =>
        w.id === wordId ? { ...w, corrected } : w
      );
      return {
        words: newWords,
        currentText: newWords.map((w) => w.corrected ?? w.text).join(' '),
      };
    }),

  openCorrectionDrawer: (wordId) =>
    set({ correctionDrawerOpen: true, selectedWordId: wordId, uiState: 'correction' }),

  closeCorrectionDrawer: () =>
    set({ correctionDrawerOpen: false, selectedWordId: null, uiState: 'idle' }),

  toggleOutputPanel: () =>
    set((state) => ({ outputPanelOpen: !state.outputPanelOpen })),

  showToast: (message, type) => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),

  setLastGesture: (lastGesture) => set({ lastGesture }),

  exportText: () => get().currentText,

  resetSession: () =>
    set({
      sessionId: uuid(),
      startedAt: new Date().toISOString(),
      words: [],
      currentText: '',
      uiState: 'idle',
      correctionDrawerOpen: false,
      selectedWordId: null,
      toast: null,
    }),
}));
