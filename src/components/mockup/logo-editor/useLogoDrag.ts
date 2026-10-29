import { useRef, useCallback, useEffect } from 'react';
import { clamp } from './logoTechniqueFilters';

export const KEYBOARD_STEP = 0.5;
export const KEYBOARD_STEP_LARGE = 5;
const FALLBACK_MIN = 5;
const FALLBACK_MAX = 95;

export interface LogoBoundsInput {
  containerWidth: number;
  containerHeight: number;
  logoWidthPx?: number;
  logoHeightPx?: number;
  rotationDeg?: number;
}

/**
 * Limits (in %) for the logo CENTER so the whole logo — including its rotated
 * bounding box — stays inside the area. A logo larger than the area is pinned
 * to the center on that axis. Without size info, falls back to the legacy 5–95.
 */
export function computeLogoBounds(input: LogoBoundsInput) {
  const { containerWidth, containerHeight, logoWidthPx, logoHeightPx, rotationDeg = 0 } = input;
  const fallback = {
    minX: FALLBACK_MIN,
    maxX: FALLBACK_MAX,
    minY: FALLBACK_MIN,
    maxY: FALLBACK_MAX,
  };
  if (
    !(containerWidth > 0) ||
    !(containerHeight > 0) ||
    !logoWidthPx ||
    !logoHeightPx ||
    logoWidthPx <= 0 ||
    logoHeightPx <= 0
  ) {
    return fallback;
  }
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const halfW = ((logoWidthPx * cos + logoHeightPx * sin) / 2 / containerWidth) * 100;
  const halfH = ((logoWidthPx * sin + logoHeightPx * cos) / 2 / containerHeight) * 100;
  const axis = (half: number) =>
    half >= 50 ? { min: 50, max: 50 } : { min: half, max: 100 - half };
  const x = axis(halfW);
  const y = axis(halfH);
  return { minX: x.min, maxX: x.max, minY: y.min, maxY: y.max };
}

// Position format is unchanged (percent number); one decimal keeps steps fine.
const round1 = (v: number) => Math.round(v * 10) / 10;

export interface LogoDragOptions {
  logoWidthPx?: number;
  logoHeightPx?: number;
  rotationDeg?: number;
}

export function useLogoDrag(
  containerRef: React.RefObject<HTMLElement | null>,
  positionX: number,
  positionY: number,
  onPositionChange: (x: number, y: number) => void,
  options: LogoDragOptions = {},
) {
  const draggingRef = useRef<{
    startClientX: number;
    startClientY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const rafRef = useRef<number | null>(null);

  // Always-fresh values so the window listeners never use stale callbacks/sizes.
  const latestRef = useRef({ onPositionChange, options });
  latestRef.current = { onPositionChange, options };

  const getBounds = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const o = latestRef.current.options;
    return computeLogoBounds({
      containerWidth: rect?.width ?? 0,
      containerHeight: rect?.height ?? 0,
      logoWidthPx: o.logoWidthPx,
      logoHeightPx: o.logoHeightPx,
      rotationDeg: o.rotationDeg,
    });
  }, [containerRef]);

  // BUG-DRAG1 FIX: track the exact function references added to window so
  // the unmount cleanup can remove them.
  const listenersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: () => void;
    cancel: () => void;
  } | null>(null);

  const detach = useCallback(() => {
    const l = listenersRef.current;
    if (l) {
      window.removeEventListener('pointermove', l.move);
      window.removeEventListener('pointerup', l.up);
      window.removeEventListener('pointercancel', l.cancel);
    }
    listenersRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    draggingRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      detach();

      draggingRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPosX: positionX,
        startPosY: positionY,
      };

      const move = (ev: PointerEvent) => {
        const container = containerRef.current;
        const drag = draggingRef.current;
        if (!container || !drag) return;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (draggingRef.current !== drag) return; // drag ended/cancelled meanwhile
          const rect = container.getBoundingClientRect();
          const nextX = drag.startPosX + ((ev.clientX - drag.startClientX) / rect.width) * 100;
          const nextY = drag.startPosY + ((ev.clientY - drag.startClientY) / rect.height) * 100;
          const b = getBounds();
          latestRef.current.onPositionChange(
            round1(clamp(nextX, b.minX, b.maxX)),
            round1(clamp(nextY, b.minY, b.maxY)),
          );
        });
      };
      const up = () => detach();
      // pointercancel (touch interrupted, OS gesture): end the drag and restore
      // the position held before it started.
      const cancel = () => {
        const drag = draggingRef.current;
        detach();
        if (drag) latestRef.current.onPositionChange(drag.startPosX, drag.startPosY);
      };

      listenersRef.current = { move, up, cancel };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
    },
    [positionX, positionY, containerRef, detach, getBounds],
  );

  // Arrow keys nudge in fine steps; Shift = larger step.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const dir: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const d = dir[e.key];
      if (!d) return;
      e.preventDefault();
      const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
      const b = getBounds();
      onPositionChange(
        round1(clamp(positionX + d[0] * step, b.minX, b.maxX)),
        round1(clamp(positionY + d[1] * step, b.minY, b.maxY)),
      );
    },
    [positionX, positionY, onPositionChange, getBounds],
  );

  // BUG-DRAG1 FIX: clean up window listeners if component unmounts mid-drag
  useEffect(() => detach, [detach]);

  return { handlePointerDown, handleKeyDown };
}
