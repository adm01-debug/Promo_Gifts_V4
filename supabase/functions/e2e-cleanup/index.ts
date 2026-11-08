// supabase/functions/e2e-cleanup/index.ts
// BUG-EF-006 FIXED: supabase-js@2.45.0 -> @2.49.4
/**
 * e2e-cleanup -- Apaga dados de aplicacao criados por usuarios de teste E2E.
 *
 * Camadas de seguranca:
 *  1. Header x-e2e-cleanup-token precisa bater com E2E_CLEANUP_TOKEN (timing-safe).
 *  2. Rate limit por IP via RPC e2e_cleanup_check_rate_limit.
 *  3. email do body precisa estar em E2E_CLEANUP_ALLOWED_EMAILS (CSV).
 *  4. user_id e resolvido server-side via auth.admin.
 *  5. dryRun = true por default.
 *  6. Apaga apenas dados de aplicacao. NUNCA apaga auth.users.
 *  7. Tambem remove os mockups do usuario de teste: linhas de `generated_mockups`
 *     e os objetos do bucket `mockup-assets` sob o prefixo `${userId}/`
 *     (`logos/` e `mockups/`). Nenhum outro prefixo e tocado.
 */
// @ts-ignore - Deno runtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { castRpcResult } from '../_shared/supabase-client-adapter.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { parseContract } from '../_shared/contracts/index.ts';
import { E2eCleanupSchemas } from '../_shared/contracts/schemas/e2e-cleanup.ts';
import { resolveCredential } from '../_shared/credentials.ts';

type E2ERateLimitRow = {
  allowed: boolean;
  reset_in_seconds?: number;
  current_count?: number;
};

let contractResponseHeaders: Record<string, string> = {};

// E094: corsHeaders calculado por request — origem restrita; definido dentro do Deno.serve
let _reqCorsHeaders: Record<string, string> = {};

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ..._reqCorsHeaders,
      ...contractResponseHeaders,
      ...extraHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const RATE_LIMIT_MAX = Math.max(1, Number(Deno.env.get('E2E_CLEANUP_RATE_LIMIT_MAX') ?? '30'));
const RATE_LIMIT_WINDOW = Math.max(
  10,
  Number(Deno.env.get('E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS') ?? '60'),
);

// Bucket dos mockups e subpastas por usuario gravadas por `src/lib/mockup-storage.ts`
// (`${userId}/logos/<ts>-<nome>.<ext>`) e pelo gerador (`${userId}/mockups/<ts>-<uuid>.png`).
// Listar exatamente estas duas subpastas cobre todos os objetos do usuario de teste
// sem alcancar nenhum outro prefixo do bucket.
const MOCKUP_BUCKET = 'mockup-assets';
const MOCKUP_USER_SUBDIRS = ['logos', 'mockups'] as const;
const STORAGE_LIST_LIMIT = 1000;
const CLEANUP_PROTOCOL = 'quotes-prefix-v2';

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  // E094: origem restrita por request — não mais Access-Control-Allow-Origin: *
  _reqCorsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: _reqCorsHeaders });

  const startMs = Date.now();
  const clientIp = getClientIp(req);
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const { value: cleanupToken } = await resolveCredential('E2E_CLEANUP_TOKEN');
  const { value: allowedEmailsRaw } = await resolveCredential('E2E_CLEANUP_ALLOWED_EMAILS');
  const ALLOWED_EMAILS = new Set(
    (allowedEmailsRaw ?? '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean),
  );

  // 1. Auth
  const incomingToken = req.headers.get('x-e2e-cleanup-token') ?? '';
  if (!cleanupToken || !timingSafeEqual(incomingToken, cleanupToken)) {
    await supabase
      .from('e2e_cleanup_audit')
      .insert({
        ip: clientIp,
        status: 'auth_failed',
        reason: 'invalid_token',
        dry_run: true,
        total_ms: Date.now() - startMs,
      })
      .maybeSingle();
    return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  }

  try {
    const contractResult = await parseContract(req, E2eCleanupSchemas, {
      corsHeaders: _reqCorsHeaders,
    });
    if (!contractResult.ok) return contractResult.response;
    const { data: body, responseHeaders } = contractResult;
    contractResponseHeaders = responseHeaders;

    const email = (body.email ?? '').toLowerCase();
    const dryRun = body.dryRun !== false;
    const nameFilterPrefix = body.nameFilterPrefix?.trim() || null;
    if (nameFilterPrefix && !/^\[E2E\](?: [a-zA-Z0-9-]{1,80})?$/.test(nameFilterPrefix)) {
      return jsonResponse(
        { ok: false, error: 'nameFilterPrefix must be a canonical [E2E] prefix' },
        400,
      );
    }

    // 2. Rate limit
    const rlResult = await castRpcResult<{ data: E2ERateLimitRow | null; error: unknown }>(
      supabase.rpc('e2e_cleanup_check_rate_limit', {
        p_key: clientIp,
        p_max: RATE_LIMIT_MAX,
        p_window_seconds: RATE_LIMIT_WINDOW,
        // deno-lint-ignore no-explicit-any
      }) as unknown as Promise<{ data: E2ERateLimitRow | null; error: unknown }>,
    );
    if (rlResult.error) {
      return jsonResponse({ ok: false, error: 'Rate limit unavailable' }, 503);
    }
    if (rlResult.data && !rlResult.data.allowed) {
      await supabase
        .from('e2e_cleanup_audit')
        .insert({
          ip: clientIp,
          status: 'rate_limited',
          reason: 'rate_limit_exceeded',
          dry_run: dryRun,
          total_ms: Date.now() - startMs,
        })
        .maybeSingle();
      return jsonResponse(
        {
          ok: false,
          error: 'Rate limit exceeded',
          reset_in_seconds: rlResult.data.reset_in_seconds,
        },
        429,
      );
    }

    // 3. Email allowlist
    if (ALLOWED_EMAILS.size === 0 || !ALLOWED_EMAILS.has(email)) {
      // E019: fail-closed — empty allowlist = env var ausente = rejeita tudo
      await supabase
        .from('e2e_cleanup_audit')
        .insert({
          ip: clientIp,
          status: 'forbidden',
          reason: 'email_not_allowed',
          dry_run: dryRun,
          total_ms: Date.now() - startMs,
        })
        .maybeSingle();
      return jsonResponse({ ok: false, error: 'Email not in allowed list' }, 403);
    }

    // 4. Resolve user_id
    // A API admin pagina usuários. Procurar apenas a primeira página fazia o
    // cleanup devolver 404 em projetos maiores e bloqueava toda a prova live.
    // O limite explícito também evita uma busca ilimitada caso o email
    // allowlisted seja removido sem que o secret seja atualizado.
    const userPageSize = 1000;
    const maxUserPages = 100;
    let targetUser: { id: string; email?: string | null } | undefined;
    let reachedLastUserPage = false;
    for (let page = 1; page <= maxUserPages; page += 1) {
      const { data: users, error: listErr } = await supabase.auth.admin.listUsers({
        page,
        perPage: userPageSize,
      });
      if (listErr) throw listErr;
      const pageUsers = users?.users ?? [];
      targetUser = pageUsers.find((user) => user.email?.toLowerCase() === email);
      if (targetUser) break;
      if (pageUsers.length < userPageSize) {
        reachedLastUserPage = true;
        break;
      }
    }
    if (!targetUser && !reachedLastUserPage) {
      throw new Error(`User lookup exceeded the safe limit of ${maxUserPages} pages`);
    }
    if (!targetUser) {
      return jsonResponse({ ok: false, error: 'User not found', email }, 404);
    }
    const userId = targetUser.id;
    if (body.sellerScope === 'explicit' && body.sellerId !== userId) {
      return jsonResponse(
        { ok: false, error: 'sellerId does not match the allowlisted email' },
        403,
      );
    }

    // 5. Cleanup (application data only)
    const deleted: Record<string, number> = {};
    const errors: Record<string, string> = {};
    if (nameFilterPrefix) {
      // Modo escopado usado pelos gates de quotes. Nunca apaga dados do
      // usuário E2E fora do prefixo desta rodada.
      const {
        data: quoteRows,
        count: quoteCount,
        error: quoteLookupError,
      } = await supabase
        .from('quotes')
        .select('id', { count: 'exact' })
        .eq('seller_id', userId)
        .like('client_name', `${nameFilterPrefix}%`)
        .limit(1000);

      if (quoteLookupError) {
        errors.quotes_lookup = quoteLookupError.message;
      } else if ((quoteCount ?? 0) > (quoteRows?.length ?? 0)) {
        errors.quotes_lookup = `prefixo excede o limite seguro de 1000 linhas (${quoteCount ?? 0})`;
      } else {
        const quoteIds = (quoteRows ?? []).map((row) => row.id as string);
        let scopedItemCount = 0;
        if (quoteIds.length > 0) {
          const { count, error } = await supabase
            .from('quote_items')
            .select('id', { count: 'exact', head: true })
            .in('quote_id', quoteIds);
          if (error) errors.quote_items = error.message;
          else scopedItemCount = count ?? 0;
        }
        if (dryRun) {
          deleted.quotes = quoteIds.length;
          deleted.quote_items = scopedItemCount;
        } else if (quoteIds.length > 0 && !errors.quote_items) {
          // A FK quote_items.quote_id usa ON DELETE CASCADE. Um único DELETE
          // em quotes torna a remoção de pai+itens atômica, elimina URLs com
          // centenas de UUIDs e revalida seller+prefixo no momento do DELETE.
          const { count: quoteDeleteCount, error: quoteDeleteError } = await supabase
            .from('quotes')
            .delete({ count: 'exact' })
            .eq('seller_id', userId)
            .like('client_name', `${nameFilterPrefix}%`);
          if (quoteDeleteError) errors.quotes = quoteDeleteError.message;
          else {
            deleted.quotes = quoteDeleteCount ?? 0;
            deleted.quote_items = scopedItemCount;
          }
        } else {
          deleted.quote_items = 0;
          deleted.quotes = 0;
        }

        if (!dryRun) {
          const { count: remaining, error: verifyError } = await supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .eq('seller_id', userId)
            .like('client_name', `${nameFilterPrefix}%`);
          if (verifyError) errors.quotes_verify = verifyError.message;
          else if ((remaining ?? 0) !== 0) {
            errors.quotes_verify = `${remaining} quote(s) permaneceram após o cleanup`;
          }
        }
      }
    } else {
      // Compatibilidade do cleanup completo do usuário E2E. Somente requests
      // sem nameFilterPrefix podem tocar estas tabelas e o storage.
      // Quotes são tratadas separadamente porque quote_items não possui
      // seller_id; a FK ON DELETE CASCADE remove os itens atomicamente.
      const {
        data: fullQuoteRows,
        count: fullQuoteCount,
        error: fullQuoteLookupError,
      } = await supabase
        .from('quotes')
        .select('id', { count: 'exact' })
        .eq('seller_id', userId)
        .limit(1000);
      if (fullQuoteLookupError) {
        errors.quotes_lookup = fullQuoteLookupError.message;
      } else if ((fullQuoteCount ?? 0) > (fullQuoteRows?.length ?? 0)) {
        errors.quotes_lookup = `usuário excede o limite seguro de 1000 quotes (${fullQuoteCount ?? 0})`;
      } else {
        const quoteIds = (fullQuoteRows ?? []).map((row) => row.id as string);
        let itemCount = 0;
        if (quoteIds.length > 0) {
          const { count, error } = await supabase
            .from('quote_items')
            .select('id', { count: 'exact', head: true })
            .in('quote_id', quoteIds);
          if (error) errors.quote_items = error.message;
          else itemCount = count ?? 0;
        }
        if (dryRun) {
          deleted.quotes = quoteIds.length;
          deleted.quote_items = itemCount;
        } else if (!errors.quote_items) {
          const { count, error } = await supabase
            .from('quotes')
            .delete({ count: 'exact' })
            .eq('seller_id', userId);
          if (error) errors.quotes = error.message;
          else {
            deleted.quotes = count ?? 0;
            deleted.quote_items = itemCount;
          }
        }
      }

      const tables = [
        { table: 'orders', column: 'seller_id' },
        { table: 'workspace_notifications', column: 'user_id' },
        { table: 'follow_up_reminders', column: 'seller_id' },
        { table: 'mockup_drafts', column: 'user_id' },
        { table: 'generated_mockups', column: 'user_id' },
        { table: 'favorites', column: 'user_id' },
      ];

      for (const { table, column } of tables) {
        if (dryRun) {
          const { count, error } = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true })
            .eq(column, userId);
          if (error) errors[table] = error.message;
          else deleted[table] = count ?? 0;
        } else {
          const { count, error } = await supabase
            .from(table)
            .delete({ count: 'exact' })
            .eq(column, userId);
          if (error) errors[table] = error.message;
          else deleted[table] = count ?? 0;
        }
      }
    }

    // 6. Storage: remove os objetos de mockup do usuario de teste (logos/ e
    //    mockups/). Escopo estrito ao prefixo `${userId}/`; nenhum outro
    //    prefixo do bucket e listado ou removido.
    if (!nameFilterPrefix) {
      const mockupPaths: string[] = [];
      for (const subdir of MOCKUP_USER_SUBDIRS) {
        const prefix = `${userId}/${subdir}`;
        const { data: entries, error } = await supabase.storage
          .from(MOCKUP_BUCKET)
          .list(prefix, { limit: STORAGE_LIST_LIMIT });
        if (error) {
          errors[`storage:${MOCKUP_BUCKET}/${subdir}`] = error.message;
          continue;
        }
        for (const entry of entries ?? []) {
          if (entry?.name) mockupPaths.push(`${prefix}/${entry.name}`);
        }
      }

      if (mockupPaths.length > 0) {
        if (dryRun) {
          deleted[`storage:${MOCKUP_BUCKET}`] = mockupPaths.length;
        } else {
          const { error } = await supabase.storage.from(MOCKUP_BUCKET).remove(mockupPaths);
          if (error) errors[`storage:${MOCKUP_BUCKET}`] = error.message;
          else deleted[`storage:${MOCKUP_BUCKET}`] = mockupPaths.length;
        }
      }
    }

    const totalMs = Date.now() - startMs;
    const ok = Object.keys(errors).length === 0;
    await supabase
      .from('e2e_cleanup_audit')
      .insert({
        ip: clientIp,
        status: ok ? 'success' : 'partial_error',
        dry_run: dryRun,
        user_id: userId,
        totals: deleted,
        total_ms: totalMs,
      })
      .maybeSingle();

    return jsonResponse(
      {
        ok,
        dryRun,
        userId,
        deleted,
        cleanupProtocol: CLEANUP_PROTOCOL,
        scope: nameFilterPrefix
          ? { mode: 'quotes-prefix', nameFilterPrefix, sellerId: userId }
          : { mode: 'full-user', sellerId: userId },
        ...(ok ? {} : { errors }),
        totalMs,
      },
      ok ? 200 : 500,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[e2e-cleanup] error:', msg);
    await supabase
      .from('e2e_cleanup_audit')
      .insert({
        ip: clientIp,
        status: 'error',
        reason: msg,
        dry_run: true,
        total_ms: Date.now() - startMs,
      })
      .maybeSingle();
    return jsonResponse({ ok: false, error: 'Internal error' }, 500);
  }
});
