/**
 * AirScribe AI — Stroke Engine
 * §4.4: Canvas Architecture (Critical Path)
 * §8.2: StrokeEngine Module — maintains circular stroke buffer, compute velocity/pressure,
 *        detect stroke start/end events, interface with gesture classifier.
 *
 * "State: mutable Float32Array buffers (not React state)."
 * "Events emitted: onStrokeStart, onStrokePoint, onStrokeComplete, onGestureDetected."
 * "Dependencies: GestureClassifier (injection via interface)." — §4.2 Dependency Inversion
 */

import { v4 as uuid } from 'uuid';
import { STROKE_BUFFER_SIZE, MIN_STROKE_POINTS, OCCLUSION_BUFFER_MS } from '../../constants';
import type { CompletedStroke, LandmarkPoint, GestureResult } from '../../types';

/** §4.2: Dependency Inversion — depend on interface, not concrete implementation */
export interface IGestureClassifier {
  classifyGesture(landmarks: readonly LandmarkPoint[]): GestureResult;
}

export type StrokeEventType = 'strokeStart' | 'strokePoint' | 'strokeComplete' | 'gestureDetected';

export interface StrokeEvent {
  readonly type: StrokeEventType;
  readonly strokeId?: string;
  readonly point?: { x: number; y: number };
  readonly gesture?: GestureResult;
  readonly completedStroke?: CompletedStroke;
}

type StrokeEventListener = (event: StrokeEvent) => void;

/**
 * StrokeEngine — Critical Path Module
 * §4.4: "The draw loop runs on requestAnimationFrame.
 * It reads from a mutable stroke buffer (not React state).
 * React state is only updated on discrete events."
 */
export class StrokeEngine {
  /** §4.4: Circular buffer — "Float32Array for cache efficiency" */
  private pointsBuffer: Float32Array;
  private timestampsBuffer: Uint32Array;
  private pressureBuffer: Float32Array;
  private bufferIndex = 0;
  private pointCount = 0;

  /** Current stroke metadata */
  private currentStrokeId: string | null = null;
  private strokeStartTime = 0;
  private isDrawing = false;

  /** Previous point for velocity calculation */
  private prevX = 0;
  private prevY = 0;
  private prevTimestamp = 0;

  /** Occlusion recovery timer (§5.5) */
  private occlusionTimerId: ReturnType<typeof setTimeout> | null = null;

  /** Event listeners */
  private listeners: Map<StrokeEventType, StrokeEventListener[]> = new Map();

  /** Gesture classifier — injected dependency (§4.2) */
  private gestureClassifier: IGestureClassifier;

  constructor(gestureClassifier: IGestureClassifier) {
    // §4.4: Circular buffer of last 512 points
    this.pointsBuffer = new Float32Array(STROKE_BUFFER_SIZE * 2); // interleaved [x0,y0,x1,y1,...]
    this.timestampsBuffer = new Uint32Array(STROKE_BUFFER_SIZE);
    this.pressureBuffer = new Float32Array(STROKE_BUFFER_SIZE);
    this.gestureClassifier = gestureClassifier;
  }

  /** Subscribe to stroke events */
  on(type: StrokeEventType, listener: StrokeEventListener): () => void {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(type, [...existing, listener]);
    return () => {
      const current = this.listeners.get(type) ?? [];
      this.listeners.set(type, current.filter((l) => l !== listener));
    };
  }

  /** Emit event to all listeners */
  private emit(event: StrokeEvent): void {
    const handlers = this.listeners.get(event.type) ?? [];
    for (const handler of handlers) {
      handler(event);
    }
  }

  /** Process a new landmark frame — called every rAF */
  processFrame(landmarks: readonly LandmarkPoint[], indexTip: LandmarkPoint): void {
    // Classify gesture
    const gesture = this.gestureClassifier.classifyGesture(landmarks);

    if (gesture.type !== 'none' && gesture.type !== 'draw') {
      this.emit({ type: 'gestureDetected', gesture });
    }

    if (gesture.type === 'draw') {
      this.clearOcclusionTimer();
      this.addPoint(indexTip.x, indexTip.y);
    } else if (this.isDrawing) {
      // §5.5: Occlusion mid-stroke — buffer held for 800ms
      this.startOcclusionTimer();
    }
  }

  /** Add a point to the stroke buffer */
  private addPoint(x: number, y: number): void {
    const now = Date.now();

    if (!this.isDrawing) {
      this.startStroke();
    }

    // §4.4: Interleaved [x0,y0,x1,y1,...] for cache efficiency
    const bufferPos = (this.bufferIndex % STROKE_BUFFER_SIZE) * 2;
    this.pointsBuffer[bufferPos] = x;
    this.pointsBuffer[bufferPos + 1] = y;

    // §4.4: Delta-encoded ms from stroke start
    this.timestampsBuffer[this.bufferIndex % STROKE_BUFFER_SIZE] = now - this.strokeStartTime;

    // §4.4: Pressure proxy from velocity (dp/dt normalised 0–1)
    const dt = now - this.prevTimestamp;
    if (dt > 0 && this.prevTimestamp > 0) {
      const dx = x - this.prevX;
      const dy = y - this.prevY;
      const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
      // Normalise to 0–1 (higher velocity = lower pressure proxy)
      this.pressureBuffer[this.bufferIndex % STROKE_BUFFER_SIZE] = Math.max(0, Math.min(1, 1 - velocity * 5));
    } else {
      this.pressureBuffer[this.bufferIndex % STROKE_BUFFER_SIZE] = 0.5;
    }

    this.prevX = x;
    this.prevY = y;
    this.prevTimestamp = now;
    this.bufferIndex++;
    this.pointCount++;

    this.emit({
      type: 'strokePoint',
      strokeId: this.currentStrokeId ?? undefined,
      point: { x, y },
    });
  }

  /** Start a new stroke */
  private startStroke(): void {
    this.currentStrokeId = uuid();
    this.strokeStartTime = Date.now();
    this.isDrawing = true;
    this.pointCount = 0;
    this.bufferIndex = 0;
    this.prevTimestamp = 0;

    this.emit({
      type: 'strokeStart',
      strokeId: this.currentStrokeId,
    });
  }

  /** Complete the current stroke and return the data */
  completeStroke(): CompletedStroke | null {
    this.clearOcclusionTimer();

    if (!this.isDrawing || !this.currentStrokeId) return null;

    // §5.5: Discard strokes < 10 points — minimum viable stroke threshold
    if (this.pointCount < MIN_STROKE_POINTS) {
      this.resetBuffer();
      return null;
    }

    const actualPoints = Math.min(this.pointCount, STROKE_BUFFER_SIZE);
    const completedStroke: CompletedStroke = {
      strokeId: this.currentStrokeId,
      points: new Float32Array(this.pointsBuffer.slice(0, actualPoints * 2)),
      timestamps: new Uint32Array(this.timestampsBuffer.slice(0, actualPoints)),
      pressure: new Float32Array(this.pressureBuffer.slice(0, actualPoints)),
    };

    this.emit({
      type: 'strokeComplete',
      strokeId: this.currentStrokeId,
      completedStroke,
    });

    this.resetBuffer();
    return completedStroke;
  }

  /** §5.5: Occlusion buffer — hold for 800ms before auto-completing */
  private startOcclusionTimer(): void {
    if (this.occlusionTimerId) return;
    this.occlusionTimerId = setTimeout(() => {
      this.completeStroke();
    }, OCCLUSION_BUFFER_MS);
  }

  private clearOcclusionTimer(): void {
    if (this.occlusionTimerId) {
      clearTimeout(this.occlusionTimerId);
      this.occlusionTimerId = null;
    }
  }

  /** Reset the buffer for next stroke */
  private resetBuffer(): void {
    this.isDrawing = false;
    this.currentStrokeId = null;
    this.pointCount = 0;
    this.bufferIndex = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.prevTimestamp = 0;
  }

  /** Get current buffer data for canvas rendering */
  getDrawingPoints(): { points: Float32Array; count: number } {
    const count = Math.min(this.pointCount, STROKE_BUFFER_SIZE);
    return {
      points: this.pointsBuffer,
      count,
    };
  }

  /** Check if currently drawing */
  getIsDrawing(): boolean {
    return this.isDrawing;
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.clearOcclusionTimer();
    this.listeners.clear();
    this.resetBuffer();
  }
}
