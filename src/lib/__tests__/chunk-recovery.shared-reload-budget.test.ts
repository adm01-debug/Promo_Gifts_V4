/**
 * chunk-recovery — orçamento COMPARTILHADO de reload (__bare/__bart).
 *
 * Achado da auditoria (2026-09): 3 mecanismos independentes podiam disparar
 * hard-reload após falha de asset/chunk — boot guard inline de index.html,
 * sw-register.ts (SW_STALE_CHUNK) e attemptChunkRecovery() aqui. index.html e
 * sw-register.ts já coordenavam entre si por acaso (mesmos nomes de param na
 * URL), mas attemptChunkRecovery() tinha seu PRÓPRIO contador em
 * sessionStorage, invisível aos outros 2 — permitindo mais reloads agregados
 * do que o "no máximo 2 em 20s" documentado isoladamente em cada um.
 *
 * Fix: bumpSharedReloadBudget()/readSharedReloadBudget() (implementação única,
 * consumida por sw-register.ts e por attemptChunkRecovery) e
 * attemptChunkRecovery() agora recusa reload se o orçamento compartilhado já
 * estiver esgotado, mesmo que seu próprio contador em sessionStorage ainda
 * tivesse budget.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  readSharedReloadBudget,
  bumpSharedReloadBudget,
  attemptChunkRecovery,
  clearChunkRecoveryState,
} from '@/lib/chunk-recovery';

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe('readSharedReloadBudget / bumpSharedReloadBudget (puro)', () => {
  it('URL limpa: bump seta __bare=1 e __bart=agora, retorna true', () => {
    const u = new URL('https://x.test/carrinhos?status=draft');
    const now = Date.now();
    expect(bumpSharedReloadBudget(u)).toBe(true);
    expect(u.searchParams.get('__bare')).toBe('1');
    expect(u.searchParams.get('__bart')).toBe(String(now));
    expect(u.searchParams.get('status')).toBe('draft'); // preserva outros params
  });

  it('2º bump dentro da janela: incrementa para 2 preservando __bart', () => {
    const firstAt = Date.now() - 5_000;
    const u = new URL(`https://x.test/carrinhos?__bare=1&__bart=${firstAt}`);
    expect(bumpSharedReloadBudget(u)).toBe(true);
    expect(u.searchParams.get('__bare')).toBe('2');
    expect(u.searchParams.get('__bart')).toBe(String(firstAt));
  });

  it('teto atingido (__bare=2 na janela): bump recusa e NÃO muta a URL', () => {
    const firstAt = Date.now() - 5_000;
    const u = new URL(`https://x.test/carrinhos?__bare=2&__bart=${firstAt}`);
    const before = u.toString();
    expect(bumpSharedReloadBudget(u)).toBe(false);
    expect(u.toString()).toBe(before);
    expect(readSharedReloadBudget(u).count).toBe(2);
  });

  it('janela expirada (>20s): reseta para 1 com __bart novo', () => {
    const firstAt = Date.now() - 25_000;
    const u = new URL(`https://x.test/carrinhos?__bare=2&__bart=${firstAt}`);
    const now = Date.now();
    expect(bumpSharedReloadBudget(u)).toBe(true);
    expect(u.searchParams.get('__bare')).toBe('1');
    expect(u.searchParams.get('__bart')).toBe(String(now));
  });

  it('readSharedReloadBudget não muta a URL (só leitura)', () => {
    const u = new URL('https://x.test/carrinhos?__bare=1&__bart=123');
    const before = u.toString();
    readSharedReloadBudget(u);
    expect(u.toString()).toBe(before);
  });
});

describe('attemptChunkRecovery — respeita o orçamento compartilhado (__bare) além do próprio contador', () => {
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

  // Sem vi.useFakeTimers(): o erro de teste usado abaixo não tem URL
  // extraível, então attemptChunkRecovery pula inteiramente o bloco de
  // probe/backoff (só roda `if (url)`) — não há delay real para avançar.
  // NProgress.start() usa setInterval interno que nunca fecha sozinho sob
  // fake timers (roda até o `10000 timers` guard do vitest abortar como
  // "infinite loop"), então esta suíte roda com timers reais.
  beforeEach(() => {
    clearChunkRecoveryState();
    sessionStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: ORIGINAL_LOCATION });
    sessionStorage.clear();
  });

  it('orçamento livre + contador próprio livre: reload ocorre e a URL final carrega __bare/__bart', async () => {
    const { replace } = stubLocation('https://www.promogifts.com.br/orcamentos');

    const result = await attemptChunkRecovery(new Error('erro genérico sem URL extraível'));

    expect(result).toBe(true);
    expect(replace).toHaveBeenCalledTimes(1);
    const u = new URL(replace.mock.calls[0][0] as string);
    expect(u.searchParams.get('__bare')).toBe('1');
    expect(u.searchParams.has('__bart')).toBe(true);
    expect(u.searchParams.has('_cb')).toBe(true); // cache-bust próprio do chunk-recovery, preservado
  });

  it('orçamento compartilhado JÁ esgotado (__bare=2 na URL, de outro mecanismo): recusa mesmo com contador próprio zerado', async () => {
    const { replace } = stubLocation(
      `https://www.promogifts.com.br/orcamentos?__bare=2&__bart=${Date.now() - 1_000}`,
    );

    const result = await attemptChunkRecovery(new Error('erro genérico sem URL extraível'));

    expect(result).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it('orçamento compartilhado esgotado mas FORA da janela de 20s: não bloqueia (reseta e permite)', async () => {
    const { replace } = stubLocation(
      `https://www.promogifts.com.br/orcamentos?__bare=2&__bart=${Date.now() - 25_000}`,
    );

    const result = await attemptChunkRecovery(new Error('erro genérico sem URL extraível'));

    expect(result).toBe(true);
    expect(replace).toHaveBeenCalledTimes(1);
    const u = new URL(replace.mock.calls[0][0] as string);
    expect(u.searchParams.get('__bare')).toBe('1');
  });
});
