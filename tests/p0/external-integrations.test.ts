/**
 * P0 — Integrações externas (CRM Promobrind, Cloudflare Stream, ElevenLabs, Lovable AI).
 *
 * Cobertura: degradação graceful, fallback, ausência de chave, latência alta.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mockEdgeFunctionFetch,
  resetExternalMocks,
  crmDbBridgeOffline,
  crmDbBridgeStale,
  cloudflareStreamDown,
} from "./_mocks";

describe("P0 — Integrações externas", () => {
  beforeEach(() => {
    mockEdgeFunctionFetch({});
  });
  afterEach(() => resetExternalMocks());

  // ─── CRM externo (Promobrind via external-db-bridge) ──────────────────
  it.todo("catálogo: serve cache local quando DB externo offline", async () => {
    // TODO(P0): hook useProducts deve mostrar banner "modo degradado".
    mockEdgeFunctionFetch({ "/external-db-bridge": crmDbBridgeOffline });
  });

  it.skip("catálogo: indica idade do cache quando dados `stale: true`", async () => {
    mockEdgeFunctionFetch({ "/external-db-bridge": crmDbBridgeStale });
    // TODO(P0): UI deve renderizar selo "Atualizado há Xd" do mem://features/price-freshness-indicator.
  });

  it.skip("CNPJ lookup: timeout 10s não trava form de cadastro");

  // ─── Cloudflare Stream ────────────────────────────────────────────────
  it.todo("vídeo de produto: fallback para imagem quando Cloudflare 530", async () => {
    mockEdgeFunctionFetch({ "videodelivery.net": cloudflareStreamDown });
    // TODO(P0): VideoPlayer deve esconder player e exibir hero image.
  });

  // ─── ElevenLabs (TTS / Scribe) ────────────────────────────────────────
  it.skip("elevenlabs-tts: 402 (insufficient credits) não quebra Flow chat");

  // ─── Lovable AI Gateway ───────────────────────────────────────────────
  it.todo("lovable-ai: rate-limit 429 mostra mensagem amigável e desabilita botão");

  it.todo("lovable-ai: 402 (workspace sem crédito) sugere upgrade sem expor billing");

  // ─── Connections Hub auto-test ────────────────────────────────────────
  it.todo("connections-auto-test: marca conexão como degraded quando latência > 5s");
});
