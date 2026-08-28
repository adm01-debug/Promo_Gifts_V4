/**
 * Cobertura de "Voltar" do MfaChallengeDialog em cenários de deep link e
 * histórico/referrer curto.
 *
 * Invariantes validados:
 *  1. Nunca retorna rota gated por AAL2 (/admin, /dev) nem rota de auth.
 *  2. Nunca retorna a própria rota bloqueada (loop de redirect no guard).
 *  3. Deep link sem rota lembrada → fallback "/" (destino autenticado seguro).
 *  4. Escopo por usuário: rota de outra conta nunca vaza.
 *  5. Idempotência: chamadas repetidas devolvem o mesmo destino (sem loop).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  rememberLastInternalRoute,
  getLastInternalRoute,
  clearLastInternalRoute,
  resolveSafeReturnPath,
  isSafeReturnPath,
} from '../lastInternalRoute';

const USER = 'user-1';
const OTHER = 'user-2';

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('isSafeReturnPath', () => {
  const unsafe = [
    '/admin',
    '/admin/usuarios',
    '/admin/telemetria?tab=edge',
    '/dev',
    '/dev/status',
    '/auth',
    '/auth/callback',
    '/login',
    '/logout',
    '/reset-password',
  ];
  it.each(unsafe)('rejeita rota gated/auth: %s', (path) => {
    expect(isSafeReturnPath(path)).toBe(false);
  });

  const safe = [
    '/',
    '/catalogo',
    '/catalogo?cor=azul',
    '/produto/abc-123',
    '/orcamentos/42',
    '/estoque',
    '/administrativo', // prefixo parecido, mas NÃO é /admin/*
    '/development-kit', // prefixo parecido, mas NÃO é /dev/*
  ];
  it.each(safe)('aceita rota interna segura: %s', (path) => {
    expect(isSafeReturnPath(path)).toBe(true);
  });

  it('rejeita valores não-path (absoluto externo, vazio, null)', () => {
    expect(isSafeReturnPath('https://evil.example/admin')).toBe(false);
    expect(isSafeReturnPath('')).toBe(false);
    expect(isSafeReturnPath(null)).toBe(false);
    expect(isSafeReturnPath(undefined)).toBe(false);
  });
});

describe('rememberLastInternalRoute — filtro de escrita', () => {
  it('não grava rota gated (evita "Voltar" reabrindo o challenge)', () => {
    rememberLastInternalRoute(USER, '/admin/usuarios');
    rememberLastInternalRoute(USER, '/dev/status');
    expect(getLastInternalRoute(USER)).toBeNull();
  });

  it('grava rota segura com query e hash', () => {
    rememberLastInternalRoute(USER, '/catalogo?cor=azul#top');
    expect(getLastInternalRoute(USER)).toBe('/catalogo?cor=azul#top');
  });

  it('não vaza entre usuários', () => {
    rememberLastInternalRoute(USER, '/catalogo');
    expect(getLastInternalRoute(OTHER)).toBeNull();
    expect(resolveSafeReturnPath(OTHER, '/admin/usuarios')).toBe('/');
  });
});

describe('resolveSafeReturnPath — deep link / referrer curto', () => {
  it('deep link direto em /admin sem rota lembrada → "/"', () => {
    expect(resolveSafeReturnPath(USER, '/admin/usuarios')).toBe('/');
  });

  it('deep link direto em /dev sem rota lembrada → "/"', () => {
    expect(resolveSafeReturnPath(USER, '/dev/status')).toBe('/');
  });

  it('nova aba (sem userId resolvido) → "/"', () => {
    expect(resolveSafeReturnPath(null, '/dev/status')).toBe('/');
    expect(resolveSafeReturnPath(undefined, '/admin')).toBe('/');
  });

  it('histórico curto com rota lembrada → volta exatamente para ela', () => {
    rememberLastInternalRoute(USER, '/orcamentos/42');
    expect(resolveSafeReturnPath(USER, '/dev/telemetria')).toBe('/orcamentos/42');
  });

  it('rota lembrada igual à rota bloqueada → "/" (quebra loop)', () => {
    // Cenário defensivo: storage corrompido/manual com a própria rota gated.
    window.sessionStorage.setItem(`mfa-last-internal-route:${USER}`, '/admin/usuarios');
    expect(resolveSafeReturnPath(USER, '/admin/usuarios')).toBe('/');
  });

  it('rota lembrada com query da própria rota bloqueada → "/"', () => {
    window.sessionStorage.setItem(`mfa-last-internal-route:${USER}`, '/dev/status?tab=1');
    expect(resolveSafeReturnPath(USER, '/dev/status')).toBe('/');
  });

  it('storage com valor gated (injeção manual) é ignorado na leitura', () => {
    window.sessionStorage.setItem(`mfa-last-internal-route:${USER}`, '/admin/secrets');
    expect(getLastInternalRoute(USER)).toBeNull();
    expect(resolveSafeReturnPath(USER, '/dev/status')).toBe('/');
  });

  it('storage com URL absoluta externa é ignorado (open redirect)', () => {
    window.sessionStorage.setItem(`mfa-last-internal-route:${USER}`, 'https://evil.example/');
    expect(resolveSafeReturnPath(USER, '/admin')).toBe('/');
  });

  it('é idempotente — chamadas repetidas dão o mesmo destino', () => {
    rememberLastInternalRoute(USER, '/estoque');
    const first = resolveSafeReturnPath(USER, '/admin/usuarios');
    const second = resolveSafeReturnPath(USER, '/admin/usuarios');
    expect(first).toBe('/estoque');
    expect(second).toBe(first);
  });

  it('após clear, volta ao fallback seguro', () => {
    rememberLastInternalRoute(USER, '/estoque');
    clearLastInternalRoute(USER);
    expect(resolveSafeReturnPath(USER, '/admin/usuarios')).toBe('/');
  });
});

describe('sequências de navegação (simulação de stack)', () => {
  it('trilha segura → deep link admin: retorna à última segura, não à anterior', () => {
    for (const p of ['/', '/catalogo', '/produto/abc']) rememberLastInternalRoute(USER, p);
    rememberLastInternalRoute(USER, '/admin/usuarios'); // ignorada
    expect(resolveSafeReturnPath(USER, '/admin/usuarios')).toBe('/produto/abc');
  });

  it('admin → dev sem rota segura no meio: destino permanece "/" (nunca /admin)', () => {
    rememberLastInternalRoute(USER, '/admin/usuarios');
    rememberLastInternalRoute(USER, '/dev/status');
    const dest = resolveSafeReturnPath(USER, '/dev/status');
    expect(dest).toBe('/');
    expect(isSafeReturnPath(dest)).toBe(true);
  });

  it('destino resolvido é sempre seguro em 500 combinações aleatórias', () => {
    const paths = [
      '/',
      '/catalogo',
      '/admin',
      '/admin/usuarios',
      '/dev',
      '/dev/status',
      '/auth',
      '/login',
      '/produto/1',
      '/orcamentos/9?x=1',
      'https://evil.example/',
      '',
    ];
    for (let i = 0; i < 500; i++) {
      window.sessionStorage.clear();
      const remembered = paths[Math.floor(Math.random() * paths.length)];
      const current = paths[Math.floor(Math.random() * paths.length)];
      // metade grava via API (com filtro), metade injeta cru no storage
      if (i % 2 === 0) rememberLastInternalRoute(USER, remembered);
      else window.sessionStorage.setItem(`mfa-last-internal-route:${USER}`, remembered);

      const dest = resolveSafeReturnPath(USER, current);
      expect(isSafeReturnPath(dest)).toBe(true);
      expect(dest === current && current !== '/').toBe(false);
    }
  });
});
