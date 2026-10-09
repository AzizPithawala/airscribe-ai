/**
 * AirScribe AI — Idle Overlay
 * §3.3: idle state — "Animated 'Show your hand' prompt, dim overlay on workspace"
 */

import { memo } from 'react';

function IdleOverlayInner() {
  return (
    <div className="idle-overlay" id="idle-overlay">
      {/* Hand SVG icon */}
      <svg
        className="idle-overlay__icon"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M40 10C37 10 35 12 35 15V38L30 33C28 31 25 31 23 33C21 35 21 38 23 40L38 55C38 55 45 62 50 62C58 62 62 55 62 48V25C62 22 60 20 57 20C54 20 52 22 52 25V15C52 12 50 10 47 10C44 10 42 12 42 15V10C42 7 40 5 37 5"
          stroke="#E2E8F0"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M35 15V35"
          stroke="#6366F1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="4 4"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-8"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      <p className="idle-overlay__text">Show your hand to begin</p>
      <p className="idle-overlay__subtext">
        Hold up your index finger to start writing in the air
      </p>
    </div>
  );
}

export const IdleOverlay = memo(IdleOverlayInner);
