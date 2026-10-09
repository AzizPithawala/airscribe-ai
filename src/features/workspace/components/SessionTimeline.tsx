/**
 * AirScribe AI — SessionTimeline Component
 * §3.2: "Chronological strip pinned to bottom of Zone B.
 * Displays all recognised words/phrases in session order with timestamps.
 * Supports click-to-edit. Words with confidence <0.85 shown with amber underline.
 * Accessible as list with role='list' and each item as role='listitem'."
 */

import { memo, useCallback } from 'react';
import { useSessionStore } from '../../../store/sessionStore';
import { MIN_CONFIDENCE } from '../../../constants';
import type { RecognisedWord } from '../../../types';

function SessionTimelineInner() {
  const words = useSessionStore((s) => s.words);
  const openCorrectionDrawer = useSessionStore((s) => s.openCorrectionDrawer);
  const currentText = useSessionStore((s) => s.currentText);

  const handleWordClick = useCallback(
    (word: RecognisedWord) => {
      if (word.confidence < MIN_CONFIDENCE) {
        openCorrectionDrawer(word.id);
      }
    },
    [openCorrectionDrawer]
  );

  return (
    <div className="session-timeline" id="session-timeline">
      <div className="session-timeline__title">
        Recognised Text
      </div>

      {words.length === 0 ? (
        <p
          style={{
            font: 'var(--text-body)',
            color: 'var(--color-text-secondary)',
            padding: 'var(--space-4) 0',
          }}
        >
          Start writing in the air to see recognised text here…
        </p>
      ) : (
        <>
          {/* Full text display */}
          <div
            style={{
              padding: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              font: 'var(--text-body-lg)',
              color: 'var(--color-text-primary)',
              minHeight: '60px',
            }}
            id="recognised-text-display"
            aria-live="polite"
          >
            {currentText}
          </div>

          {/* Word timeline */}
          <div
            role="list"
            aria-label="Recognised words timeline"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}
          >
            {words.map((word) => (
              <div
                key={word.id}
                role="listitem"
                className={`timeline-word ${
                  word.confidence < MIN_CONFIDENCE
                    ? 'timeline-word--low-confidence'
                    : ''
                }`}
                onClick={() => handleWordClick(word)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleWordClick(word);
                  }
                }}
                tabIndex={0}
                title={`Confidence: ${(word.confidence * 100).toFixed(1)}%`}
                aria-label={`${word.corrected ?? word.text}, confidence ${(word.confidence * 100).toFixed(0)}%${
                  word.confidence < MIN_CONFIDENCE ? '. Activate to correct.' : ''
                }`}
              >
                <span>{word.corrected ?? word.text}</span>
                <ConfidencePill confidence={word.confidence} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** §3.2: ConfidenceIndicator — horizontal pill colour-coded by confidence */
function ConfidencePill({ confidence }: { confidence: number }) {
  const level =
    confidence >= 0.92 ? 'high' : confidence >= 0.85 ? 'medium' : 'low';

  return (
    <span
      className={`confidence-pill confidence-pill--${level}`}
      aria-label={`Confidence ${(confidence * 100).toFixed(0)}%`}
    >
      {(confidence * 100).toFixed(0)}%
    </span>
  );
}

export const SessionTimeline = memo(SessionTimelineInner);
