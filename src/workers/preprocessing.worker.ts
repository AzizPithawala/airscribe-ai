/**
 * AirScribe AI — Preprocessing Worker
 * §5.4: "All stages 1–8 run in the preprocessing Web Worker.
 * The main thread receives only the final Float32Array(4096) ready for ONNX inference.
 * Comlink is used for typed Worker communication."
 *
 * §4.2: All preprocessing transforms are pure functions with no side effects.
 *
 * 8-Stage Pipeline:
 * 1. Outlier rejection (§5.4 Stage 1)
 * 2. Temporal downsampling — RDP (§5.4 Stage 2)
 * 3. Catmull-Rom smoothing (§5.4 Stage 3)
 * 4. Coordinate normalisation (§5.4 Stage 4)
 * 5. Canvas scaling (§5.4 Stage 5)
 * 6. Centre alignment (§5.4 Stage 6)
 * 7. Grayscale render (§5.4 Stage 7)
 * 8. Pixel normalisation (§5.4 Stage 8)
 */

import * as Comlink from 'comlink';
import {
  OUTLIER_STD_DEVS,
  RDP_EPSILON,
  MAX_POINTS_PER_STROKE,
  CATMULL_ROM_TENSION,
  CNN_INPUT_SIZE,
  CNN_INPUT_PADDING,
  MIN_STROKE_POINTS,
  TENSOR_SIZE,
} from '../constants';

interface Point {
  x: number;
  y: number;
}

// ─── Stage 1: Outlier Rejection ─────────────────────────────────────────────
/**
 * §5.4: "Points > 3 standard deviations from rolling mean velocity are discarded"
 */
function rejectOutliers(points: Point[]): Point[] {
  if (points.length < 3) return points;

  const velocities: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    velocities.push(Math.sqrt(dx * dx + dy * dy));
  }

  const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const stdDev = Math.sqrt(
    velocities.reduce((sum, v) => sum + (v - mean) ** 2, 0) / velocities.length
  );

  const threshold = mean + OUTLIER_STD_DEVS * stdDev;
  const result: Point[] = [points[0]!];

  for (let i = 1; i < points.length; i++) {
    if ((velocities[i - 1] ?? 0) <= threshold) {
      result.push(points[i]!);
    }
  }

  return result;
}

// ─── Stage 2: RDP Downsampling ──────────────────────────────────────────────
/**
 * §5.4: "Reduce to ≤ 100 points per stroke using Ramer-Douglas-Peucker (ε = 0.005)"
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const norm = Math.sqrt(dx * dx + dy * dy);
  if (norm === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / norm;
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;

  const first = points[0]!;
  const last = points[points.length - 1]!;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i]!, first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function downsample(points: Point[]): Point[] {
  let result = rdpSimplify(points, RDP_EPSILON);
  // Ensure ≤ MAX_POINTS_PER_STROKE
  while (result.length > MAX_POINTS_PER_STROKE) {
    result = rdpSimplify(result, RDP_EPSILON * 2);
  }
  return result;
}

// ─── Stage 3: Catmull-Rom Smoothing ─────────────────────────────────────────
/**
 * §5.4: "Fit smooth curve through sampled points; tension = 0.5"
 */
function catmullRomSmooth(points: Point[]): Point[] {
  if (points.length < 4) return points;

  const result: Point[] = [];
  const t = CATMULL_ROM_TENSION;
  const steps = 10;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)]!;
    const p1 = points[i]!;
    const p2 = points[Math.min(i + 1, points.length - 1)]!;
    const p3 = points[Math.min(i + 2, points.length - 1)]!;

    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const u2 = u * u;
      const u3 = u2 * u;

      const x =
        0.5 * ((2 * p1.x) +
          (-p0.x + p2.x) * t * u +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t * u2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t * u3);

      const y =
        0.5 * ((2 * p1.y) +
          (-p0.y + p2.y) * t * u +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t * u2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t * u3);

      result.push({ x, y });
    }
  }

  result.push(points[points.length - 1]!);
  return result;
}

// ─── Stage 4: Coordinate Normalisation ──────────────────────────────────────
/**
 * §5.4: "Translate to centroid, scale bounding box to unit square [0,1]"
 */
function normaliseCoordinates(points: Point[]): Point[] {
  if (points.length === 0) return points;

  // Find centroid
  let cx = 0, cy = 0;
  for (const p of points) { cx += p.x; cy += p.y; }
  cx /= points.length;
  cy /= points.length;

  // Translate to centroid
  const centered = points.map(p => ({ x: p.x - cx, y: p.y - cy }));

  // Find bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of centered) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = Math.max(width, height);

  // Scale to unit square [0, 1]
  return centered.map(p => ({
    x: (p.x - minX) / scale,
    y: (p.y - minY) / scale,
  }));
}

// ─── Stage 5–8: Render to CNN Input ─────────────────────────────────────────
/**
 * §5.4 Stages 5-8:
 * 5. Scale unit square to 64×64 pixel grid
 * 6. Centre in grid with 4px padding
 * 7. Render as 2px anti-aliased white line on black 64×64 canvas
 * 8. Pixel values / 255 → float32
 */
function renderToTensor(points: Point[]): Float32Array {
  const size = CNN_INPUT_SIZE;
  const pad = CNN_INPUT_PADDING;
  const usable = size - 2 * pad;
  const pixels = new Float32Array(TENSOR_SIZE); // 64x64 = 4096

  if (points.length < 2) {
    // §5.5: Zero-area bounding box → treat as dot
    const cx = Math.floor(size / 2);
    const cy = Math.floor(size / 2);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const idx = (cy + dy) * size + (cx + dx);
        if (idx >= 0 && idx < TENSOR_SIZE) {
          pixels[idx] = 1.0;
        }
      }
    }
    return pixels;
  }

  // Scale and centre
  const scaled = points.map(p => ({
    x: Math.round(p.x * usable + pad),
    y: Math.round(p.y * usable + pad),
  }));

  // Draw lines (Bresenham's) — simulating 2px anti-aliased white on black
  for (let i = 0; i < scaled.length - 1; i++) {
    const p0 = scaled[i]!;
    const p1 = scaled[i + 1]!;
    drawLine(pixels, size, p0.x, p0.y, p1.x, p1.y);
  }

  return pixels;
}

/** Bresenham's line algorithm — renders to pixel array */
function drawLine(
  pixels: Float32Array,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    // 2px stroke width
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const px = x + ox;
        const py = y + oy;
        if (px >= 0 && px < size && py >= 0 && py < size) {
          pixels[py * size + px] = 1.0; // §5.4 Stage 8: already normalised to 0-1
        }
      }
    }

    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

// ─── Public API (Comlink) ───────────────────────────────────────────────────

/**
 * Main preprocessing function — executes the full 8-stage pipeline
 * §5.4: "The main thread receives only the final Float32Array(4096)"
 */
function preprocessStroke(rawPoints: Float32Array): Float32Array {
  // Convert interleaved Float32Array to Point[]
  const points: Point[] = [];
  for (let i = 0; i < rawPoints.length; i += 2) {
    points.push({ x: rawPoints[i]!, y: rawPoints[i + 1]! });
  }

  // §5.5: Discard strokes < 10 points
  if (points.length < MIN_STROKE_POINTS) {
    return new Float32Array(0);
  }

  // Stage 1: Outlier rejection
  const cleaned = rejectOutliers(points);

  // Stage 2: Temporal downsampling (RDP)
  const downsampled = downsample(cleaned);

  // Stage 3: Catmull-Rom smoothing
  const smoothed = catmullRomSmooth(downsampled);

  // Stage 4: Coordinate normalisation
  const normalised = normaliseCoordinates(smoothed);

  // Stages 5-8: Scale, centre, render, normalise → Float32Array(4096)
  const tensor = renderToTensor(normalised);

  return tensor;
}

const api = {
  preprocessStroke,
};

export type PreprocessingAPI = typeof api;

Comlink.expose(api);
