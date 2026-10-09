/**
 * AirScribe AI — Predict API Client
 * §7.1: Base Configuration
 * §7.2: POST /predict, POST /predict/batch
 * §7.3: Error Code Reference
 *
 * Note: In Phase 1-2 (Beta, <1,000 users), all inference runs client-side via ONNX.
 * This API client is prepared for Phase 2+ when server-side inference is available.
 * §11.3: "Phase 1 Beta — Single serverless deployment; IndexedDB only; no training server needed"
 */

import { z } from 'zod';
import type { Prediction, InferenceMode } from '../../../types';
import { API_BASE_URL, PREDICT_TIMEOUT_MS } from '../../../constants';

// ─── Zod Schemas (§4.2: All API responses validated with Zod) ────────────

const PredictionResponseSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(
    z.object({
      text: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  latencyMs: z.number().int(),
  modelId: z.string().uuid(),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ─── API Client ──────────────────────────────────────────────────────────────

/**
 * §7.2: POST /predict
 * Runs inference on a preprocessed stroke and returns text prediction
 */
export async function predictAPI(
  stroke: Float32Array,
  mode: InferenceMode,
  modelId?: string
): Promise<Prediction> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PREDICT_TIMEOUT_MS);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authorization header added when auth is implemented
      },
      body: JSON.stringify({
        stroke: Array.from(stroke),
        mode,
        ...(modelId ? { modelId } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      const parsed = ErrorResponseSchema.safeParse(errorData);
      const errorCode = parsed.success ? parsed.data.error.code : 'UNKNOWN_ERROR';

      return {
        text: null,
        confidence: 0,
        alternatives: [],
        modelId: modelId ?? 'unknown',
        latencyMs: 0,
        error: errorCode,
      };
    }

    const data = await response.json();
    const parsed = PredictionResponseSchema.safeParse(data);

    if (!parsed.success) {
      return {
        text: null,
        confidence: 0,
        alternatives: [],
        modelId: modelId ?? 'unknown',
        latencyMs: 0,
        error: 'INVALID_RESPONSE',
      };
    }

    return {
      ...parsed.data,
      modelId: modelId ?? parsed.data.modelId,
    };
  } catch (err) {
    return {
      text: null,
      confidence: 0,
      alternatives: [],
      modelId: modelId ?? 'unknown',
      latencyMs: 0,
      error: err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
    };
  }
}

/**
 * §7.2: POST /predict/batch
 * Maximum 20 strokes per batch. Rate limit: 10 requests/minute.
 */
export async function predictBatchAPI(
  strokes: Float32Array[],
  mode: InferenceMode,
  modelId?: string
): Promise<Prediction[]> {
  if (strokes.length > 20) {
    return strokes.map(() => ({
      text: null,
      confidence: 0,
      alternatives: [],
      modelId: modelId ?? 'unknown',
      latencyMs: 0,
      error: 'BATCH_TOO_LARGE',
    }));
  }

  try {
    const response = await fetch(`${API_BASE_URL}/predict/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strokes: strokes.map((s) => Array.from(s)),
        mode,
        ...(modelId ? { modelId } : {}),
      }),
    });

    if (!response.ok) {
      return strokes.map(() => ({
        text: null,
        confidence: 0,
        alternatives: [],
        modelId: modelId ?? 'unknown',
        latencyMs: 0,
        error: 'INFERENCE_FAILED',
      }));
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return strokes.map(() => ({
      text: null,
      confidence: 0,
      alternatives: [],
      modelId: modelId ?? 'unknown',
      latencyMs: 0,
      error: 'NETWORK_ERROR',
    }));
  }
}
