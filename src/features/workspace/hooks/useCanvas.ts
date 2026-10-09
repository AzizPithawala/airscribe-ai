/**
 * AirScribe AI — useCanvas Hook
 * §4.4: "Canvas must be imperatively controlled via a ref to escape the React render cycle entirely."
 * §4.4: "The draw loop runs on requestAnimationFrame. It reads from a mutable stroke buffer."
 * §4.5: "Canvas context is cleared and redrawn each frame from the stroke buffer"
 */

import { useRef, useCallback, useEffect } from 'react';

interface UseCanvasOptions {
  /** Whether canvas is actively drawing */
  isDrawing: boolean;
}

interface UseCanvasReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  offscreenCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  clearCanvas: () => void;
  drawPoint: (x: number, y: number) => void;
  drawStroke: (points: Float32Array, count: number) => void;
  compositeToOffscreen: () => void;
}

/**
 * §4.4: Imperative canvas via useRef — escapes React render cycle.
 * Canvas context cleared and redrawn each frame (§4.5).
 */
export function useCanvas({ isDrawing }: UseCanvasOptions): UseCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Setup canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Setup offscreen canvas for compositing (§4.5)
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      offscreenCanvasRef.current.width = canvas.width;
      offscreenCanvasRef.current.height = canvas.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  /** Clear canvas — §4.5: cleared and redrawn each frame */
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    lastPointRef.current = null;

    // Clear offscreen too
    const offscreen = offscreenCanvasRef.current;
    const offCtx = offscreen?.getContext('2d');
    if (offscreen && offCtx) {
      offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    }
  }, []);

  /** Draw a single point — used in rAF loop */
  const drawPoint = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Convert normalised coordinates to canvas space
    const canvasX = x * parent.clientWidth;
    const canvasY = y * parent.clientHeight;

    // §2.2: Active stroke colour --ws-accent (#6366F1)
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (lastPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(canvasX, canvasY);
      ctx.stroke();

      // §2.2: Trailing stroke ghost/fade effect --ws-ghost
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(canvasX, canvasY);
      ctx.stroke();
    }

    lastPointRef.current = { x: canvasX, y: canvasY };
  }, []);

  /** Draw a complete stroke from buffer data */
  const drawStroke = useCallback((points: Float32Array, count: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || count < 2) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < count; i++) {
      const x = (points[i * 2] ?? 0) * parent.clientWidth;
      const y = (points[i * 2 + 1] ?? 0) * parent.clientHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }, []);

  /** §4.5: Composite older strokes to offscreen canvas as ImageBitmap */
  const compositeToOffscreen = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;

    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    offCtx.drawImage(canvas, 0, 0);
  }, []);

  // Reset last point when not drawing
  useEffect(() => {
    if (!isDrawing) {
      lastPointRef.current = null;
    }
  }, [isDrawing]);

  return {
    canvasRef,
    offscreenCanvasRef,
    clearCanvas,
    drawPoint,
    drawStroke,
    compositeToOffscreen,
  };
}
