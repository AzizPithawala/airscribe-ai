/**
 * AirScribe AI — Permission Overlay
 * §3.3: no-camera state — "Full-screen permission request overlay with instructions per browser"
 */

import { memo } from 'react';

interface PermissionOverlayProps {
  readonly onRequestCamera: () => void;
  readonly error?: string | null;
}

function PermissionOverlayInner({ onRequestCamera, error }: PermissionOverlayProps) {
  return (
    <div className="permission-overlay" id="permission-overlay">
      {/* Camera icon */}
      <svg
        className="permission-overlay__icon"
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="12"
          y="24"
          width="56"
          height="48"
          rx="8"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M68 40L84 30V66L68 56V40Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="40" cy="48" r="12" stroke="currentColor" strokeWidth="3" />
      </svg>

      <h1 className="permission-overlay__title">Camera Access Required</h1>

      <p className="permission-overlay__desc">
        AirScribe AI uses your camera to track hand gestures for air writing.
        {' '}
        <strong>No video is ever stored or transmitted</strong> — all processing
        happens entirely in your browser.
      </p>

      {error && (
        <p
          style={{
            color: 'var(--color-danger)',
            marginBottom: 'var(--space-4)',
            font: 'var(--text-body)',
          }}
        >
          {error}. Please check your browser settings and try again.
        </p>
      )}

      <button
        className="btn btn--primary"
        onClick={onRequestCamera}
        id="enable-camera-btn"
        style={{ padding: '12px 32px', fontSize: '16px' }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 5C3 4.44772 3.44772 4 4 4H12C12.5523 4 13 4.44772 13 5V15C13 15.5523 12.5523 16 12 16H4C3.44772 16 3 15.5523 3 15V5Z"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M13 8L17 6V14L13 12"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        Enable Camera
      </button>

      <p
        style={{
          marginTop: 'var(--space-4)',
          font: 'var(--text-caption)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Privacy-first: all inference runs on-device. Your camera feed never
        leaves this browser.
      </p>
    </div>
  );
}

export const PermissionOverlay = memo(PermissionOverlayInner);
