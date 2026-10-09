/**
 * AirScribe AI — Toast Component
 * Toast notifications: 3s duration, positioned bottom-centre.
 * Supports success, error, and info types.
 */

import { memo, useEffect } from 'react';
import { useSessionStore } from '../../store/sessionStore';

function ToastInner() {
  const toast = useSessionStore((s) => s.toast);
  const clearToast = useSessionStore((s) => s.clearToast);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(clearToast, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div
      className={`toast toast--${toast.type} toast--visible`}
      role="alert"
      aria-live="assertive"
      id="toast-notification"
    >
      {toast.message}
    </div>
  );
}

export const Toast = memo(ToastInner);
