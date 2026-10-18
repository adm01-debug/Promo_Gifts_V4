import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts';
import { buildPublicCorsHeaders } from '../_shared/cors.ts';
import { parseContract } from '../_shared/contracts/index.ts';
import { getCredential } from '../_shared/credentials.ts';
import {
  ProductWebhookSchemas,
  type ProductWebhookV1Payload,
  type ProductWebhookV2Payload,
} from '../_shared/contracts/schemas/product-webhook.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const configuredBatchSize = Number(Deno.env.get('PRODUCT_WEBHOOK_BATCH_SIZE') ?? '200');
const MAX_BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 100;
const rawBatchSize = Number.isFinite(configuredBatchSize) ? Math.trunc(configuredBatchSize) : 200;
const BATCH_SIZE = Math.min(Math.max(rawBatchSize, MIN_BATCH_SIZE), MAX_BATCH_SIZE);
if (rawBatchSize !== BATCH_SIZE) {
  console.warn(`[product-webhook] PRODUCT_WEBHOOK_BATCH_SIZE=${rawBatchSize} clamped to ${BATCH_SIZE}`);
}
const DEFAULT_WEBHOOK_TOLERANCE_SEC = 300;
const MAX_WEBHOOK_TOLERANCE_SEC = 3600;
const MAX_NONCE_LENGTH = 256;

// UUID v4 regex — validates supplier_id/category_id before writing to UUID columns
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(val: unknown): val is string {
  return typeof val === 'string' && UUID_RE.test(val);
}

const allowedOrigins = new Set(
  (Deno.env.get('PRODUCT_WEBHOOK_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const CORS_ALLOW_HEADERS = [
  'accept-version',
  'content-type',
  'x-webhook-signature',
  'x-webhook-timestamp',
  'x-webhook-nonce',
];

const PRODUCT_WEBHOOK_CORS_HEADERS = buildPublicCorsHeaders({
  extraAllowHeaders: CORS_ALLOW_HEADERS,
  allowMethods: 'POST, OPTIONS',
});

const UNAUTHORIZED_BODY = JSON.stringify({
  code: 'unauthorized',
  message: 'Unauthorized',
  fields: [],
});

type ProductPayload =
  | NonNullable<ProductWebhookV1Payload['product']>
  | NonNullable<ProductWebhookV2Payload['product']>;

// NormalizedProduct fields must map 1-to-1 to `products` table columns.
// BREAKING HISTORY: original type used `price`, `stock`, `featured`, `new_arrival`,
// `on_sale`, `synced_at` — none of which exist as column names in the DB.
// All upserts were silently failing with column-not-found errors. Fixed 2026-06-18.
type NormalizedProduct = {
  // external_id NÃO é coluna de `products` no schema canônico (baseline
  // 2026-10-15) — nunca chegou a existir em produção e foi removida dos
  // tipos gerados. Enviar a key no upsert quebrava TODA a linha com
  // PGRST204. A identidade de dedupe real é `sku` (products_sku_key).
  sku: string;
  sku_promo: string;           // DB column: sku_promo NOT NULL + CHECK = sku (trigger trg_sync_sku_promo also enforces)
  name: string;
  description: string | null;
  sale_price: number;          // DB column: sale_price (was: price)
  min_quantity: number;
  category_id: string | null;  // UUID NOT NULL — resolved via categories.bitrix_id/name; null only when unresolvable
  supplier_id: string | null;  // UUID NOT NULL — resolved via suppliers.code/name; null only when unresolvable
  brand: string | null;        // DB column: brand (was: supplier_name)
  stock_quantity: number;      // DB column: stock_quantity (was: stock)
  is_stockout: boolean;        // DB column: is_stockout (was: stock_status string)
  sync_status: string;         // DB column: sync_status, always 'synced' on webhook write
  is_kit: boolean;
  is_active: boolean;
  is_featured?: boolean;       // DB column: is_featured (was: featured) — omitido preserva o valor existente
  is_featured_expires_at?: string | null; // CHECK exige NOT NULL quando is_featured=true
  is_new: boolean;             // DB column: is_new (was: new_arrival)
  is_on_sale: boolean;         // DB column: is_on_sale (was: on_sale)
  images: string[];
  videos: unknown[];           // DB column: videos jsonb[] (was: video_url string)
  colors: unknown[];
  materials: string[];
  tags: Record<string, unknown>;
  variations: unknown[];
  schema_json: Record<string, unknown>; // DB column: schema_json (metadata + kit_items merged here)
  last_sync_at: string;        // DB column: last_sync_at (was: synced_at)
};

type UpsertOutcome = {
  created: number;
  updated: number;
  failed: number;
  processed: number;
  errors: string[];
  warnings: string[];
  db_roundtrips: number;
  duration_ms: number;
  chunk_metrics: Array<{
    chunk: number;
    received: number;
    processed: number;
    duration_ms: number;
    db_roundtrips: number;
    created: number;
    updated: number;
    failed: number;
  }>;
};

function getRequestCorsHeaders(req: Request): Record<string, string> {
  const requestOrigin = req.headers.get('origin') ?? '';
  const isAllowedOrigin = requestOrigin && allowedOrigins.has(requestOrigin);

  if (requestOrigin && !isAllowedOrigin) {
    return {
      ...PRODUCT_WEBHOOK_CORS_HEADERS,
      'Access-Control-Allow-Origin': 'null',
      Vary: 'Origin',
    };
  }

  return {
    ...PRODUCT_WEBHOOK_CORS_HEADERS,
    'Access-Control-Allow-Origin': requestOrigin || '*',
    Vary: 'Origin',
  };
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return encodeHex(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function isReplayNonce(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<Database>,
  nonce: string,
  timestamp: number,
  toleranceSec: number,
): Promise<boolean> {
  const expiresAt = new Date((timestamp + toleranceSec) * 1000).toISOString();

  const { error } = await supabase.from('webhook_request_nonces' as never).insert({
    source: 'product-webhook',
    nonce,
    request_timestamp: new Date(timestamp * 1000).toISOString(),
    expires_at: expiresAt,
  } as never);

  if (!error) return false;
  if (error.code === '23505') return true;
  throw error;
}

function logAuthFailure(reason: string, req: Request, details: Record<string, unknown> = {}) {
  const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const origin = req.headers.get('origin') || 'none';
  const ua = req.headers.get('user-agent') || 'unknown';
  console.error(
    JSON.stringify({
      event: 'product_webhook_auth_failed',
      reason,
      origin,
      sourceIp,
      ua,
      timestamp: new Date().toISOString(),
      ...details,
    }),
  );
}

Deno.serve(async (req) => {
  const corsHeaders = getRequestCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

  try {
    const rawBody = await req.text();

    // fix: ssot-bypass + module-scope-credential-read — read from credential vault per-request
    const webhookSecret = await getCredential('N8N_PRODUCT_WEBHOOK_SECRET');
    const configuredWebhookToleranceSec = Number(
      await getCredential('N8N_PRODUCT_WEBHOOK_TOLERANCE_SEC') ?? DEFAULT_WEBHOOK_TOLERANCE_SEC,
    );
    const webhookTimestampToleranceSec =
      Number.isFinite(configuredWebhookToleranceSec) && configuredWebhookToleranceSec > 0
        ? Math.min(Math.floor(configuredWebhookToleranceSec), MAX_WEBHOOK_TOLERANCE_SEC)
        : DEFAULT_WEBHOOK_TOLERANCE_SEC;

    if (!webhookSecret) {
      logAuthFailure('misconfigured_secret', req);
      return new Response(UNAUTHORIZED_BODY, {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signatureHeader = req.headers.get('x-webhook-signature') || '';
    const nonce = req.headers.get('x-webhook-nonce') || '';
    const timestampHeader = req.headers.get('x-webhook-timestamp') || '';
    const timestamp = Number(timestampHeader);

    if (!signatureHeader || !nonce || !timestampHeader || !Number.isFinite(timestamp)) {
      logAuthFailure('missing_signature_headers', req, {
        hasSignature: Boolean(signatureHeader),
        hasNonce: Boolean(nonce),
        hasTimestamp: Boolean(timestampHeader),
      });
      return new Response(UNAUTHORIZED_BODY, {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (nonce.length > MAX_NONCE_LENGTH) {
      logAuthFailure('nonce_too_long', req, { nonceLength: nonce.length, max: MAX_NONCE_LENGTH });
      return new Response(UNAUTHORIZED_BODY, {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestamp) > webhookTimestampToleranceSec) {
      logAuthFailure('timestamp_out_of_window', req, {
        nowSec,
        reqTimestamp: timestamp,
        toleranceSec: webhookTimestampToleranceSec,
      });
      return new Response(UNAUTHORIZED_BODY, {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signingMessage = `${timestampHeader}.${nonce}.${rawBody}`;
    const expectedSig = await hmacSign(signingMessage, webhookSecret);
    const normalizedProvidedSig = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7)
      : signatureHeader;

    if (!timingSafeEqual(expectedSig, normalizedProvidedSig)) {
      logAuthFailure('invalid_signature', req, {
        providedSigPrefix: normalizedProvidedSig.slice(0, 8),
      });
      return new Response(UNAUTHORIZED_BODY, {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const replayed = await isReplayNonce(supabase, nonce, timestamp, webhookTimestampToleranceSec);
    if (replayed) {
      logAuthFailure('replayed_nonce', req, { nonceSize: nonce.length });
      return new Response(UNAUTHORIZED_BODY, {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await parseContract(req, ProductWebhookSchemas, {
      corsHeaders,
      prereadBody: rawBody,
    });
    if (!result.ok) return result.response;

    const { version, data, responseHeaders } = result;
    const okHeaders = { ...corsHeaders, ...responseHeaders, 'Content-Type': 'application/json' };

    console.log(`[product-webhook] version=${version} action=${data.action}`);

    const products = data.products as ProductPayload[] | undefined;
    const singleProduct = data.product as ProductPayload | undefined;
    const externalIds = data.external_ids as string[] | undefined;
    const productsReceived = products?.length || (singleProduct ? 1 : 0);

    // product_sync_logs vive no schema `public` (baseline canônico) —
    // `.schema('archive')` apontava para um schema inexistente e o log
    // falhava silenciosamente em toda execução.
    const { data: syncLog, error: logError } = await supabase
      .from('product_sync_logs')
      .insert({
        status: 'processing',
        source: version === '2' ? 'n8n_v2' : 'n8n',
        products_received: productsReceived,
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating sync log:', logError);
    }

    const syncLogId = syncLog?.id;

    let outcome: UpsertOutcome = {
      created: 0,
      updated: 0,
      failed: 0,
      processed: 0,
      errors: [],
      warnings: [],
      db_roundtrips: 0,
      duration_ms: 0,
      chunk_metrics: [],
    };

    switch (data.action) {
      case 'upsert': {
        if (!singleProduct) {
          throw new Error('Product data is required for upsert action');
        }
        outcome = await upsertProducts(supabase, [singleProduct], BATCH_SIZE);
        break;
      }

      case 'batch_upsert':
      case 'sync': {
        if (!products || products.length === 0) {
          throw new Error('Products array is required for batch_upsert/sync action');
        }
        outcome = await upsertProducts(supabase, products, BATCH_SIZE);
        break;
      }

      case 'delete': {
        if (!externalIds || externalIds.length === 0) {
          throw new Error('external_ids array is required for delete action');
        }
        // Soft-delete: set is_active=false + is_deleted=true + deleted_at timestamp.
        // Hard delete is irreversible and has no audit trail; misconfigured n8n nodes
        // could permanently wipe catalog entries. Soft-delete allows recovery.
        // external_ids não resolve para nenhuma coluna do schema canônico
        // (products.external_id não existe). Casar em `sku` arriscaria
        // desativar produtos errados se os ids externos divergirem do sku,
        // então o lookup é exato por sku — se nada bater, count=0 fica
        // honesto em vez de deletar por identidade errada.
        const { error: deleteError, count } = await supabase
          .from('products')
          .update({
            is_active: false,
            is_deleted: true,
            deleted_at: new Date().toISOString(),
          })
          .in('sku', externalIds);
        if (deleteError) throw deleteError;
        outcome = { ...outcome, processed: externalIds.length, db_roundtrips: 1 };
        console.log(`[product-webhook] Soft-deleted ${count ?? 0} products via external_ids`);
        break;
      }

      default:
        throw new Error(`Unknown action: ${(data as { action: string }).action}`);
    }

    if (syncLogId) {
      const { error: logUpdateError } = await supabase
        .from('product_sync_logs')
        .update({
          status: outcome.failed > 0 ? 'partial' : 'completed',
          products_created: outcome.created,
          products_updated: outcome.updated,
          products_failed: outcome.failed,
          records_processed: outcome.processed,
          duration_ms: outcome.duration_ms,
          payload: {
            batch_size: BATCH_SIZE,
            db_roundtrips: outcome.db_roundtrips,
            chunk_metrics: outcome.chunk_metrics,
          },
          error_message: outcome.errors.length > 0 ? outcome.errors.join('; ') : null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLogId);
      if (logUpdateError) {
        console.error('[product-webhook] Failed to update sync log:', logUpdateError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: outcome.created,
        updated: outcome.updated,
        failed: outcome.failed,
        processed: outcome.processed,
        duration_ms: outcome.duration_ms,
        db_roundtrips: outcome.db_roundtrips,
        chunk_metrics: outcome.chunk_metrics,
        errors: outcome.errors,
        warnings: outcome.warnings,
        sync_log_id: syncLogId,
      }),
      { headers: okHeaders },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Product webhook error:', error);
    return new Response(
      JSON.stringify({ code: 'internal_error', message: errorMessage, fields: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function upsertProducts(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<Database>,
  products: ProductPayload[],
  chunkSize: number,
): Promise<UpsertOutcome> {
  const startedAt = Date.now();
  const resolvers = await buildEntityResolvers(supabase);
  const normalized = products.map((p) => normalizeProduct(p, resolvers));
  const unresolved = {
    category: [] as string[],
    supplier: [] as string[],
    featured_no_expires: [] as string[],
    featured_cleared: [] as string[],
  };
  const valid: NormalizedProduct[] = [];
  const rejected: string[] = [];
  for (const [i, n] of normalized.entries()) {
    const p = products[i];
    if (n.category_id === null && (p.category_id !== undefined || p.category_name))
      unresolved.category.push(p.sku);
    if (n.supplier_id === null && (p.supplier_id !== undefined || p.supplier_name))
      unresolved.supplier.push(p.sku);
    if (p.featured === true && !n.is_featured) {
      // expires ausente: produto novo fica sem destaque; existente preserva
      // (colunas fora do DO UPDATE). expires null explícito: o upsert
      // DESLIGA o destaque — warning próprio, não promete preservação.
      if (p.featured_expires_at === null) unresolved.featured_cleared.push(p.sku);
      else unresolved.featured_no_expires.push(p.sku);
    }
    // NOT NULL no banco: linha sem categoria/fornecedor resolvido falha 23502 —
    // exclui do chunk para um produto ruim não derrubar os bons do lote.
    const missing = [
      n.category_id === null ? 'category_id' : null,
      n.supplier_id === null ? 'supplier_id' : null,
    ].filter(Boolean);
    if (missing.length) rejected.push(`${n.sku}(sem ${missing.join(',')})`);
    else valid.push(n);
  }
  if (
    unresolved.category.length ||
    unresolved.supplier.length ||
    unresolved.featured_no_expires.length ||
    unresolved.featured_cleared.length
  ) {
    console.warn(
      `[product-webhook] ids externos não resolvidos: ` +
        `category=${unresolved.category.length} (ex: ${unresolved.category.slice(0, 3).join(',')}) ` +
        `supplier=${unresolved.supplier.length} (ex: ${unresolved.supplier.slice(0, 3).join(',')}) ` +
        `featured_no_expires=${unresolved.featured_no_expires.length} ` +
        `featured_cleared=${unresolved.featured_cleared.length} (ex: ${[...unresolved.featured_no_expires, ...unresolved.featured_cleared].slice(0, 3).join(',')})`,
    );
  }
  // Warnings vão na resposta — rejected/error já eram visíveis mas ids não
  // resolvidos e featured preservado/desligado eram só console.warn (invisível pro caller).
  const warnings: string[] = [];
  if (unresolved.category.length)
    warnings.push(
      `category_id não resolvido p/ ${unresolved.category.length} sku(s) (ex: ${unresolved.category.slice(0, 5).join(', ')})`,
    );
  if (unresolved.supplier.length)
    warnings.push(
      `supplier_id não resolvido p/ ${unresolved.supplier.length} sku(s) (ex: ${unresolved.supplier.slice(0, 5).join(', ')})`,
    );
  if (unresolved.featured_no_expires.length)
    warnings.push(
      `featured sem featured_expires_at p/ ${unresolved.featured_no_expires.length} sku(s) — ` +
        `novos ficam sem destaque; existentes preservam o destaque atual (ex: ${unresolved.featured_no_expires.slice(0, 5).join(', ')})`,
    );
  if (unresolved.featured_cleared.length)
    warnings.push(
      `featured:true com featured_expires_at:null p/ ${unresolved.featured_cleared.length} sku(s) — ` +
        `destaque DESLIGADO no upsert (ex: ${unresolved.featured_cleared.slice(0, 5).join(', ')})`,
    );

  const chunks = chunkArray(valid, chunkSize);

  let created = 0;
  let updated = 0;
  let failed = 0;
  let processed = 0;
  let db_roundtrips = 0;
  const errors: string[] = [];
  const chunk_metrics: UpsertOutcome['chunk_metrics'] = [];

  for (const [index, chunk] of chunks.entries()) {
    const chunkStart = Date.now();
    let chunkRoundtrips = 0;
    try {
      const skus = Array.from(new Set(chunk.map((item) => item.sku).filter(Boolean)));

      let existingRows: Array<{ id: string; sku: string | null }> = [];
      if (skus.length > 0) {
        // SECURITY (CWE-943): never interpolate caller-controlled sku into the
        // PostgREST `.or()` filter DSL — a value containing ',', ')' or '.' breaks out of
        // the in.(...) list and injects arbitrary filter expressions. Use parameterized
        // `.in()` probes (supabase-js URL-encodes the values) and merge results by id.
        const byId = new Map<string, { id: string; sku: string | null }>();
        const { data, error } = await supabase
          .from('products')
          .select('id,sku')
          .in('sku', skus);
        chunkRoundtrips += 1;
        if (error) throw error;
        for (const row of data ?? []) byId.set(row.id, row);
        existingRows = Array.from(byId.values());
      }

      const existingBySku = new Map(
        existingRows.filter((row) => row.sku).map((row) => [row.sku as string, row]),
      );

      // PostgREST upsert (merge-duplicates) trata chave ausente como NULL e
      // copiar o valor lido antes do upsert tem corrida: edição de featured
      // feita entre o probe e a gravação seria revertida. Preservação atômica
      // = particionar o upsert: linhas sem decisão de featured vão num batch
      // SEM as duas colunas — o DO UPDATE não as inclui e o valor atual
      // sobrevive qualquer edição concorrente no momento da escrita.
      const withFeatured: NormalizedProduct[] = [];
      const noFeatured: NormalizedProduct[] = [];
      let wFCreated = 0, wFUpdated = 0, nFCreated = 0, nFUpdated = 0;
      for (const item of chunk) {
        // 'variations' is NOT a products column (variant data lives in product_variants).
        // Leaving it in the upsert payload 400s the entire chunk (PGRST204), so strip it.
        delete (item as Record<string, unknown>).variations;
        const existing = existingBySku.get(item.sku);

        if (item.is_featured === undefined && existing) {
          delete (item as Record<string, unknown>).is_featured_expires_at;
          noFeatured.push(item);
          nFUpdated += 1;
        } else {
          // Produto novo sem decisão (ou payload decidiu): grava o valor.
          if (item.is_featured === undefined) {
            item.is_featured = false;
            item.is_featured_expires_at = null;
          }
          withFeatured.push(item);
          if (existing) wFUpdated += 1; else wFCreated += 1;
        }
      }

      // Os 2 batches são requisições separadas, sem transação — contabiliza
      // cada batch confirmado antes de tentar o seguinte: falha no 2º não
      // esconde as gravações do 1º (partial, não zero).
      let chunkPersisted = 0;
      let chunkPersistedCreated = 0;
      let chunkPersistedUpdated = 0;
      try {
        for (const batch of [
          { rows: withFeatured, created: wFCreated, updated: wFUpdated },
          { rows: noFeatured, created: nFCreated, updated: nFUpdated },
        ]) {
          if (batch.rows.length === 0) continue;
          const { error: upsertBySkuError } = await supabase
            .from('products')
            .upsert(batch.rows as never, { onConflict: 'sku', ignoreDuplicates: false });
          chunkRoundtrips += 1;
          if (upsertBySkuError) throw upsertBySkuError;
          chunkPersistedCreated += batch.created;
          chunkPersistedUpdated += batch.updated;
          chunkPersisted += batch.rows.length;
        }
      } catch (upsertErr) {
        const upsertErrMsg = upsertErr instanceof Error ? upsertErr.message : 'Unknown error';
        const remaining = chunk.length - chunkPersisted;
        throw new Error(
          `${upsertErrMsg} — ${chunkPersisted} gravado(s) antes da falha, ${remaining} pendente(s)`,
        );
      }

      created += chunkPersistedCreated;
      updated += chunkPersistedUpdated;
      processed += chunkPersisted;
      db_roundtrips += chunkRoundtrips;

      const chunkDuration = Date.now() - chunkStart;
      chunk_metrics.push({
        chunk: index + 1,
        received: chunk.length,
        processed: chunkPersisted,
        duration_ms: chunkDuration,
        db_roundtrips: chunkRoundtrips,
        created: chunkPersistedCreated,
        updated: chunkPersistedUpdated,
        failed: 0,
      });

      console.log(
        `[product-webhook][chunk ${index + 1}] received=${chunk.length} processed=${chunkPersisted} duration_ms=${chunkDuration} db_roundtrips=${chunkRoundtrips}`,
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      failed += chunk.length;
      errors.push(`chunk_${index + 1}: ${errMsg}`);
      db_roundtrips += chunkRoundtrips;
      chunk_metrics.push({
        chunk: index + 1,
        received: chunk.length,
        processed: 0,
        duration_ms: Date.now() - chunkStart,
        db_roundtrips: chunkRoundtrips,
        created: 0,
        updated: 0,
        failed: chunk.length,
      });
      console.error(`[product-webhook][chunk ${index + 1}] failed:`, err);
    }
  }

  if (rejected.length) {
    failed += rejected.length;
    errors.push(
      `rejected_unresolved: ${rejected.length} produto(s) sem NOT NULL resolvido ` +
        `(ex: ${rejected.slice(0, 5).join('; ')})`,
    );
  }

  return {
    created,
    updated,
    failed,
    processed,
    errors,
    warnings,
    db_roundtrips,
    duration_ms: Date.now() - startedAt,
    chunk_metrics,
  };
}

// category_id/supplier_id chegam do Bitrix como ID numérico ou nome — o banco
// exige UUID NOT NULL. Resolvemos contra categories (bitrix_id, depois name) e
// suppliers (code, depois name). Sem resolução, todo upsert morre em 23502.
// Maps resolvem para `null` quando a chave é ambígua (ex.: duas categorias
// homônimas em ramos diferentes) — lookup ambíguo cai em "não resolvido" em
// vez de gravar na entidade errada.
type EntityResolvers = {
  categoryByBitrixId: Map<number, string | null>;
  categoryByName: Map<string, string | null>;
  supplierByCode: Map<string, string | null>;
  supplierByName: Map<string, string | null>;
  // Ids vivos da tabela — `null` quando a consulta falhou e UUIDs de payload
  // não podem ser verificados (passthrough: o banco decide com a FK 23503).
  categoryIds: Set<string> | null;
  supplierIds: Set<string> | null;
};

const normalizeKey = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

const setKey = <K>(map: Map<K, string | null>, key: K, id: string | null | undefined) => {
  if (id == null) return;
  const prev = map.get(key);
  // MESMO id lido de novo (linha capturada 2x por deslocamento de página)
  // não é ambiguidade — só ids diferentes disputando a chave tornam-na null.
  if (prev === undefined) map.set(key, id);
  else if (prev !== id) map.set(key, null);
};

// PostgREST capa cada resposta em ~1000 linhas (max_rows do painel) —
// .limit() maior não ajuda; pagina com .range() até esgotar. Falha da
// consulta retorna null e NÃO invalida o mapa da outra entidade.
async function fetchAllRows<T>(
  supabase: SupabaseClient<Database>,
  table: string,
  columns: string,
  pageSize = 800,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table as never)
      .select(columns)
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error(`[product-webhook] falha ao ler ${table}:`, error);
      return null;
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) return rows;
  }
}

async function buildEntityResolvers(
  supabase: SupabaseClient<Database>,
): Promise<EntityResolvers> {
  type CategoryRow = { id: string; name: string | null; bitrix_id: number | null };
  type SupplierRow = { id: string; name: string | null; code: string | null };
  const [categories, suppliers] = await Promise.all([
    fetchAllRows<CategoryRow>(supabase, 'categories', 'id,name,bitrix_id'),
    fetchAllRows<SupplierRow>(supabase, 'suppliers', 'id,name,code'),
  ]);
  const categoryByBitrixId = new Map<number, string | null>();
  const categoryByName = new Map<string, string | null>();
  for (const row of categories ?? []) {
    if (typeof row.bitrix_id === 'number') setKey(categoryByBitrixId, row.bitrix_id, row.id);
    if (row.name) setKey(categoryByName, normalizeKey(row.name), row.id);
  }
  const supplierByCode = new Map<string, string | null>();
  const supplierByName = new Map<string, string | null>();
  for (const row of suppliers ?? []) {
    if (row.code) setKey(supplierByCode, normalizeKey(row.code), row.id);
    if (row.name) setKey(supplierByName, normalizeKey(row.name), row.id);
  }
  return {
    categoryByBitrixId,
    categoryByName,
    supplierByCode,
    supplierByName,
    categoryIds: categories ? new Set(categories.map((r) => r.id)) : null,
    supplierIds: suppliers ? new Set(suppliers.map((r) => r.id)) : null,
  };
}

function resolveCategoryUuid(
  product: ProductPayload,
  resolvers: EntityResolvers | null,
): string | null {
  const raw = product.category_id;
  const asString = typeof raw === 'string' ? raw.trim() : null;
  // UUID com a tabela carregada: valida existência — UUID morto vira
  // "não resolvido" honesto em vez de 23503 na FK.
  if (typeof raw === 'string' && isUUID(raw)) {
    // banco devolve UUID canônico minúsculo — normaliza antes do Set.has,
    // senão UUID maiúsculo rejeita uma referência que existe.
    const uuid = raw.toLowerCase();
    if (!resolvers || resolvers.categoryIds === null) return uuid;
    return resolvers.categoryIds.has(uuid) ? uuid : null;
  }
  const numeric =
    typeof raw === 'number' && Number.isInteger(raw)
      ? raw
      : asString !== null && /^\d+$/.test(asString)
        ? Number(asString)
        : null;
  if (resolvers) {
    if (numeric !== null) {
      const hit = resolvers.categoryByBitrixId.get(numeric);
      if (hit) return hit;
    }
    for (const candidate of [product.category_name, product.subcategory]) {
      if (typeof candidate !== 'string') continue;
      const hit = resolvers.categoryByName.get(normalizeKey(candidate));
      if (hit) return hit;
    }
    // category_id em string não-numérica ainda pode ser o próprio nome.
    if (asString !== null && asString.length > 0) {
      const hit = resolvers.categoryByName.get(normalizeKey(asString));
      if (hit) return hit;
    }
  }
  return null;
}

function resolveSupplierUuid(
  product: ProductPayload,
  resolvers: EntityResolvers | null,
): string | null {
  const raw = product.supplier_id;
  if (typeof raw === 'string' && isUUID(raw)) {
    const uuid = raw.toLowerCase();
    if (!resolvers || resolvers.supplierIds === null) return uuid;
    return resolvers.supplierIds.has(uuid) ? uuid : null;
  }
  if (resolvers) {
    for (const candidate of [raw, product.supplier_name]) {
      if (typeof candidate !== 'string' && typeof candidate !== 'number') continue;
      const key = normalizeKey(String(candidate));
      if (resolvers.supplierByCode.has(key)) {
        // Chave existe como código: resolve direto ou é ambíguo (ex.: 'ABC'
        // e 'abc' coexistem). `??` para nome com a MESMA chave amarraria
        // num fornecedor homônimo errado — ambiguidade = não resolvido.
        const hit = resolvers.supplierByCode.get(key);
        if (hit) return hit;
        continue;
      }
      const hit = resolvers.supplierByName.get(key);
      if (hit) return hit;
    }
  }
  return null;
}

function normalizeProduct(
  product: ProductPayload,
  resolvers: EntityResolvers | null,
): NormalizedProduct {
  const stockQty = product.stock ?? 0;
  const isActive = product.is_active !== false;
  const categoryId = resolveCategoryUuid(product, resolvers);
  const supplierId = resolveSupplierUuid(product, resolvers);
  // featured_expires_at AUSENTE ≠ null explícito: sem decisão da integração,
  // omitir as duas colunas preserva destaque/expiração de produto existente —
  // um sync de preço não pode derrubar um destaque ativo. featured:false
  // explícito limpa os dois. featured:true só grava quando expires vem junto
  // (chk_products_featured_requires_expires exige expires com is_featured=true).
  const featuredCols: Pick<NormalizedProduct, 'is_featured' | 'is_featured_expires_at'> = {};
  if (product.featured_expires_at !== undefined) {
    const expires = product.featured_expires_at ?? null;
    featuredCols.is_featured = product.featured === true && expires !== null;
    featuredCols.is_featured_expires_at = expires;
  } else if (product.featured === false) {
    featuredCols.is_featured = false;
    featuredCols.is_featured_expires_at = null;
  }
  // Merge metadata + kit_items into schema_json (single jsonb column).
  const schemaJson: Record<string, unknown> = {
    ...((product.metadata || {}) as Record<string, unknown>),
    ...(Array.isArray(product.kit_items) && product.kit_items.length > 0
      ? { kit_items: product.kit_items }
      : {}),
  };
  // video_url from V1 payload → videos[] array expected by DB column.
  const videos = product.video_url ? [{ url: product.video_url }] : [];

  return {
    sku: product.sku,
    sku_promo: product.sku, // CHECK chk_products_sku_promo_equals_sku exige igualdade
    name: product.name,
    description: product.description || null,
    sale_price: product.price,       // webhook 'price' field = sale_price in DB
    min_quantity: product.min_quantity || 1,
    category_id: categoryId,
    supplier_id: supplierId,
    brand: product.supplier_name || null,
    stock_quantity: stockQty,
    is_stockout: stockQty <= 0,
    sync_status: 'synced',
    is_kit: product.is_kit || false,
    is_active: isActive,
    ...featuredCols,
    is_new: product.new_arrival || false,
    is_on_sale: product.on_sale || false,
    images: product.images || [],
    videos,
    colors: product.colors || [],
    materials: product.materials || [],
    tags: product.tags || {},
    variations: product.variations || [],
    schema_json: schemaJson,
    last_sync_at: new Date().toISOString(),
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunked.push(items.slice(i, i + size));
  }
  return chunked;
}

