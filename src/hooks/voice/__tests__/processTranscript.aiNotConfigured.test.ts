/**
 * Regressão — voice-agent sem LOVABLE_API_KEY.
 *
 * Contrato: a edge retorna 503 `ai_not_configured` (nunca 500 com mensagem
 * técnica). O cliente deve degradar para uma resposta falada amigável em
 * PT-BR, sem lançar exceção (evita tela branca via ErrorBoundary).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'anon-key',
}));

import { processVoiceTranscript } from '../processTranscript';

const originalFetch = globalThis.fetch;

describe('processVoiceTranscript — IA não configurada', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('degrada para resposta amigável em 503 ai_not_configured', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'ai_not_configured', function: 'voice-agent' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;

    const result = await processVoiceTranscript('quanto vendi hoje?');

    expect(result.action).toBe('answer');
    expect(result.response).toMatch(/indisponível/i);
    expect(result.response).not.toMatch(/LOVABLE_API_KEY|Error|500/);
  });

  it('continua lançando em falhas genuínas (500)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'AI processing failed' }), { status: 500 }),
      ) as unknown as typeof fetch;

    await expect(processVoiceTranscript('oi')).rejects.toThrow(/AI processing failed/);
  });
});
