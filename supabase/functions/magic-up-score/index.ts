import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { resolveAiApiKey } from '../_shared/ai-credentials.ts';

// F-07 (2026-10-09): limites de tamanho da entrada.
// `imageUrl` pode chegar como data: URL (imagem embutida) e os textos são
// livres — um payload gigante consome memória e custo de IA. O corpo é recusado
// com 413 ANTES de ser lido por inteiro (content-length ou corte do stream) e
// cada campo de texto é cortado no máximo previsto.
export const MAX_REQUEST_BYTES = 2_000_000; // 2 MB de corpo total
export const MAX_IMAGE_URL_BYTES = 1_500_000; // imagem embutida (data:) ou URL
export const MAX_TEXT_LENGTHS = {
  productName: 200,
  clientName: 200,
  promptText: 4000,
  channel: 80,
  aspectRatio: 32,
  context: 8000,
} as const;

const CriterionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  weight: z.number().min(1).max(5),
  recommendation: z.string().min(1),
});

const BodySchema = z.object({
  imageUrl: z.string().min(10),
  productName: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  campaignBrief: z.record(z.unknown()).optional().nullable(),
  brandKit: z.record(z.unknown()).optional().nullable(),
  creativeControls: z.record(z.unknown()).optional().nullable(),
  promptText: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  aspectRatio: z.string().optional().nullable(),
});

const DiagnosisSchema = z.object({
  total: z.number().min(0).max(100),
  label: z.string().min(1),
  summary: z.string().min(1),
  criteria: z.array(CriterionSchema).min(4).max(10),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

function safeJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI response did not contain JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** content-length declarado, quando numérico e não-negativo. */
export function declaredBodyBytes(req: Request): number | null {
  const raw = req.headers.get('content-length');
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** Tamanho em bytes (UTF-8) de uma string. */
export function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/** Corta o texto no máximo de caracteres; o excedente é descartado. */
export function truncateText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

/**
 * Lê o corpo abortando assim que o total passa de `maxBytes` — devolve
 * `tooLarge: true` SEM terminar o download quando o content-length já denuncia
 * o excesso ou quando o stream ultrapassa o teto.
 */
export async function readBodyWithinLimit(
  req: Request,
  maxBytes: number,
): Promise<{ tooLarge: boolean; text: string }> {
  const declared = declaredBodyBytes(req);
  if (declared !== null && declared > maxBytes) return { tooLarge: true, text: '' };
  if (!req.body) return { tooLarge: false, text: '' };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        // não deixa o download continuar: cancela o resto do corpo
        await reader.cancel();
        return { tooLarge: true, text: '' };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { tooLarge: false, text: new TextDecoder().decode(merged) };
}

export async function handleRequest(req: Request): Promise<Response> {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // 1) Guarda de tamanho ANTES de ler o corpo inteiro (DoS / custo de IA).
    const declared = declaredBodyBytes(req);
    if (declared !== null && declared > MAX_REQUEST_BYTES) {
      return jsonResponse({ error: 'payload_too_large', limit_bytes: MAX_REQUEST_BYTES }, 413, corsHeaders);
    }

    const auth = await authenticateRequest(req);
    const protection = await runBotProtection(req, {
      endpoint: 'magic-up-score',
      maxRequests: 20,
      windowSeconds: 60,
      blockSeconds: 900,
      customIdentifier: `user:${auth.userId}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const body = await readBodyWithinLimit(req, MAX_REQUEST_BYTES);
    if (body.tooLarge) {
      return jsonResponse({ error: 'payload_too_large', limit_bytes: MAX_REQUEST_BYTES }, 413, corsHeaders);
    }
    let rawBody: unknown = null;
    let parsedAsJson = true;
    try {
      rawBody = JSON.parse(body.text);
    } catch {
      parsedAsJson = false;
    }
    if (!parsedAsJson) {
      // corpo não-JSON: falha do cliente mostrada explicitamente (não engolida)
      return jsonResponse({ error: 'invalid_json' }, 400, corsHeaders);
    }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonResponse({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400, corsHeaders);
    }

    // 2) Imagem acima do limite → 413 ANTES de mandar para o provedor de IA.
    if (byteLength(parsed.data.imageUrl) > MAX_IMAGE_URL_BYTES) {
      return jsonResponse({ error: 'payload_too_large', limit_bytes: MAX_IMAGE_URL_BYTES }, 413, corsHeaders);
    }

    // BUG-CRED-2 FIX (2026-08-17): não bloqueia mais em LOVABLE_API_KEY ausente — esta
    // função tem routing multi-provider ativo (deepseek/DEEPSEEK_API_KEY) que
    // callAiWithTracking tenta primeiro e não depende do Lovable Gateway.
    const { apiKey: LOVABLE_API_KEY } = await resolveAiApiKey('magic-up-score');

    const model = 'google/gemini-2.5-pro';
    // 3) Todo texto livre é cortado no máximo previsto antes de compor o prompt.
    const context = JSON.stringify({
      productName: truncateText(parsed.data.productName, MAX_TEXT_LENGTHS.productName),
      clientName: truncateText(parsed.data.clientName, MAX_TEXT_LENGTHS.clientName),
      campaignBrief: parsed.data.campaignBrief,
      brandKit: parsed.data.brandKit,
      creativeControls: parsed.data.creativeControls,
      promptText: truncateText(parsed.data.promptText, MAX_TEXT_LENGTHS.promptText),
      channel: truncateText(parsed.data.channel, MAX_TEXT_LENGTHS.channel),
      aspectRatio: truncateText(parsed.data.aspectRatio, MAX_TEXT_LENGTHS.aspectRatio),
    }, null, 2);
    const boundedContext = truncateText(context, MAX_TEXT_LENGTHS.context) ?? '';

    const response = await callAiWithTracking({
      userId: auth.userId,
      functionName: 'magic-up-score',
      model,
      apiKey: LOVABLE_API_KEY ?? '',
      requestBody: {
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Avalie esta peça publicitária B2B para brindes personalizados. Retorne somente JSON válido com total, label, summary, criteria, strengths, risks e recommendations. Critérios obrigatórios: clareza do produto, visibilidade do logo, adequação ao canal, coerência com marca, qualidade visual, potencial comercial, realismo e espaço para copy/CTA. Contexto:\n${boundedContext}` },
            { type: 'image_url', image_url: { url: parsed.data.imageUrl } },
          ],
        }],
      },
    });

    if (!response.ok) {
      const message = response.status === 429 ? 'Limite de IA excedido para análise de score.' : response.status === 402 ? 'Créditos de IA esgotados para análise de score.' : 'Falha na análise de score.';
      return new Response(JSON.stringify({ error: message }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('AI response missing content');
    const diagnosis = DiagnosisSchema.parse(safeJson(content));

    return new Response(JSON.stringify({ ...diagnosis, source: 'ai' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    if (error instanceof QuotaExceededError) {
      return new Response(JSON.stringify({ error: 'Limite mensal de IA atingido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authStatus = (error as { status?: number })?.status;
    if (authStatus === 401 || authStatus === 403) return authErrorResponse(error, corsHeaders);
    console.error('[magic-up-score] Error:', error);
    const message = error instanceof Error ? error.message : 'Erro ao analisar Magic Score';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

Deno.serve(handleRequest);
