/**
 * CORS da edge `generate-mockup` — item de auditoria C-10.
 *
 * Prova o critério do cartão:
 *  - a origem do domínio do app PASSA (é refletida no Access-Control-Allow-Origin);
 *  - um `*.vercel.app` qualquer é RECUSADO (nunca refletido);
 *  - o preflight (OPTIONS) só reflete origens da lista do projeto.
 *
 * Roda no Vitest (a prova do portão). Importa o módulo puro
 * `generate-mockup/cors.ts` porque `index.ts` não é importável fora do runtime
 * Deno (`Deno.serve` no topo + import `npm:@supabase/supabase-js`).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CORS_FALLBACK_ORIGIN,
  getMockupCorsHeaders,
  PROJECT_ALLOWED_ORIGINS,
  resolveAllowedOrigin,
} from "../../supabase/functions/generate-mockup/cors.ts";

const ACAO = "Access-Control-Allow-Origin";
const APP_ORIGIN = "https://www.promogifts.com.br";

// Requisição duck-typed: getCorsHeaders() só usa req.method e req.headers.get().
function makeReq(origin: string | null, method = "OPTIONS"): Request {
  const headers = new Map<string, string>();
  if (origin !== null) headers.set("origin", origin);
  return { method, headers } as unknown as Request;
}

describe("CORS generate-mockup — origens do projeto", () => {
  it("reflete a origem do domínio do app (e localhost de dev)", () => {
    for (const origin of [
      "https://www.promogifts.com.br",
      "https://promogifts.com.br",
      "https://promogifts.atomicabr.com.br",
      "http://localhost:5173",
    ]) {
      expect(resolveAllowedOrigin(origin)).toBe(origin);
      expect(getMockupCorsHeaders(makeReq(origin))[ACAO]).toBe(origin);
    }
  });

  it("recusa QUALQUER *.vercel.app (nunca refletido)", () => {
    for (const origin of [
      "https://qualquer-projeto-de-terceiros.vercel.app",
      "https://promo-gifts-beta.vercel.app",
      "https://atacante-juca1.vercel.app",
    ]) {
      expect(resolveAllowedOrigin(origin)).not.toBe(origin);
      expect(resolveAllowedOrigin(origin)).toBe(CORS_FALLBACK_ORIGIN);
      expect(getMockupCorsHeaders(makeReq(origin))[ACAO]).not.toBe(origin);
    }
  });

  it("recusa outros subdomínios de plataforma pública (*.lovable.app)", () => {
    for (const origin of [
      "https://outro-tenant-qualquer.lovable.app",
      "https://qualquer-coisa.lovableproject.com",
    ]) {
      expect(getMockupCorsHeaders(makeReq(origin))[ACAO]).not.toBe(origin);
    }
  });

  it("preflight (OPTIONS) só reflete origens da lista", () => {
    expect(getMockupCorsHeaders(makeReq(APP_ORIGIN))[ACAO]).toBe(APP_ORIGIN);
    expect(getMockupCorsHeaders(makeReq("https://projeto-malicioso.vercel.app"))[ACAO]).toBe(
      CORS_FALLBACK_ORIGIN,
    );
  });

  it("mantém os headers compartilhados e não reflete origem ausente", () => {
    const h = getMockupCorsHeaders(makeReq(APP_ORIGIN));
    expect(h["Access-Control-Allow-Methods"]).toContain("POST");
    expect(h["Access-Control-Allow-Headers"].toLowerCase()).toContain("authorization");
    // Chamador server-side sem Origin → fallback de produção, nunca string vazia.
    expect(getMockupCorsHeaders(makeReq(null))[ACAO]).toBe(CORS_FALLBACK_ORIGIN);
    expect(resolveAllowedOrigin("")).toBe(CORS_FALLBACK_ORIGIN);
  });

  // Guarda anti-drift: a lista é espelhada de `_shared/cors.ts` (o símbolo
  // EXACT_ALLOWED_ORIGINS não é exportado). Se alguém adicionar/remover uma
  // origem no SSOT sem atualizar o espelho, este teste falha — evita que a edge
  // passe a recusar uma origem legítima (ou aceitar uma indevida) em silêncio.
  it("o espelho está em sincronia com EXACT_ALLOWED_ORIGINS de _shared/cors.ts", () => {
    const srcSsot = readFileSync(
      path.resolve(process.cwd(), "supabase/functions/_shared/cors.ts"),
      "utf8",
    );
    const anchor = srcSsot.indexOf("EXACT_ALLOWED_ORIGINS = new Set([");
    expect(anchor, "não achei EXACT_ALLOWED_ORIGINS em _shared/cors.ts").toBeGreaterThan(-1);
    const body = srcSsot.slice(anchor).slice(0, srcSsot.slice(anchor).indexOf("]);"));
    const fromSsot = [...body.matchAll(/'([^'\n]+)'/g)].map((m) => m[1]);
    expect(fromSsot.length).toBeGreaterThan(0);
    expect([...PROJECT_ALLOWED_ORIGINS].sort()).toEqual([...new Set(fromSsot)].sort());
  });
});
