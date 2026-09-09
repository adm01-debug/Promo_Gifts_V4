// supabase/functions/magazine-import-local/index.ts
//
// One-shot: migra as revistas que o vendedor já criou em localStorage
// (magazineService v1) para o BD Gold. Chamado automaticamente pelo
// front (1x) na primeira vez que o usuário abre /magazine após o deploy
// desta migração — sem isso, os vendedores perderiam o trabalho já feito.
//
// verify_jwt = false no gateway por compatibilidade HS256; autenticação obrigatória
// validada abaixo com auth.getUser() antes de qualquer mutação.
//
// Mapeamento de IDs: os IDs legados (`mag_<uuid>`, `item_<uuid>`) e tokens
// (`crypto.randomUUID()` com hífens) NÃO são reaproveitados — o BD gera
// novos UUIDs e tokens hex conforme o schema. O front deve atualizar seus
// registros locais com os novos IDs retornados.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { z } from 'npm:zod@3.23.8';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createStructuredLogger } from '../_shared/structured-logger.ts';
import { getOrCreateRequestId } from '../_shared/request-id.ts';
import { importLocalMagazineBatch } from './logic.ts';

const itemSchema = z.object({
  localItemId: z.string().min(1).max(200),
  productId: z.string().uuid(),
  productSnapshot: z.record(z.unknown()),
  variantColorName: z.string().nullable().optional(),
  position: z.number().int().min(0).max(1_000_000_000),
  pageNumber: z.number().int().min(1).max(200).nullable().optional(),
  overrides: z.record(z.unknown()).optional(),
});

const magazineSchema = z
  .object({
    localId: z.string().min(1).max(200), // chave idempotente, escopada por usuário no BD
    title: z.string().min(1).max(200).default('Nova Revista'),
    subtitle: z.string().max(300).default(''),
    templateId: z.string().default('editorial-vogue'),
    branding: z.record(z.unknown()).optional(),
    content: z.record(z.unknown()).optional(),
    pageOrder: z.unknown().nullable().optional(),
    items: z.array(itemSchema).max(500).default([]), // FIX A12: limite de itens por revista
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
  })
  .superRefine((magazine, context) => {
    for (const field of ['localItemId', 'productId', 'position'] as const) {
      if (new Set(magazine.items.map((item) => item[field])).size !== magazine.items.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: `${field}_must_be_unique`,
        });
      }
    }
  });

const bodySchema = z.object({
  magazines: z.array(magazineSchema).max(200), // FIX A12: limite de revistas por import
});

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: 'magazine-import-local', requestId, req });
  const corsHeaders = getCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    if (req.method !== 'POST') {
      return log.respond(
        new Response(JSON.stringify({ error: 'method_not_allowed', request_id: requestId }), {
          status: 405,
          headers: jsonHeaders,
        }),
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return log.respond(
        new Response(JSON.stringify({ error: 'unauthorized', request_id: requestId }), {
          status: 401,
          headers: jsonHeaders,
        }),
      );
    }

    // Client autenticado como o usuário (RLS aplica normalmente — dono só grava para si)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return log.respond(
        new Response(JSON.stringify({ error: 'unauthorized', request_id: requestId }), {
          status: 401,
          headers: jsonHeaders,
        }),
      );
    }
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return log.respond(
        new Response(
          JSON.stringify({
            error: 'invalid_request',
            request_id: requestId,
            details: parsed.error.flatten().fieldErrors,
          }),
          { status: 400, headers: jsonHeaders },
        ),
      );
    }

    // Cada chamada é uma transação no BD. O localId é a chave idempotente:
    // resposta perdida e retry retornam a mesma revista, sem cópia órfã.
    const summary = await importLocalMagazineBatch(userClient, parsed.data.magazines);

    log.info('import_complete', {
      total: summary.results.length,
      ok: summary.successCount,
      failed: summary.failureCount,
      complete: summary.complete,
    });
    return log.respond(
      new Response(JSON.stringify({ ...summary, request_id: requestId }), {
        status: 200,
        headers: jsonHeaders,
      }),
    );
  } catch (err) {
    log.error('unhandled_exception', { err });
    return log.respond(
      new Response(JSON.stringify({ error: 'internal_error', request_id: requestId }), {
        status: 500,
        headers: jsonHeaders,
      }),
    );
  }
});
