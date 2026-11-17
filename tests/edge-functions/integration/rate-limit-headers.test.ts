/**
 * Headers do 429 do limiter SSOT — contra o `applyRateLimit` REAL.
 *
 * Por que existe: `supabase/functions/_shared/rate-limiter.ts:122-128` responde 429 com
 * `X-RateLimit-Limit`, `-Remaining`, `-Reset` e `Retry-After`. São esses headers que
 * permitem a tela dizer "tente de novo em 1 minuto" em vez de só "deu erro" — e
 * `git grep -ln "X-RateLimit-Limit" -- tests` não devolvia nada: nada impedia que fossem
 * removidos sem ninguém notar.
 *
 * Os testes de contrato das edges (ex.: tests/edge-functions/integration/mockup-assistant.test.ts)
 * MOCKAM o `applyRateLimit`, então asserir os headers lá provaria o mock. Aqui o alvo é a
 * função de verdade, com um limiter falso só no lugar da consulta ao banco.
 *
 * Resgatado de importado/vps-fabrica/v2/s44-2610081949 (a branch assertava os headers no
 * arquivo da borda simulada, que não existe mais).
 */
import { describe, expect, it } from 'vitest';

import { applyRateLimit } from '../../../supabase/functions/_shared/rate-limiter.ts';

const MAX_REQUESTS = 20;
const JANELA_MS = 60_000;

/**
 * Limiter com a mesma superfície que `applyRateLimit` usa: `check()` e `['config']`.
 * Não toca banco — o que está sob teste é a resposta HTTP, não a contagem.
 */
function limiterFalso(allowed: boolean, remaining = 0) {
  return {
    config: { maxRequests: MAX_REQUESTS, windowMs: JANELA_MS, keyPrefix: 'ai' },
    check: () =>
      Promise.resolve({
        allowed,
        remaining,
        resetAt: Date.now() + JANELA_MS,
        suspicious: false,
      }),
  } as unknown as Parameters<typeof applyRateLimit>[1];
}

const req = () =>
  new Request('https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/mockup-assistant', {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.7' },
  });

describe('applyRateLimit — contrato do 429', () => {
  it('estourado: 429 com X-RateLimit-Limit, -Remaining, -Reset e Retry-After', async () => {
    const res = await applyRateLimit(req(), limiterFalso(false));

    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);

    // O teto que a tela mostra ao usuário.
    expect(res!.headers.get('X-RateLimit-Limit')).toBe(String(MAX_REQUESTS));
    expect(res!.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res!.headers.get('X-RateLimit-Reset')).toMatch(/^\d+$/);

    // Retry-After é o que permite dizer "tente de novo em N segundos".
    const retry = Number(res!.headers.get('Retry-After'));
    expect(Number.isFinite(retry)).toBe(true);
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(Math.ceil(JANELA_MS / 1000));

    expect(res!.headers.get('Content-Type')).toContain('application/json');
  });

  it('estourado: o corpo diz quanto sobrou e quando libera, sem vazar identificador', async () => {
    const res = await applyRateLimit(req(), limiterFalso(false));
    const corpo = (await res!.json()) as Record<string, unknown>;

    expect(corpo.error).toBe('Too Many Requests');
    expect(corpo.remaining).toBe(0);
    expect(typeof corpo.resetAt).toBe('string');
    expect(Number.isNaN(Date.parse(String(corpo.resetAt)))).toBe(false);

    // O IP/identificador do chamador não pode voltar na resposta.
    expect(JSON.stringify(corpo)).not.toContain('203.0.113.7');
  });

  it('dentro do limite: devolve null e deixa a edge seguir', async () => {
    const res = await applyRateLimit(req(), limiterFalso(true, 19));

    expect(res).toBeNull();
  });
});
