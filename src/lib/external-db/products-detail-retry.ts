/**
 * Busca da linha do produto (fetchById) com fallback de colunas e retry de erros transitórios.
 */
import { dbInvoke, type InvokeResult } from '@/lib/db/postgrest';
import { toErrorMessage } from '@/lib/to-error-message';
import {
  type PromobrindProduct,
  PRODUCT_SELECT_FIELDS_WITH_SALE,
  PRODUCT_SELECT_FIELDS_WITH_SALE_NO_THRESHOLD,
  PRODUCT_SELECT_FIELDS_LEGACY,
  PRODUCT_SELECT_FIELDS_LEGACY_NO_THRESHOLD,
  PRODUCT_SELECT_FIELDS_DETAIL,
  PRODUCT_SELECT_FIELDS_DETAIL_NO_THRESHOLD,
  shouldFallbackSelect,
} from './product-types';

export async function fetchProductWithRetry(
  productId: string,
  maxRetries = 2,
  signal?: AbortSignal,
): Promise<InvokeResult<PromobrindProduct>> {
  const selectFields = [
    // Full row first: the admin edit form round-trips ~90 columns and writes them all
    // back, so it MUST load the complete record — otherwise unselected columns (ncm,
    // fiscal, SEO, internal dims, packaging, marketing, flags…) would be overwritten
    // with nulls on save. v_products_public is a 1:1 projection, so '*' is the full row.
    '*',
    PRODUCT_SELECT_FIELDS_DETAIL,
    PRODUCT_SELECT_FIELDS_DETAIL_NO_THRESHOLD,
    PRODUCT_SELECT_FIELDS_WITH_SALE,
    PRODUCT_SELECT_FIELDS_WITH_SALE_NO_THRESHOLD,
    PRODUCT_SELECT_FIELDS_LEGACY,
    PRODUCT_SELECT_FIELDS_LEGACY_NO_THRESHOLD,
  ];
  let lastError: unknown;
  for (const selectField of selectFields) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await dbInvoke<PromobrindProduct>({
          table: 'products',
          operation: 'select',
          filters: { id: productId },
          select: selectField,
          limit: 1,
          signal,
        });
      } catch (err) {
        lastError = err;
        if (signal?.aborted) throw err; // cancelado pelo chamador (timeout da PDP): não tenta de novo
        if (shouldFallbackSelect(err)) break; // try next select fields
        if (isTransientError(err) && attempt < maxRetries) {
          await new Promise((r) => {
            setTimeout(r, 1000 * (attempt + 1));
          });
          continue;
        }
        if (!isTransientError(err)) throw err;
      }
    }
  }
  throw lastError;
}

function isTransientError(err: unknown): boolean {
  const msg = toErrorMessage(err);
  return /(timeout|statement timeout|canceling statement|schema cache|retrying|ECONNRESET|fetch failed)/i.test(
    msg,
  );
}
