// supabase/functions/mockup-assistant/index.ts
/**
 * Edge Function `mockup-assistant` — assistente "Matheus" (etapa 41): chat de
 * ORIENTAÇÃO com o contexto da tela (produto, técnica, dimensões, logo). Não
 * gera imagem e não registra o conteúdo do cliente.
 * Contrato: JWT (401); Zod (422); 20 msg/min por usuário no limiter SSOT (429);
 * modelo resolvido pelo roteador `_shared/ai-router` (rota DeepSeek Flash —
 * NUNCA Pro, por isso nenhum modelo é fixado aqui; resposta de outro modelo é
 * recusada com 502); falha do provedor ou resposta vazia → 502 genérico; cota
 * mensal de IA esgotada → 429; o texto do usuário nunca vai para o log. Deploy e o pin `verify_jwt`
 * em `supabase/config.toml` são ação do Joaquim, não desta função.
 */

import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';
import { z, parseBodyWithSchema } from '../_shared/zod-validate.ts';
import { applyRateLimit, rateLimiters } from '../_shared/rate-limiter.ts';
import { callAiForFunction } from '../_shared/ai-router/index.ts';
import { QuotaExceededError } from '../_shared/ai-usage.ts';
import { safeErrorFields } from '../_shared/log-safety.ts';
import { safeErrorResponse } from '../_shared/error-response.ts';
import { getOrCreateRequestId } from '../_shared/request-id.ts';

/** Nome da função no roteador de modelos (`v_ai_function_routing_effective`). */
export const AI_FUNCTION_NAME = 'mockup-assistant';

/** Mensagem genérica devolvida quando o provedor de IA falha. */
export const PROVIDER_ERROR_MESSAGE =
  'O assistente está indisponível no momento. Tente novamente em instantes.';

/** Cota mensal de IA do usuário esgotada (mesmo texto da edge expert-chat). */
export const QUOTA_ERROR_MESSAGE = 'Limite mensal de IA atingido. Contate o administrador.';

/** Política do dono: este chat usa SOMENTE o DeepSeek Flash, nunca o Pro. */
export function isFlashModel(name: unknown): boolean {
  return typeof name === 'string' && /flash/i.test(name);
}

/** Contexto da tela (opcional e limitado). */
const MockupContextSchema = z.object({
  productName: z.string().trim().max(200).optional(),
  techniqueName: z.string().trim().max(200).optional(),
  dimensions: z.string().trim().max(200).optional(),
  hasLogo: z.boolean().optional(),
});

export const MockupAssistantRequestSchema = z.object({
  message: z.string().trim().min(1, 'A mensagem não pode ser vazia').max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) }))
    .max(20)
    .optional(),
  context: MockupContextSchema.optional(),
});

export type MockupContext = z.infer<typeof MockupContextSchema>;
/** System prompt do Matheus. O contexto vai ao provedor, nunca ao log. */
export function buildSystemPrompt(context?: MockupContext): string {
  const lines = [
    'Você é o Matheus, especialista em aplicação de brindes personalizados.',
    'Sua função é ORIENTAR o vendedor: posicionamento, tamanho da logo, limites da técnica e legibilidade.',
    'Regras:',
    '- Responda em português do Brasil, tom consultivo e direto (no máximo 6 frases).',
    '- Você NÃO gera imagens: apenas orienta.',
    '- Não invente dimensões, regras ou limites que não estejam no contexto. Se faltar informação, diga o que falta.',
  ];
  if (context) {
    lines.push(
      'Contexto atual da tela:',
      `- Produto: ${context.productName ?? 'não informado'}`,
      `- Técnica: ${context.techniqueName ?? 'não informada'}`,
      `- Dimensões da área: ${context.dimensions ?? 'não informadas'}`,
      `- Logo enviada: ${context.hasLogo === true ? 'sim' : 'não informada'}`,
    );
  }
  return lines.join('\n');
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
  return new Response(JSON.stringify(body), { status, headers });
}

/** Handler da edge (exportado para os testes). Ordem: 401 → 429 → 422. */
export async function handleMockupAssistantRequest(
  req: Request,
  corsHeaders: Record<string, string>,
  requestId: string,
): Promise<Response> {
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, corsHeaders);

  // Erros de auth do _shared (401/403) sobem para o limite HTTP, que os traduz.
  const { userId } = await authenticateRequest(req);

  // Limite técnico: 20 mensagens/minuto por usuário (SSOT: rateLimiters.ai).
  const rateLimited = await applyRateLimit(req, rateLimiters.ai, () => userId);
  if (rateLimited) {
    const headers = new Headers(rateLimited.headers);
    for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
    return new Response(rateLimited.body, { status: rateLimited.status, headers });
  }

  const parsed = await parseBodyWithSchema(req, MockupAssistantRequestSchema, corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { message, history, context } = parsed.data;

  let result: Awaited<ReturnType<typeof callAiForFunction>>;
  try {
    result = await callAiForFunction({
      functionName: AI_FUNCTION_NAME,
      userId,
      requestId,
      request: {
        messages: [
          { role: 'system', content: buildSystemPrompt(context) },
          ...(history ?? []),
          { role: 'user', content: message },
        ],
        // Somente texto: o assistente orienta e nunca gera imagem.
        modalities: ['text'],
        temperature: 0.3,
        max_tokens: 500,
      },
    });
  } catch (err) {
    // Cota mensal do usuário (acquire_ai_quota no roteador): erro claro, não "indisponível".
    if (err instanceof QuotaExceededError) {
      console.warn('[mockup-assistant] quota_exceeded', { request_id: requestId });
      throw { status: 429, message: QUOTA_ERROR_MESSAGE };
    }
    // NÃO engole: relança como erro de borda (o limite HTTP traduz para 502 com
    // mensagem genérica). O erro cru do provedor pode ecoar o prompt do usuário,
    // então o log leva só nome/código/status — nunca o texto.
    const fields = safeErrorFields(err);
    console.warn('[mockup-assistant] provider_error', {
      request_id: requestId,
      error_name: fields.name,
      error_code: fields.code,
      error_status: fields.status,
    });
    throw { status: 502, message: PROVIDER_ERROR_MESSAGE };
  }

  // Defesa em profundidade da regra "só Flash": o modelo vem da linha de roteamento
  // (banco); se ela apontar para outro modelo, a resposta NÃO chega ao usuário.
  if (!isFlashModel(result.used_model_name)) {
    console.warn('[mockup-assistant] model_not_allowed', { request_id: requestId, model: result.used_model_name });
    throw { status: 502, message: PROVIDER_ERROR_MESSAGE };
  }

  // Resposta vazia (ex.: finish_reason "length") NÃO é sucesso: o chamador recebe erro, nunca `answer: ""`.
  if (typeof result.content !== 'string' || result.content.trim() === '') {
    console.warn('[mockup-assistant] empty_answer', {
      request_id: requestId,
      model: result.used_model_name,
      finish_reason: result.finish_reason,
    });
    throw { status: 502, message: PROVIDER_ERROR_MESSAGE };
  }

  // Log sem conteúdo do cliente: apenas metadados.
  console.log('[mockup-assistant] ai_ok', {
    request_id: requestId,
    answer_length: result.content.length,
    model: result.used_model_name,
  });

  return jsonResponse({ answer: result.content, model: result.used_model_name }, 200, corsHeaders);
}

/** Entrada HTTP: preflight, CORS, request-id e tradução dos erros de borda. */
export async function serveMockupAssistant(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  try {
    return await handleMockupAssistantRequest(req, corsHeaders, getOrCreateRequestId(req));
  } catch (err) {
    const http = err as { status?: number; message?: string };
    // Erro de borda (auth do _shared ou provedor indisponível): MOSTRA status e
    // mensagem ao chamador; o que não tem status é relançado.
    if (typeof http?.status !== 'number') throw err;
    return safeErrorResponse(err, {
      corsHeaders,
      status: http.status,
      requestId: getOrCreateRequestId(req),
      publicMessage: http.message,
    });
  }
}

Deno.serve(serveMockupAssistant);
