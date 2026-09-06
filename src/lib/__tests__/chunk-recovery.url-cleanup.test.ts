/**
 * chunk-recovery — limpeza de params técnicos de recovery na URL.
 *
 * Achado da auditoria (2026-09): __bare/__bart (boot guard de index.html e
 * sw-register.ts) e _cb (chunk-recovery.ts) nunca eram removidos da URL
 * após o app bootar com sucesso. Consequência: (1) qualquer navegação
 * futura para essa URL/bookmark faz o Service Worker tratar como "retry"
 * e furar o cache do edge Vercel permanentemente (ver indexRequestFor em
 * public/sw.js); (2) um link compartilhado dentro da janela de 20s nasce
 * "no cap" do contador de reload.
 *
 * Fix: `cleanRecoveryUrlParams()` remove esses params via
 * `history.replaceState` (sem navegar/recarregar) — chamada por
 * `markBootSuccessful()`, o hook de bootstrap já existente que confirma
 * boot bem-sucedido 5s após o mount (useAppBootstrap.ts).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanRecoveryUrlParams, markBootSuccessful } from '@/lib/chunk-recovery';

describe('cleanRecoveryUrlParams', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('remove __bare, __bart e _cb da URL preservando os demais params', () => {
    window.history.replaceState(
      null,
      '',
      '/carrinhos?status=draft&__bare=2&__bart=123&_cb=456&page=2',
    );

    cleanRecoveryUrlParams();

    const url = new URL(window.location.href);
    expect(url.searchParams.has('__bare')).toBe(false);
    expect(url.searchParams.has('__bart')).toBe(false);
    expect(url.searchParams.has('_cb')).toBe(false);
    expect(url.searchParams.get('status')).toBe('draft');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.pathname).toBe('/carrinhos');
  });

  it('não chama replaceState quando não há nenhum param de recovery na URL', () => {
    window.history.replaceState(null, '', '/carrinhos?status=draft');
    const spy = vi.spyOn(window.history, 'replaceState');

    cleanRecoveryUrlParams();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('remove só o(s) param(s) de recovery presentes, sem exigir todos os três', () => {
    window.history.replaceState(null, '', '/favoritos?__bare=1');

    cleanRecoveryUrlParams();

    const url = new URL(window.location.href);
    expect(url.searchParams.has('__bare')).toBe(false);
    expect(url.pathname).toBe('/favoritos');
  });
});

describe('markBootSuccessful — limpeza de URL agendada após boot confirmado', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
  });

  it('limpa __bare/__bart da URL 5s após o boot, sem navegar antes disso', () => {
    window.history.replaceState(null, '', '/carrinhos?__bare=1&__bart=999');

    markBootSuccessful();

    // Antes dos 5s: nada deve ter mudado ainda.
    vi.advanceTimersByTime(4_999);
    expect(new URL(window.location.href).searchParams.has('__bare')).toBe(true);

    // Aos 5s: limpo.
    vi.advanceTimersByTime(1);
    const url = new URL(window.location.href);
    expect(url.searchParams.has('__bare')).toBe(false);
    expect(url.searchParams.has('__bart')).toBe(false);
    expect(url.pathname).toBe('/carrinhos');
  });
});
