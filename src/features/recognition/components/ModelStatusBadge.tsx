/**
 * AirScribe AI — ModelStatusBadge Component
 * Shows model loading/ready/error status in the chrome bar.
 * §6.2: Execution provider displayed; §8.2: Model status telemetry
 */

import { memo } from 'react';
import { useModelStore } from '../../../store/modelStore';

function ModelStatusBadgeInner() {
  const modelReady = useModelStore((s) => s.modelReady);
  const modelError = useModelStore((s) => s.modelError);
  const executionProvider = useModelStore((s) => s.executionProvider);
  const loadingProgress = useModelStore((s) => s.loadingProgress);

  if (modelError) {
    return (
      <div className="model-status model-status--error" id="model-status-badge" title={modelError}>
        <span className="model-status__dot" />
        Demo
      </div>
    );
  }

  if (!modelReady) {
    return (
      <div className="model-status model-status--loading" id="model-status-badge" title={`Loading model... ${loadingProgress}%`}>
        <span className="model-status__dot" />
        {loadingProgress}%
      </div>
    );
  }

  return (
    <div className="model-status model-status--ready" id="model-status-badge" title={`Model ready (${executionProvider ?? 'unknown'})`}>
      <span className="model-status__dot" />
      <span className={`provider-badge provider-badge--${executionProvider ?? 'wasm'}`}>
        {executionProvider ?? 'ready'}
      </span>
    </div>
  );
}

export const ModelStatusBadge = memo(ModelStatusBadgeInner);
