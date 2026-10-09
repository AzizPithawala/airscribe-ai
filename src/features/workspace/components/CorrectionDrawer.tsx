/**
 * AirScribe AI — CorrectionDrawer Component
 * §3.2: "Slides up from bottom when a low-confidence word is tapped.
 * Shows: original prediction, confidence score, text input for correction,
 * and a 'Submit correction' button that feeds the self-learning pipeline.
 * Dismissable with Escape key or swipe-down gesture."
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { useSessionStore } from '../../../store/sessionStore';

function CorrectionDrawerInner() {
  const correctionDrawerOpen = useSessionStore((s) => s.correctionDrawerOpen);
  const selectedWordId = useSessionStore((s) => s.selectedWordId);
  const words = useSessionStore((s) => s.words);
  const correctWord = useSessionStore((s) => s.correctWord);
  const closeCorrectionDrawer = useSessionStore((s) => s.closeCorrectionDrawer);
  const showToast = useSessionStore((s) => s.showToast);

  const selectedWord = words.find((w) => w.id === selectedWordId);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when drawer opens
  useEffect(() => {
    if (correctionDrawerOpen && inputRef.current) {
      setInputValue(selectedWord?.text ?? '');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [correctionDrawerOpen, selectedWord]);

  // §3.2: Dismissable with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && correctionDrawerOpen) {
        closeCorrectionDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [correctionDrawerOpen, closeCorrectionDrawer]);

  const handleSubmit = useCallback(() => {
    if (selectedWordId && inputValue.trim()) {
      correctWord(selectedWordId, inputValue.trim());
      showToast('Correction submitted', 'success');
      closeCorrectionDrawer();
    }
  }, [selectedWordId, inputValue, correctWord, closeCorrectionDrawer, showToast]);

  if (!selectedWord) return null;

  return (
    <div
      className={`correction-drawer ${correctionDrawerOpen ? 'correction-drawer--open' : ''}`}
      role="dialog"
      aria-label="Correct word"
      aria-modal="true"
      id="correction-drawer"
    >
      <div className="correction-drawer__handle" aria-hidden="true" />

      <h3 className="correction-drawer__title">Correct Recognition</h3>

      <div className="correction-drawer__prediction">
        <span style={{ font: 'var(--text-body)', color: 'var(--color-text-secondary)' }}>
          Predicted:
        </span>
        <span style={{ font: 'var(--text-h3)', color: 'var(--color-text-primary)' }}>
          {selectedWord.text}
        </span>
        <span
          className={`confidence-pill confidence-pill--low`}
          style={{ marginLeft: 'var(--space-2)' }}
        >
          {(selectedWord.confidence * 100).toFixed(0)}%
        </span>
      </div>

      <label
        htmlFor="correction-input"
        style={{
          display: 'block',
          font: 'var(--text-body)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        What should it be?
      </label>

      <input
        ref={inputRef}
        id="correction-input"
        type="text"
        className="correction-drawer__input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
        }}
        placeholder="Type the correct text…"
      />

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-4)',
          justifyContent: 'flex-end',
        }}
      >
        <button
          className="btn btn--secondary"
          onClick={closeCorrectionDrawer}
          id="correction-cancel-btn"
        >
          Cancel
        </button>
        <button
          className="btn btn--primary"
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          id="correction-submit-btn"
        >
          Submit Correction
        </button>
      </div>
    </div>
  );
}

export const CorrectionDrawer = memo(CorrectionDrawerInner);
