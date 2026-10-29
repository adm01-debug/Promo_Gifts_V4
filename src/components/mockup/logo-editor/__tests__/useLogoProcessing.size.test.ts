/**
 * Testes — useLogoProcessing: redução do logo ANTES do loop de pixel.
 *
 * O loop de laser/serigrafia percorre todos os pixels na thread principal; um
 * logo de 4000 px (16 M pixels) travava o editor. Cobre:
 *   - logo de 4000 px chega ao processador reduzido (2048 px no maior lado);
 *   - proporção preservada em paisagem e em retrato;
 *   - laser e serigrafia usam o mesmo caminho reduzido;
 *   - logo que já cabe no limite é processado no ORIGINAL, sem cópia;
 *   - um limite explícito menor é respeitado (a função é parâmetro-driven);
 *   - falha ao carregar o logo não vira prévia silenciosa (erro logado);
 *   - contrato: geração/exportação final continua usando o logo ORIGINAL.
 *
 * jsdom não implementa canvas nem carregamento de imagem, então `Image`, `fetch`,
 * `URL.createObjectURL` e o contexto 2D são dublês que registram o que o código
 * REAL pediu. O hook e a função de redução exercitados aqui são os de produção.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { downscaleLogoForProcessing, useLogoProcessing } from '../useLogoProcessing';
import { processLogoForLaser, processLogoForSerigrafia } from '@/utils/laser-logo-processor';
import { logger } from '@/lib/logger';
import type { TechniqueColorConfig } from '../../techniqueColorUtils';

vi.mock('@/utils/laser-logo-processor', () => ({
  processLogoForLaser: vi.fn((source: string) => Promise.resolve(`laser:${source}`)),
  processLogoForSerigrafia: vi.fn((source: string) => Promise.resolve(`serigrafia:${source}`)),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const LANDSCAPE_4000 = 'data:image/png;base64,logo-paisagem-4000x2000';
const PORTRAIT_4000 = 'data:image/png;base64,logo-retrato-1000x4000';
const WITHIN_LIMIT_1200 = 'data:image/png;base64,logo-1200x600';
const UNREADABLE = 'data:image/png;base64,logo-ilegivel';

/** Dimensões que o "navegador" devolve para cada logo carregado. */
const IMAGE_SIZES: Record<string, { width: number; height: number }> = {
  [LANDSCAPE_4000]: { width: 4000, height: 2000 },
  [PORTRAIT_4000]: { width: 1000, height: 4000 },
  [WITHIN_LIMIT_1200]: { width: 1200, height: 600 },
};

const LASER: TechniqueColorConfig = { category: 'laser', laserTone: 'escuro' };
const SERIGRAFIA: TechniqueColorConfig = {
  category: 'serigrafia',
  colorCount: 1,
  selectedColors: [{ hex: '#E30613', pantoneCode: '185C' }],
};

/** Tamanho de cada PNG que o código real produziu via canvas.toDataURL. */
let producedCanvases: { width: number; height: number }[];
/** URL de blob -> logo de origem, para o dublê de Image saber as dimensões. */
let sourceByBlobUrl: Map<string, string>;
/** createObjectURL/revokeObjectURL originais, restaurados após cada teste. */
let originalObjectUrl: {
  create: typeof URL.createObjectURL;
  revoke: typeof URL.revokeObjectURL;
};

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  private currentSrc = '';

  get src(): string {
    return this.currentSrc;
  }

  set src(value: string) {
    this.currentSrc = value;
    const source = sourceByBlobUrl.get(value);
    const size = source ? IMAGE_SIZES[source] : undefined;
    // Carregamento real é assíncrono: resolve num microtask, depois de o
    // chamador registrar onload/onerror.
    queueMicrotask(() => {
      if (!size) {
        this.onerror?.();
        return;
      }
      this.naturalWidth = size.width;
      this.naturalHeight = size.height;
      this.onload?.();
    });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  producedCanvases = [];
  sourceByBlobUrl = new Map();

  const blobBySource = new Map<string, Blob>();
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const source = String(input);
      let blob = blobBySource.get(source);
      if (!blob) {
        blob = new Blob([source], { type: 'image/png' });
        blobBySource.set(source, blob);
      }
      return Promise.resolve({ blob: () => Promise.resolve(blob) });
    }),
  );

  // URL real (o código usa `new URL`) com createObjectURL/revokeObjectURL dublês.
  originalObjectUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  URL.createObjectURL = vi.fn((blob: Blob) => {
    const source = [...blobBySource.entries()].find(([, b]) => b === blob)?.[0] ?? '';
    const url = `blob:mock-${sourceByBlobUrl.size}`;
    sourceByBlobUrl.set(url, source);
    return url;
  });
  URL.revokeObjectURL = vi.fn();

  vi.stubGlobal('Image', FakeImage);
});

afterEach(() => {
  URL.createObjectURL = originalObjectUrl.create;
  URL.revokeObjectURL = originalObjectUrl.revoke;
  vi.unstubAllGlobals();
});

/** O ambiente jsdom não tem contexto 2D; registramos o tamanho do PNG gerado. */
function installCanvasDoubles() {
  HTMLCanvasElement.prototype.getContext = (() => ({
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement) {
    producedCanvases.push({ width: this.width, height: this.height });
    return `data:image/png;canvas:${this.width}x${this.height}`;
  } as unknown as typeof HTMLCanvasElement.prototype.toDataURL;
}

describe('useLogoProcessing — logo grande é reduzido antes de processar', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  beforeEach(() => {
    installCanvasDoubles();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  });

  it('processa um logo de 4000 px reduzido a 2048 px no maior lado (laser)', async () => {
    const { result } = renderHook(() => useLogoProcessing(LANDSCAPE_4000, LASER));

    await waitFor(() => expect(result.current.processedLogoUrl).not.toBeNull());

    // O maior lado cai de 4000 px para exatamente 2048 px, proporção 2:1 mantida.
    expect(producedCanvases).toEqual([{ width: 2048, height: 1024 }]);
    expect(vi.mocked(processLogoForLaser)).toHaveBeenCalledTimes(1);
    // O processador recebeu a versão reduzida, nunca o original de 4000 px.
    expect(vi.mocked(processLogoForLaser).mock.calls[0][0]).toBe('data:image/png;canvas:2048x1024');
    expect(vi.mocked(processLogoForLaser).mock.calls[0][0]).not.toBe(LANDSCAPE_4000);
    expect(result.current.processedLogoUrl).toBe('laser:data:image/png;canvas:2048x1024');
  });

  it('preserva a proporção em imagem retrato (1000x4000 -> 512x2048)', async () => {
    const { result } = renderHook(() => useLogoProcessing(PORTRAIT_4000, LASER));

    await waitFor(() => expect(result.current.processedLogoUrl).not.toBeNull());

    expect(producedCanvases).toEqual([{ width: 512, height: 2048 }]);
    expect(vi.mocked(processLogoForLaser).mock.calls[0][0]).toBe('data:image/png;canvas:512x2048');
  });

  it('serigrafia também processa a versão reduzida', async () => {
    const { result } = renderHook(() => useLogoProcessing(LANDSCAPE_4000, SERIGRAFIA));

    await waitFor(() => expect(result.current.processedLogoUrl).not.toBeNull());

    expect(vi.mocked(processLogoForSerigrafia)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(processLogoForSerigrafia).mock.calls[0][0]).toBe(
      'data:image/png;canvas:2048x1024',
    );
  });

  it('logo que já cabe no limite é processado no original, sem cópia', async () => {
    const { result } = renderHook(() => useLogoProcessing(WITHIN_LIMIT_1200, LASER));

    await waitFor(() => expect(result.current.processedLogoUrl).not.toBeNull());

    expect(producedCanvases).toEqual([]);
    expect(vi.mocked(processLogoForLaser).mock.calls[0][0]).toBe(WITHIN_LIMIT_1200);
    expect(result.current.processedLogoUrl).toBe(`laser:${WITHIN_LIMIT_1200}`);
  });

  it('falha ao carregar o logo não gera prévia e é registrada, não silenciada', async () => {
    const { result } = renderHook(() => useLogoProcessing(UNREADABLE, LASER));

    await waitFor(() => expect(result.current.isProcessing).toBe(false));

    expect(result.current.processedLogoUrl).toBeNull();
    expect(vi.mocked(processLogoForLaser)).not.toHaveBeenCalled();
    expect(vi.mocked(logger.error)).toHaveBeenCalled();
  });
});

describe('downscaleLogoForProcessing', () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  beforeEach(() => {
    installCanvasDoubles();
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  });

  it('devolve o próprio URL quando o maior lado já cabe no limite', async () => {
    await expect(downscaleLogoForProcessing(WITHIN_LIMIT_1200)).resolves.toBe(WITHIN_LIMIT_1200);
    expect(producedCanvases).toEqual([]);
  });

  it('respeita um limite explícito menor (retrato 1000x4000 com limite 800 -> 200x800)', async () => {
    await expect(downscaleLogoForProcessing(PORTRAIT_4000, 800)).resolves.toBe(
      'data:image/png;canvas:200x800',
    );
    expect(producedCanvases).toEqual([{ width: 200, height: 800 }]);
  });
});

/**
 * Contrato (checagem estática do código-fonte): a redução é da PRÉVIA. A geração
 * e a exportação final continuam entregando `area.logoPreview` — o logo original
 * enviado pelo usuário — para upload e composição.
 */
describe('contrato — a exportação final continua usando o logo original', () => {
  function readSrc(relativePath: string) {
    return readFileSync(resolve(__dirname, '..', '..', '..', '..', '..', relativePath), 'utf-8');
  }

  it('a gravação do mockup sobe area.logoPreview (original) para o storage', () => {
    const service = readSrc('src/hooks/mockup/mockupGenerationService.ts');
    expect(service).toContain('let logoUrl: string | null = area.logoPreview ?? null;');
    expect(service).not.toContain('downscaleLogoForProcessing');
  });

  it('a composição/exportação de layout desenha area.logoPreview (original)', () => {
    const layoutButtons = readSrc('src/components/mockup/approval/MockupLayoutButtons.tsx');
    expect(layoutButtons).toContain('loadImageWithFallback(activeArea.logoPreview)');
    expect(layoutButtons).not.toContain('downscaleLogoForProcessing');
  });
});
