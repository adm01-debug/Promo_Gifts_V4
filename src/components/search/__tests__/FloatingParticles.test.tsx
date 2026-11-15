import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { FloatingParticles } from '../voice/FloatingParticles';

function fakeContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    lineWidth: 0,
    strokeStyle: '',
    fillStyle: '' as unknown,
  };
}

describe('FloatingParticles', () => {
  let frames: FrameRequestCallback[];
  let ctx: ReturnType<typeof fakeContext>;

  beforeEach(() => {
    frames = [];
    ctx = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ctx as unknown as CanvasRenderingContext2D,
    );
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 200,
      height: 100,
    } as DOMRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      const cb = frames.shift();
      cb?.(0);
    }
  };

  it('dimensiona o canvas pelo contêiner pai', () => {
    const { container } = render(
      <div>
        <FloatingParticles phase="idle" isBooting={false} />
      </div>,
    );
    const canvas = container.querySelector('canvas')!;
    expect(canvas.style.width).toBe('200px');
    expect(canvas.style.height).toBe('100px');
    expect(ctx.scale).toHaveBeenCalled();
  });

  it('desenha a quantidade de partículas da fase e agenda o próximo quadro', () => {
    render(
      <div>
        <FloatingParticles phase="listening" isBooting={false} />
      </div>,
    );
    step();
    // fase listening = 40 partículas, 2 arcos por partícula
    expect(ctx.arc).toHaveBeenCalledTimes(80);
    expect(ctx.createRadialGradient).toHaveBeenCalledTimes(40);
    expect(frames).toHaveLength(1);
  });

  it('usa a configuração de boot e recicla partículas ao longo do tempo', () => {
    render(
      <div>
        <FloatingParticles phase="speaking" isBooting />
      </div>,
    );
    step(600); // passa do maxLife máximo (500)
    // boot = 15 partículas → 30 arcos por quadro
    ctx.arc.mockClear();
    step();
    expect(ctx.arc).toHaveBeenCalledTimes(30);
  });

  it('desconecta animação e listener de resize ao desmontar', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(
      <div>
        <FloatingParticles phase="error" isBooting={false} />
      </div>,
    );
    window.dispatchEvent(new Event('resize'));
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('não anima quando o canvas não tem contexto 2D', () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    render(<FloatingParticles phase="idle" isBooting={false} />);
    expect(frames).toHaveLength(0);
  });
});
