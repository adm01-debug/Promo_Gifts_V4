import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  computeLogoBounds,
  useLogoDrag,
  KEYBOARD_STEP,
  KEYBOARD_STEP_LARGE,
} from '../useLogoDrag';

function makeContainer(width = 400, height = 400) {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({ width, height, left: 0, top: 0, right: width, bottom: height, x: 0, y: 0 }) as DOMRect;
  return { current: el };
}

const key = (k: string, shiftKey = false) =>
  ({ key: k, shiftKey, preventDefault: vi.fn() }) as unknown as React.KeyboardEvent;

const downEvent = (x: number, y: number) =>
  ({
    clientX: x,
    clientY: y,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }) as unknown as React.PointerEvent;

describe('computeLogoBounds', () => {
  it('considera largura e altura da logo', () => {
    // logo 100x40 em área 400x400 => meia largura 12.5%, meia altura 5%
    const b = computeLogoBounds({
      containerWidth: 400,
      containerHeight: 400,
      logoWidthPx: 100,
      logoHeightPx: 40,
    });
    expect(b.minX).toBeCloseTo(12.5);
    expect(b.maxX).toBeCloseTo(87.5);
    expect(b.minY).toBeCloseTo(5);
    expect(b.maxY).toBeCloseTo(95);
  });

  it('considera a rotação (90° troca largura e altura)', () => {
    const b = computeLogoBounds({
      containerWidth: 400,
      containerHeight: 400,
      logoWidthPx: 100,
      logoHeightPx: 40,
      rotationDeg: 90,
    });
    expect(b.minX).toBeCloseTo(5);
    expect(b.minY).toBeCloseTo(12.5);
  });

  it('logo maior que a área fica travada no centro', () => {
    const b = computeLogoBounds({
      containerWidth: 100,
      containerHeight: 100,
      logoWidthPx: 300,
      logoHeightPx: 20,
    });
    expect(b.minX).toBe(50);
    expect(b.maxX).toBe(50);
  });
});

describe('useLogoDrag', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => vi.unstubAllGlobals());

  const opts = { logoWidthPx: 100, logoHeightPx: 40, rotationDeg: 0 };

  it('seta move em passo fino e Shift em passo maior', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useLogoDrag(makeContainer(), 50, 50, onChange, opts));
    result.current.handleKeyDown(key('ArrowRight'));
    expect(onChange).toHaveBeenLastCalledWith(50 + KEYBOARD_STEP, 50);
    result.current.handleKeyDown(key('ArrowUp', true));
    expect(onChange).toHaveBeenLastCalledWith(50, 50 - KEYBOARD_STEP_LARGE);
  });

  it('teclado respeita limites com tamanho da logo e ignora outras teclas', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useLogoDrag(makeContainer(), 87.5, 50, onChange, opts));
    result.current.handleKeyDown(key('ArrowRight', true));
    expect(onChange).toHaveBeenLastCalledWith(87.5, 50);
    const other = key('a');
    result.current.handleKeyDown(other);
    expect(other.preventDefault).not.toHaveBeenCalled();
  });

  it('arraste não deixa a logo sair da área', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useLogoDrag(makeContainer(), 50, 50, onChange, opts));
    act(() => result.current.handlePointerDown(downEvent(200, 200)));
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 2000, clientY: 2000 }));
    });
    expect(onChange).toHaveBeenLastCalledWith(87.5, 95);
    act(() => {
      window.dispatchEvent(new Event('pointerup'));
    });
  });

  it('pointercancel encerra o arraste e restaura a posição anterior', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useLogoDrag(makeContainer(), 40, 60, onChange, opts));
    act(() => result.current.handlePointerDown(downEvent(100, 100)));
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 140, clientY: 100 }));
    });
    expect(onChange).toHaveBeenLastCalledWith(50, 60);
    act(() => {
      window.dispatchEvent(new Event('pointercancel'));
    });
    expect(onChange).toHaveBeenLastCalledWith(40, 60);
    const calls = onChange.mock.calls.length;
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 300, clientY: 300 }));
    });
    expect(onChange.mock.calls.length).toBe(calls);
  });
});
