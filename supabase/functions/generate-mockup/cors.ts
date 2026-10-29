// supabase/functions/generate-mockup/cors.ts
//
// CORS de generate-mockup — C-10 (auditoria de segurança).
//
// Defeito: `_shared/cors.ts` reflete QUALQUER subdomínio `*.vercel.app` /
// `*.lovable.app` (ALLOWED_ORIGIN_PATTERNS). Como são plataformas públicas,
// qualquer projeto de terceiros hospedado nelas conseguiria chamar a edge
// generate-mockup com o JWT de um usuário logado do Promo Brindes.
//
// Correção: generate-mockup só reflete as origens first-party do projeto — a
// MESMA lista exata de `EXACT_ALLOWED_ORIGINS` de `_shared/cors.ts` (SSOT da
// lista; aqui espelhada porque o símbolo não é exportado lá). Os padrões de
// plataforma pública são ignorados. Origem fora da lista cai no fallback de
// produção, exatamente como o helper compartilhado já faz para origens
// desconhecidas (BUG-07): o navegador recusa a resposta porque o
// `Access-Control-Allow-Origin` não bate com a origem da requisição.
//
// Este módulo NÃO usa APIs do Deno, então pode ser importado por testes que
// rodam sob Node/vitest (index.ts, por ter `Deno.serve` no topo e importar
// `npm:@supabase/supabase-js`, não é importável fora do runtime Deno).
import { getCorsHeaders } from "../_shared/cors.ts";

/** Origens first-party do projeto (espelha EXACT_ALLOWED_ORIGINS de _shared). */
export const PROJECT_ALLOWED_ORIGINS = new Set<string>([
  // BUG-08 FIX: a origem do projeto Supabase ANTIGO (proibido) NÃO entra aqui.
  "https://criar-together-now.lovable.app",
  "https://id-preview--1be35a65-1f65-4c2b-9a79-7d563930aacd.lovable.app",
  "https://1be35a65-1f65-4c2b-9a79-7d563930aacd.lovableproject.com",
  "https://promogifts.com.br",
  "https://www.promogifts.com.br",
  "https://promogifts.atomicabr.com.br",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:3000",
]);

// Fallback para origens desconhecidas — mesma constante de getBestAllowedOrigin()
// em _shared/cors.ts.
export const CORS_FALLBACK_ORIGIN = "https://www.promogifts.com.br";

/**
 * Reflete a origem SOMENTE se for uma origem first-party do projeto. Qualquer
 * outra origem (inclui qualquer `*.vercel.app` / `*.lovable.app`) recebe o
 * fallback de produção e nunca é refletida de volta ao chamador.
 */
export function resolveAllowedOrigin(origin: string | null | undefined): string {
  return origin && PROJECT_ALLOWED_ORIGINS.has(origin) ? origin : CORS_FALLBACK_ORIGIN;
}

/**
 * CORS de generate-mockup: mantém os headers compartilhados (allow-headers,
 * métodos, headers de segurança) de `_shared/cors.ts`, mas a origem refletida
 * sai só da lista do projeto. Substitui o `getCorsHeaders(req)` cru, cuja
 * ALLOWED_ORIGIN_PATTERNS liberaria qualquer plataforma pública.
 */
export function getMockupCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || req.headers.get("Origin") || null;
  return {
    ...getCorsHeaders(req),
    "Access-Control-Allow-Origin": resolveAllowedOrigin(origin),
  };
}
