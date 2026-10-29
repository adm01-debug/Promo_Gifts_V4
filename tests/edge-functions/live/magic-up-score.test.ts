/**
 * Integração LIVE — magic-up-score
 * --------------------------------------------------------------------------
 * E-15: antes este arquivo era um shim vazio. Ele só chamava
 * `runLiveSuite(descriptorFor("magic-up-score"))` e, como não existe descritor
 * próprio em descriptors.ts, o happy-path NUNCA exercitava a função — o teste
 * não provava nada.
 *
 * Agora, além da suíte uniforme de fronteira (CORS/auth/validação), o arquivo
 * faz a CHAMADA REAL: envia uma imagem sintética (PNG 1x1 em data URL) para a
 * Edge Function e valida o diagnóstico devolvido pela IA (total, critérios,
 * `source: 'ai'`).
 *
 * A chamada real depende das variáveis de ambiente de teste:
 *   - URL + anon key reais (LIVE, de _live-client.ts);
 *   - credencial E2E do papel `authenticated` (E2E_USER_EMAIL/PASSWORD);
 *   - EDGE_LIVE_COSTLY=1 — a análise consome créditos de IA (mesmo gate usado
 *     pelas demais happy-paths caras, ex.: `generate-ad-image`).
 * Faltando qualquer uma, o teste se marca como IGNORADO com o motivo explícito
 * — nunca passa em silêncio.
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runLiveSuite } from "./_live-suite";
import { descriptorFor } from "./descriptors";
import { ALLOW_COSTLY, LIVE, callEdge, getJwt } from "./_live-client";

// Suíte uniforme (CORS + fronteira de auth + inputs malformados). Mantida
// porque o gate `check:edge-live-coverage` exige `runLiveSuite(` no arquivo.
runLiveSuite(descriptorFor("magic-up-score"));

/** Imagem sintética (PNG 1x1) — determinística, sem rede nem asset externo. */
const SYNTHETIC_IMAGE_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

// Contrato da resposta 200 espelhado de supabase/functions/magic-up-score/index.ts
// (DiagnosisSchema + `source: 'ai'`).
const criterionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  weight: z.number().min(1).max(5),
  recommendation: z.string().min(1),
});

const diagnosisSchema = z
  .object({
    total: z.number().min(0).max(100),
    label: z.string().min(1),
    summary: z.string().min(1),
    criteria: z.array(criterionSchema).min(4).max(10),
    strengths: z.array(z.string()),
    risks: z.array(z.string()),
    recommendations: z.array(z.string()),
    source: z.literal("ai"),
  })
  .passthrough();

describe("[live] magic-up-score — chamada real com imagem sintética", () => {
  it(
    "avalia a imagem sintética e devolve o diagnóstico (source:'ai')",
    async (ctx) => {
      if (!LIVE) {
        ctx.skip(
          "sem SUPABASE_URL/anon key de teste reais (LIVE=false) — não há função para chamar",
        );
      }
      if (!ALLOW_COSTLY) {
        ctx.skip(
          "EDGE_LIVE_COSTLY!=1 — a análise consome créditos de IA; só dispara com a flag explícita",
        );
      }
      const jwt = await getJwt("authenticated");
      if (!jwt) {
        ctx.skip(
          "sem credencial E2E_USER_EMAIL/E2E_USER_PASSWORD — não há JWT para o papel authenticated",
        );
      }

      const res = await callEdge("magic-up-score", {
        role: "authenticated",
        body: {
          imageUrl: SYNTHETIC_IMAGE_URL,
          productName: "Caneca personalizada (teste live)",
          channel: "instagram",
          aspectRatio: "1:1",
        },
      });

      expect(res.status, `status inesperado ${res.status}: ${res.text.slice(0, 200)}`).toBe(200);

      const parsed = diagnosisSchema.safeParse(res.json);
      expect(parsed.success, `shape inválido: ${JSON.stringify(res.json).slice(0, 300)}`).toBe(true);
    },
    30_000,
  );
});
