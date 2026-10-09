/**
 * AirScribe AI — GestureStatusBadge Component
 * §3.2: "Displays the current hand detection state.
 * States: idle, tracking, drawing, paused, error.
 * Positioned top-right of workspace zone, always visible."
 */

import { memo } from 'react';
import type { StatusBadgeState } from '../../../types';

interface GestureStatusBadgeProps {
  readonly state: StatusBadgeState;
}

const BADGE_LABELS: Record<StatusBadgeState, string> = {
  idle: 'Ready — show your hand',
  tracking: 'Tracking',
  drawing: 'Writing…',
  paused: 'Paused',
  error: 'Camera error',
};

function GestureStatusBadgeInner({ state }: GestureStatusBadgeProps) {
  return (
    <div
      className={`status-badge status-badge--${state}`}
      role="status"
      aria-live="polite"
      id="gesture-status-badge"
    >
      <span className="status-badge__dot" aria-hidden="true" />
      {BADGE_LABELS[state]}
    </div>
  );
}

export const GestureStatusBadge = memo(GestureStatusBadgeInner);
