/**
 * AirScribe AI — InferenceOverlay Component
 * §3.3: word-complete state — "Stroke freezes, inference spinner 100ms, then result"
 * §3.3: high-confidence — "Word appears green, added to timeline"
 * §3.3: low-confidence — "Word appears amber, correction banner, vibration hint"
 */

import { memo, useEffect, useState } from 'react';
import { useSessionStore } from '../../../store/sessionStore';
import { HIGH_CONFIDENCE_THRESHOLD } from '../../../constants';

function InferenceOverlayInner() {
  const uiState = useSessionStore((s) => s.uiState);
  const words = useSessionStore((s) => s.words);
  const [lastResult, setLastResult] = useState<{ text: string; confidence: number } | null>(null);

  // Capture the latest word when high/low confidence state fires
  useEffect(() => {
    if (uiState === 'high-confidence' || uiState === 'low-confidence') {
      const latest = words[words.length - 1];
      if (latest) {
        setLastResult({ text: latest.text, confidence: latest.confidence });
        // Auto-clear after display
        const timer = setTimeout(() => setLastResult(null), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [uiState, words]);

  // Show inference spinner during word-complete
  if (uiState === 'word-complete') {
    return (
      <div className="inference-spinner" id="inference-spinner">
        <div className="inference-spinner__ring" />
        <span className="inference-spinner__label">Recognising…</span>
      </div>
    );
  }

  // Show result flash for high/low confidence
  if (lastResult) {
    const isHigh = lastResult.confidence >= HIGH_CONFIDENCE_THRESHOLD;
    const level = isHigh ? 'high' : 'low';

    return (
      <div
        className={`inference-result inference-result--${level}`}
        id="inference-result"
        aria-live="assertive"
      >
        <span>{lastResult.text}</span>
        <span className="latency-badge" style={{ marginLeft: '8px' }}>
          {(lastResult.confidence * 100).toFixed(0)}%
        </span>
      </div>
    );
  }

  return null;
}

export const InferenceOverlay = memo(InferenceOverlayInner);
