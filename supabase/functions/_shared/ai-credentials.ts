// supabase/functions/_shared/ai-credentials.ts
// SSOT para resolução da credencial de IA (LOVABLE_API_KEY) em edge functions.
//
// Problema que este módulo resolve
// --------------------------------
// Várias edges liam `Deno.env.get('LOVABLE_API_KEY')` direto e, quando a chave
// não estava provisionada no projeto onde a função roda, faziam `throw`.
// O `throw` virava HTTP 500 com a mensagem técnica vazando para o cliente
// ("LOVABLE_API_KEY is not configured") e, em algumas telas, tela branca.
//
// Contrato canônico (aplicado por scripts/simulate-ai-key-scenarios.mjs):
//   - resolução DB-first (integration_credentials via resolveCredential) com
//     fallback para variável de ambiente — nunca só `Deno.env.get`;
//   - chave ausente/vazia/só-espaços => HTTP 503 + body estável
//     `{ error: "ai_not_configured", message, function }`;
//   - NUNCA `throw` para chave ausente (isso é estado de configuração
//     esperado, não exceção);
//   - a mensagem pública é amigável e em PT-BR; o detalhe técnico só vai
//     para o log do servidor.

import { resolveCredential, type CredentialSource } from "./credentials.ts";

/** Código de erro estável consumido pelo front-end. */
export const AI_NOT_CONFIGURED_CODE = "ai_not_configured" as const;

/** Status HTTP canônico para "IA não configurada" (indisponibilidade, não erro do cliente). */
export const AI_NOT_CONFIGURED_STATUS = 503;

/** Mensagem pública padrão (PT-BR, sem detalhe técnico). */
export const AI_NOT_CONFIGURED_MESSAGE =
  "Recurso de IA indisponível no momento. Tente novamente mais tarde.";

/** Nome canônico da credencial de IA. */
export const AI_CREDENTIAL_NAME = "LOVABLE_API_KEY";

export interface AiKeyResolution {
  /** Chave normalizada (trim) ou `null` quando ausente/vazia. */
  apiKey: string | null;
  /** Origem da resolução: `db`, `env` ou `none`. */
  source: CredentialSource;
  /** `true` quando a chave é utilizável. */
  configured: boolean;
}

/**
 * Normaliza um valor bruto de credencial.
 * Trata `undefined`, `null`, string vazia e string só com espaços como ausente.
 * Função pura — exercitada por centenas de cenários na simulação.
 */
export function normalizeApiKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolve a credencial de IA respeitando o SSOT (DB → env).
 * Nunca lança: falhas de resolução degradam para `configured: false`.
 */
export async function resolveAiApiKey(functionName: string): Promise<AiKeyResolution> {
  try {
    const { value, source } = await resolveCredential(AI_CREDENTIAL_NAME);
    const apiKey = normalizeApiKey(value);
    if (apiKey) return { apiKey, source, configured: true };
  } catch (err) {
    console.error(
      `[${functionName}] falha ao resolver ${AI_CREDENTIAL_NAME} via SSOT:`,
      err instanceof Error ? err.message : String(err),
    );
  }

  // Fallback defensivo: se o SSOT falhou (DB fora), ainda tentamos o env.
  const fromEnv = normalizeApiKey(Deno.env.get(AI_CREDENTIAL_NAME));
  if (fromEnv) return { apiKey: fromEnv, source: "env", configured: true };

  return { apiKey: null, source: "none", configured: false };
}

/**
 * Resposta canônica 503 para "IA não configurada".
 * Sempre inclui os headers de CORS recebidos.
 */
export function aiNotConfiguredResponse(
  corsHeaders: Record<string, string>,
  functionName: string,
  publicMessage: string = AI_NOT_CONFIGURED_MESSAGE,
): Response {
  console.error(
    `[${functionName}] ${AI_CREDENTIAL_NAME} ausente — configure em /admin/conexoes (AI Models) ou nos secrets do projeto.`,
  );
  return new Response(
    JSON.stringify({
      error: AI_NOT_CONFIGURED_CODE,
      message: publicMessage,
      function: functionName,
    }),
    {
      status: AI_NOT_CONFIGURED_STATUS,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Açúcar sintático: resolve a chave e, se ausente, já devolve a resposta 503.
 *
 * @example
 *   const ai = await requireAiApiKey('voice-agent', corsHeaders);
 *   if (!ai.apiKey) return ai.response!;
 */
export async function requireAiApiKey(
  functionName: string,
  corsHeaders: Record<string, string>,
  publicMessage?: string,
): Promise<AiKeyResolution & { response: Response | null }> {
  const resolution = await resolveAiApiKey(functionName);
  return {
    ...resolution,
    response: resolution.apiKey
      ? null
      : aiNotConfiguredResponse(corsHeaders, functionName, publicMessage),
  };
}
