import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const invokeEdgeMock = vi.fn();
vi.mock('@/lib/edge/safeInvokeCall', () => ({
  invokeEdge: (...args: unknown[]) => invokeEdgeMock(...args),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useLogoColorAnalysis } from '../useLogoColorAnalysis';

let imageMode: 'load' | 'error' = 'load';
const createdImages: Array<{ crossOrigin: string | null }> = [];

class FakeImage {
  width = 100;
  height = 100;
  crossOrigin: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    createdImages.push(this);
  }
  set src(_v: string) {
    queueMicrotask(() => (imageMode === 'load' ? this.onload?.() : this.onerror?.()));
  }
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useLogoColorAnalysis', () => {
  const origImage = globalThis.Image;
  const origCreate = document.createElement.bind(document);

  beforeEach(() => {
    invokeEdgeMock.mockReset();
    createdImages.length = 0;
    imageMode = 'load';
    (globalThis as unknown as { Image: unknown }).Image = FakeImage;
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage: vi.fn() }),
          toDataURL: () => 'data:image/png;base64,resized',
        } as unknown as HTMLCanvasElement;
      }
      return origCreate(tag);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    (globalThis as unknown as { Image: unknown }).Image = origImage;
    vi.restoreAllMocks();
  });

  it('ignora a resposta antiga: a primeira análise responde por último e o estado final é da SEGUNDA', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    invokeEdgeMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result } = renderHook(() => useLogoColorAnalysis());

    let p1!: Promise<unknown>;
    let p2!: Promise<unknown>;
    act(() => {
      p1 = result.current.analyzeImage('data:image/png;base64,AAA');
    });
    await waitFor(() => expect(invokeEdgeMock).toHaveBeenCalledTimes(1));
    act(() => {
      p2 = result.current.analyzeImage('data:image/png;base64,BBB');
    });
    await waitFor(() => expect(invokeEdgeMock).toHaveBeenCalledTimes(2));

    await act(async () => {
      second.resolve({ data: { colors: [{ name: 'Azul', hex: '#0000FF' }] }, error: null });
      await p2;
    });
    await act(async () => {
      first.resolve({ data: { colors: [{ name: 'Vermelho', hex: '#FF0000' }] }, error: null });
      await p1;
    });

    expect(result.current.colors.map((c) => c.hex)).toEqual(['#0000FF']);
    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('passa o AbortSignal para a edge e aborta a análise anterior', async () => {
    invokeEdgeMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLogoColorAnalysis());

    act(() => {
      void result.current.analyzeImage('data:image/png;base64,AAA');
    });
    await waitFor(() => expect(invokeEdgeMock).toHaveBeenCalledTimes(1));
    const sig1 = invokeEdgeMock.mock.calls[0][1].signal as AbortSignal;
    expect(sig1).toBeInstanceOf(AbortSignal);
    expect(sig1.aborted).toBe(false);

    act(() => {
      void result.current.analyzeImage('data:image/png;base64,BBB');
    });
    expect(sig1.aborted).toBe(true);
  });

  it('erro de carregamento da imagem vira estado de erro visível e recuperável', async () => {
    imageMode = 'error';
    const { result } = renderHook(() => useLogoColorAnalysis());

    await act(async () => {
      await result.current.analyzeImage('https://example.com/logo.png');
    });

    expect(result.current.error).toMatch(/carregar a imagem/i);
    expect(result.current.colors).toEqual([]);
    expect(result.current.isAnalyzing).toBe(false);
    expect(invokeEdgeMock).not.toHaveBeenCalled();

    // recuperável: nova tentativa com imagem válida limpa o erro
    imageMode = 'load';
    invokeEdgeMock.mockResolvedValueOnce({
      data: { colors: [{ name: 'Azul', hex: '#0000FF' }] },
      error: null,
    });
    await act(async () => {
      await result.current.analyzeImage('https://example.com/logo2.png');
    });
    expect(result.current.error).toBeNull();
    expect(result.current.colors).toHaveLength(1);
  });

  it('carrega imagem remota com crossOrigin anonymous (data: URL não precisa)', async () => {
    invokeEdgeMock.mockResolvedValue({ data: { colors: [] }, error: null });
    const { result } = renderHook(() => useLogoColorAnalysis());

    await act(async () => {
      await result.current.analyzeImage('https://example.com/logo.png');
    });
    expect(createdImages[0].crossOrigin).toBe('anonymous');

    await act(async () => {
      await result.current.analyzeImage('data:image/png;base64,AAA');
    });
    expect(createdImages[1].crossOrigin).toBeNull();
  });
});
