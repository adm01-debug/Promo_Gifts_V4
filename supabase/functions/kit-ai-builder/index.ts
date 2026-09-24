import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest, requireRole, authErrorResponse } from '../_shared/auth.ts';
import { parseContract } from '../_shared/contracts/index.ts';
import {
  KitAiBuilderSchemas,
  KitAiBuilderSuggestion,
  truncateKitAiBuilderPresentationFields,
} from '../_shared/contracts/schemas/kit-ai-builder.ts';
import { safeErrorFields } from '../_shared/log-safety.ts';
import { requireAiApiKey } from '../_shared/ai-credentials.ts';
import { fetchWithBreaker, CircuitOpenError, circuitOpenResponse } from '../_shared/external-fetch.ts';
import { logAiUsage, extractTokensFromResponse } from '../_shared/ai-usage.ts';
// ============================================================
// EDGE FUNCTION: kit-ai-builder
// Recebe um prompt natural e devolve uma sugestão estruturada de kit
// (box keywords, item keywords, kit_type, justificativa).
// Usa Lovable AI Gateway com tool-calling para JSON estrito.
// ============================================================

const MODEL = 'google/gemini-2.5-flash';

interface RequestBody {
  prompt?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);
  // Auth: exige vendedor autenticado (agente ou acima)
  let authCtx: Awaited<ReturnType<typeof authenticateRequest>>;
  try {
    authCtx = await authenticateRequest(req);
    requireRole(authCtx, 'agente');
  } catch (authErr) {
    return authErrorResponse(authErr, corsHeaders);
  }

  // Telemetria (etapa 18): tokens, latência e status por chamada de IA —
  // mesma tabela ai_usage_logs que já alimenta o painel em AiModelsTab.tsx.
  // Só registra chamadas que de fato saíram para o gateway (após a chave
  // resolvida); falha de auth/contrato/chave ausente não consome IA.
  const startMs = Date.now();
  // Sem timeout próprio, um gateway travado prende a function até o isolate
  // ser matado pela plataforma — mesma classe de bug já corrigida em
  // callAiWithTracking (ai-usage.ts) para o path legacy. Declarado aqui (não
  // dentro do try) para ficar acessível também no catch, que precisa
  // distinguir AbortError (timeout) de qualquer outra exceção.
  const aiTimeoutMs = 20_000;
  const logCall = (params: {
    status: 'success' | 'error';
    inputTokens?: number;
    outputTokens?: number;
    errorMessage?: string;
  }) =>
    logAiUsage({
      userId: authCtx.userId,
      functionName: 'kit-ai-builder',
      model: MODEL,
      durationMs: Date.now() - startMs,
      ...params,
    });

  try {
    const contractResult = await parseContract(req, KitAiBuilderSchemas, {
      corsHeaders,
    });
    if (!contractResult.ok) return contractResult.response;
    const { data: body, responseHeaders } = contractResult;
    const prompt = body.prompt.trim();

    const ai = await requireAiApiKey(
      'kit-ai-builder',
      corsHeaders,
      'Montagem de kit por IA indisponível no momento. Tente novamente mais tarde.',
    );
    if (!ai.apiKey) return ai.response!;
    const LOVABLE_API_KEY = ai.apiKey;

    const systemPrompt = `Você é especialista em montagem de kits corporativos de brindes promocionais brasileiros.
Receba a descrição do cliente e devolva sugestões objetivas de:
- kit_type: "montado" (caixa premium), "original" (embalagem do fornecedor) ou "simples" (sem caixa especial).
- box_keywords: até 4 palavras-chave para busca da caixa (ex.: "premium", "kraft", "térmica").
- item_keywords: 3 a 6 categorias/produtos sugeridos (ex.: "garrafa térmica", "caderno", "caneta metal").
- target_price_brl: faixa de preço/kit estimada em reais (mínimo, máximo).
- narrative: 1 frase vendedora explicando o conceito.
- title: nome curto e vendável para o kit (ex.: "Kit Onboarding Bem-Estar"), até 80 caracteres.
- description: descrição comercial do kit, até 160 caracteres.
- style_tag: 1 palavra ou expressão curta para o estilo (ex.: "Executivo", "Sustentável").
Use português do Brasil. Seja conciso e prático.`;

    const aiTimeoutController = new AbortController();
    const aiTimeoutId = setTimeout(() => aiTimeoutController.abort(), aiTimeoutMs);
    const aiRes = await fetchWithBreaker('lovable-ai', 'https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: aiTimeoutController.signal,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_kit',
              description: 'Devolve sugestão estruturada de kit',
              parameters: {
                type: 'object',
                properties: {
                  kit_type: { type: 'string', enum: ['montado', 'original', 'simples'] },
                  box_keywords: { type: 'array', items: { type: 'string' }, maxItems: 4 },
                  item_keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 3,
                    maxItems: 6,
                  },
                  target_price_brl: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                    },
                    required: ['min', 'max'],
                  },
                  narrative: { type: 'string' },
                  title: {
                    type: 'string',
                    maxLength: 80,
                    description: 'Nome curto e vendável do kit, até 80 caracteres.',
                  },
                  description: {
                    type: 'string',
                    maxLength: 160,
                    description: 'Descrição comercial do kit, até 160 caracteres.',
                  },
                  style_tag: { type: 'string', description: 'Estilo do kit em 1 palavra/expressão curta.' },
                },
                required: [
                  'kit_type',
                  'box_keywords',
                  'item_keywords',
                  'target_price_brl',
                  'narrative',
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_kit' } },
      }),
    });

    clearTimeout(aiTimeoutId);

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        await logCall({ status: 'error', errorMessage: 'HTTP 429 rate_limited' });
        return new Response(
          JSON.stringify({
            error: 'Limite de uso temporariamente excedido. Tente novamente em alguns instantes.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (aiRes.status === 402) {
        await logCall({ status: 'error', errorMessage: 'HTTP 402 quota_exceeded' });
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      await aiRes.text();
      console.error('AI gateway error', { status: aiRes.status });
      await logCall({ status: 'error', errorMessage: `HTTP ${aiRes.status}` });
      return new Response(JSON.stringify({ error: 'Erro ao consultar IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      await logCall({ status: 'error', errorMessage: 'empty_tool_call' });
      return new Response(JSON.stringify({ error: 'Resposta vazia da IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let rawSuggestion: unknown;
    try {
      rawSuggestion = JSON.parse(argsStr);
    } catch {
      await logCall({ status: 'error', errorMessage: 'invalid_json_arguments' });
      return new Response(JSON.stringify({ error: 'Resposta da IA em formato inválido' }), {
        status: 502,
        headers: { ...corsHeaders, ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Etapa 2 (plano de 100): maxLength no tool schema é só um pedido ao modelo —
    // se ignorado, o .strict()/.max() do zod rejeitava a sugestão inteira com
    // 502 por causa de um campo opcional de apresentação. Truncar aqui evita
    // perder narrative/box_keywords/item_keywords válidos por isso.
    const parsedSuggestion = KitAiBuilderSuggestion.safeParse(
      truncateKitAiBuilderPresentationFields(rawSuggestion),
    );
    if (!parsedSuggestion.success) {
      console.warn('kit-ai-builder invalid model output', {
        issues: parsedSuggestion.error.issues.map((issue) => issue.path.join('.')),
      });
      await logCall({ status: 'error', errorMessage: 'schema_validation_failed' });
      return new Response(JSON.stringify({ error: 'Resposta da IA não pôde ser validada' }), {
        status: 502,
        headers: { ...corsHeaders, ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokens = extractTokensFromResponse(aiJson);
    await logCall({ status: 'success', inputTokens: tokens.input, outputTokens: tokens.output });
    return new Response(JSON.stringify({ suggestion: parsedSuggestion.data }), {
      status: 200,
      headers: { ...corsHeaders, ...responseHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('kit-ai-builder error:', safeErrorFields(e));
    if (e instanceof CircuitOpenError) {
      await logCall({ status: 'error', errorMessage: `circuit_open:${e.service}` });
      return circuitOpenResponse(e, corsHeaders);
    }
    if (e instanceof DOMException && e.name === 'AbortError') {
      await logCall({ status: 'error', errorMessage: `timeout_${aiTimeoutMs}ms` });
      return new Response(
        JSON.stringify({ error: 'A IA demorou para responder. Tente novamente em instantes.' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    await logCall({ status: 'error', errorMessage: 'unhandled_exception' });
    return new Response(
      JSON.stringify({ error: 'Não foi possível gerar a sugestão agora. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
