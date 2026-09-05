/**
 * scheduleStaleChunkReload — cap storage-free de reloads de recuperação.
 *
 * Contrato (espelha o boot guard inline de index.html):
 *  - 1ª chamada numa URL limpa → replace(...?__bare=1&__bart=<agora>)
 *  - URL com __bare=1 dentro da janela → replace(...__bare=2), mesmo __bart
 *  - URL com __bare=2 dentro da janela → retorna false, NÃO navega
 *  - janela expirada (>20s) → contador reinicia em 1 com __bart novo
 *  - chamadas repetidas no mesmo page-load → coalescem num único replace
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/chunk-recovery', () => ({ swConfirmedStaleUrls: new Set<string>() }));

const ORIGINAL_LOCATION = window.location;

function stubLocation(href: string) {
  const replace = vi.fn();
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href, replace, reload },
  });
  return { replace, reload };
}

async function loadFresh() {
  vi.resetModules();
  return import('@/lib/sw-register');
}

describe('scheduleStaleChunkReload', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T11:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'location', { configurable: true, value: ORIGINAL_LOCATION });
  });

  it('1ª tentativa: anexa __bare=1 e __bart=agora, navega após 300ms via replace', async () => {
    const { replace, reload } = stubLocation(
      'https://www.promogifts.com.br/carrinhos?status=draft',
    );
    const { scheduleStaleChunkReload } = await loadFresh();
    const now = Date.now();

    expect(scheduleStaleChunkReload()).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);

    expect(reload).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
    const u = new URL(replace.mock.calls[0][0] as string);
    expect(u.pathname).toBe('/carrinhos');
    expect(u.searchParams.get('status')).toBe('draft');
    expect(u.searchParams.get('__bare')).toBe('1');
    expect(u.searchParams.get('__bart')).toBe(String(now));
  });

  it('2ª tentativa dentro da janela: incrementa para __bare=2 preservando __bart', async () => {
    const firstAt = Date.now() - 5_000;
    const { replace } = stubLocation(`https://x.test/carrinhos?__bare=1&__bart=${firstAt}`);
    const { scheduleStaleChunkReload } = await loadFresh();

    expect(scheduleStaleChunkReload()).toBe(true);
    vi.advanceTimersByTime(300);
    const u = new URL(replace.mock.calls[0][0] as string);
    expect(u.searchParams.get('__bare')).toBe('2');
    expect(u.searchParams.get('__bart')).toBe(String(firstAt));
  });

  it('cap atingido (__bare=2 na janela): retorna false e não navega', async () => {
    const firstAt = Date.now() - 5_000;
    const { replace, reload } = stubLocation(`https://x.test/carrinhos?__bare=2&__bart=${firstAt}`);
    const { scheduleStaleChunkReload } = await loadFresh();

    expect(scheduleStaleChunkReload()).toBe(false);
    vi.advanceTimersByTime(1_000);
    expect(replace).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('janela expirada (>20s): reinicia contador em __bare=1 com __bart novo', async () => {
    const firstAt = Date.now() - 25_000;
    const { replace } = stubLocation(`https://x.test/carrinhos?__bare=2&__bart=${firstAt}`);
    const { scheduleStaleChunkReload } = await loadFresh();
    const now = Date.now();

    expect(scheduleStaleChunkReload()).toBe(true);
    vi.advanceTimersByTime(300);
    const u = new URL(replace.mock.calls[0][0] as string);
    expect(u.searchParams.get('__bare')).toBe('1');
    expect(u.searchParams.get('__bart')).toBe(String(now));
  });

  it('chamadas repetidas no mesmo page-load coalescem num único replace', async () => {
    const { replace } = stubLocation('https://x.test/favoritos');
    const { scheduleStaleChunkReload } = await loadFresh();

    expect(scheduleStaleChunkReload()).toBe(true);
    expect(scheduleStaleChunkReload()).toBe(true);
    expect(scheduleStaleChunkReload()).toBe(true);
    vi.advanceTimersByTime(300);
    expect(replace).toHaveBeenCalledTimes(1);
  });
});
