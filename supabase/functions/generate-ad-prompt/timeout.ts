/**
 * Tempo limite do provedor para a edge `generate-ad-prompt` (E-14 /
 * BUG-MAGICUP-TIMEOUT-1).
 *
 * Fica num módulo puro (sem `Deno.serve`/`npm:`) para ser testável no runner
 * Vitest do portão: `index.ts` importa estes símbolos e os usa na chamada ao
 * provedor e no `catch`.
 */

// O generate-ad-image já roda com 60 s no cliente (`timeoutMs: 60_000` em
// `src/hooks/intelligence/useMagicUpGeneration.ts`), justamente porque a
// geração no provedor demora mais que o default de 10 s do invokeEdge. Esta é a
// edge irmã dele no Magic Up: usamos o MESMO teto para prompts longos não
// estourarem antes da resposta.
export const AI_PROVIDER_TIMEOUT_MS = 60_000;

// Código estável devolvido no corpo quando o provedor estoura o tempo limite.
// O cliente usa `code` para diferenciar timeout de erro genérico, sem nunca
// receber stack trace nem a mensagem crua do adapter.
export const TIMEOUT_ERROR_CODE = "timeout";

/**
 * `true` quando o erro é um estouro do tempo limite do provedor:
 * AbortError/TimeoutError (AbortController do ai-usage/ai-router) ou a
 * mensagem "Timeout após Xms" do adapter. Qualquer um é estouro.
 */
export function isProviderTimeoutError(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  if (name === "AbortError" || name === "TimeoutError") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /timeout|timed out|tempo limite/i.test(message);
}
