/**
 * useSellerCarts.helpers — tipos, constantes, helpers de domínio e data-access
 * extraídos de useSellerCarts.ts (refatoração pura, sem mudança de comportamento).
 */

import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CartVersionConflictError } from '@/lib/carts/cart-version-conflict';
import { sanitizeError } from '@/lib/security/sanitize-error';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';

export const cartDeleteLog = createClientLogger('cart.delete');

/** Sentinel: DELETE respondeu 2xx mas nenhuma linha foi removida (RLS silencioso ou id já removido). */
export class CartDeleteZeroRowsError extends Error {
  public readonly code = 'cart_delete_zero_rows' as const;
  constructor(message = 'Nenhuma linha foi removida.') {
    super(message);
    this.name = 'CartDeleteZeroRowsError';
  }
}

/** Teto máximo de carrinhos simultâneos por vendedor (enforcement client-side; backend não impõe). */
export const MAX_SELLER_CARTS = 50;

/** Mensagem padrão (SSOT) para limite de carrinhos atingido — tooltips/aria-labels. */
export const SELLER_CART_LIMIT_REACHED_MESSAGE = `Limite de ${MAX_SELLER_CARTS} carrinhos atingido. Exclua um carrinho para criar outro.`;
/** Versão curta (para toasts e títulos compactos). */
export const SELLER_CART_LIMIT_REACHED_SHORT = `Limite de ${MAX_SELLER_CARTS} carrinhos atingido`;

/**
 * Detecta se um erro do Supabase corresponde ao limite de carrinhos.
 * Fallback robusto: cobre code 23514 (check_violation), P0001 (RAISE genérico)
 * e variações de mensagem (caso o trigger mude o texto no futuro).
 */
export function isCartLimitError(
  err: { code?: string; message?: string | null } | null | undefined,
): boolean {
  if (!err) return false;
  if (err.code === '23514' || err.code === 'P0001') return true;
  const msg = err.message ?? '';
  return /Limite de \d+ carrinhos?/i.test(msg) || /cart.*limit|carrinho.*atingid/i.test(msg);
}

// ============================================
// TYPES
// ============================================

export interface SellerCart {
  id: string;
  seller_id: string;
  company_id: string;
  company_name: string;
  company_location: string | null;
  company_logo_url: string | null;
  notes: string | null;
  status: CartStatus;
  /** Prazo p/ envio: data limite (YYYY-MM-DD) para enviar o pedido ao cliente. Null quando não definido. */
  shipping_deadline: string | null;
  created_at: string;
  updated_at: string;
  /**
   * Coluna `seller_carts.version`, incrementada pelo trigger
   * `trg_seller_carts_version` a cada UPDATE real. Optimistic lock das mutações
   * de campos do carrinho (notas, status, prazo). Opcional: fixtures e caches
   * anteriores à coluna não a têm — nesse caso a mutação não condiciona.
   */
  version?: number;
  items: SellerCartItem[];
  /**
   * Correlation ID transitório (não persistido) atribuído em `deleteCart` e
   * propagado para os eventos `restore_start` / `restore_ok` / `restore_failed`
   * a fim de correlacionar o fluxo delete→undo no logger e no Sentry.
   */
  _correlation_id?: string;
}

/** Métricas retornadas pela RPC `restore_seller_cart`. */
export interface RestoreCartMetrics {
  /** Total de itens no snapshot enviado à RPC. */
  items_total: number;
  /** Itens efetivamente inseridos (após dedup + ON CONFLICT DO NOTHING). */
  items_inserted: number;
  /** Itens deduplicados por (product_id, color_name) — quantidades foram somadas. */
  items_deduped: number;
}

/** SellerCart devolvido pela mutation de restore, com métricas da RPC anexadas. */
export interface RestoredSellerCart extends SellerCart {
  restore_metrics: RestoreCartMetrics;
}

export interface SellerCartItem {
  id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  product_price: number;
  quantity: number;
  color_name: string | null;
  color_hex: string | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface AddToCartInput {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string;
  product_price: number;
  quantity?: number;
  color_name?: string;
  color_hex?: string;
  notes?: string | null;
  sort_order?: number;
}

export interface CreateCartInput {
  company_id: string;
  company_name: string;
  company_location?: string;
  company_logo_url?: string;
}

export type CartStatus = 'em_separacao' | 'pronto_orcamento';

// Raw row returned by Supabase nested select: `seller_carts.*, seller_cart_items(*)`
export type SellerCartRawRow = Omit<SellerCart, 'items'> & {
  seller_cart_items: SellerCartItem[];
};

interface RestorePayloadItem {
  product_id: string;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  product_price: number;
  quantity: number;
  color_name: string | null;
  color_hex: string | null;
  notes: string | null;
  sort_order: number | null;
}

interface RestorePayload {
  seller_id: string;
  company_id: string;
  company_name: string;
  company_location: string | null;
  company_logo_url: string | null;
  notes: string | null;
  status: CartStatus;
  shipping_deadline: string | null;
  items: RestorePayloadItem[];
}

interface RestoreRpcResponse {
  cart_id: string;
  items_total: number;
  items_inserted: number;
  items_deduped: number;
}

interface ErrorWithPostgrestShape {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

export const QUERY_KEY = 'seller-carts';

/**
 * Subconjunto estrutural do builder devolvido por
 * `supabase.from('seller_carts').update(...)` usado pelo guard de versão.
 */
export type SellerCartUpdateBuilder = PromiseLike<{ error: Error | null }> & {
  eq: (column: 'id' | 'version', value: number | string) => SellerCartUpdateBuilder;
  select: (columns: 'id') => PromiseLike<{ data: { id: string }[] | null; error: Error | null }>;
};

export const describeCartError = (err: unknown): string =>
  err instanceof CartVersionConflictError ? err.message : sanitizeError(err);

// ============================================
// INVARIANTE DE QUANTIDADE (espelha o CHECK do banco: 1 <= quantity <= 999999)
// ============================================
// Single source of truth para todos os caminhos de escrita (edição direta E
// mesclagem por add/move/duplicate). Antes, só updateItemQuantity clampava o
// teto; os caminhos de merge somavam `existing + qty` sem teto, podendo derivar
// acima do limite da UI e (sem o CHECK de teto) até estourar o int4 no banco.
export const MIN_ITEM_QUANTITY = 1;
export const MAX_ITEM_QUANTITY = 999999;
export const clampQuantity = (q: number): number =>
  Math.min(Math.max(Math.trunc(Number(q) || 0), MIN_ITEM_QUANTITY), MAX_ITEM_QUANTITY);

export function toSellerCart(row: SellerCartRawRow): SellerCart {
  const { seller_cart_items: rowItems, ...cart } = row;
  return {
    ...cart,
    notes: (cart.notes as string | null) ?? null,
    status: ((cart.status as string) ?? 'em_separacao') as CartStatus,
    shipping_deadline: (cart.shipping_deadline as string | null) ?? null,
    items: (rowItems ?? []) as SellerCartItem[],
  };
}

function errorCode(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const value = (input as ErrorWithPostgrestShape).code;
  // eslint-disable-next-line eqeqeq, no-eq-null -- checagem intencional de null/undefined
  return value == null ? '' : String(value);
}

function errorMessage(input: unknown): string {
  if (input instanceof Error) return input.message;
  if (!input || typeof input !== 'object') return String(input ?? '');
  const value = (input as ErrorWithPostgrestShape).message;
  // eslint-disable-next-line eqeqeq, no-eq-null -- checagem intencional de null/undefined
  return value == null ? '' : String(value);
}

function isRestoreRpcUnavailableError(input: unknown): boolean {
  const code = errorCode(input);
  const message = errorMessage(input);
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    /supabase\.rpc is not a function/i.test(message) ||
    (/restore_seller_cart/i.test(message) &&
      /schema cache|could not find|function .* does not exist|not found/i.test(message))
  );
}

function restoreVariantKey(item: RestorePayloadItem): string {
  return `${item.product_id}\u001f${item.color_name ?? '__NULL__'}`;
}

function dedupeRestorePayloadItems(items: RestorePayloadItem[]): RestorePayloadItem[] {
  const deduped = new Map<string, RestorePayloadItem>();

  for (const item of items) {
    if (!item.product_id) continue;
    const key = restoreVariantKey(item);
    const current = deduped.get(key);
    if (!current) {
      deduped.set(key, { ...item, quantity: clampQuantity(item.quantity) });
      continue;
    }
    deduped.set(key, {
      ...current,
      quantity: clampQuantity(current.quantity + item.quantity),
      product_name: current.product_name || item.product_name,
      product_sku: current.product_sku ?? item.product_sku,
      product_image_url: current.product_image_url ?? item.product_image_url,
      product_price: current.product_price || item.product_price,
      color_hex: current.color_hex ?? item.color_hex,
      notes: current.notes ?? item.notes,
      sort_order:
        // eslint-disable-next-line eqeqeq, no-eq-null -- checagem intencional de null/undefined
        current.sort_order == null
          ? item.sort_order
          : // eslint-disable-next-line eqeqeq, no-eq-null -- checagem intencional de null/undefined
            item.sort_order == null
            ? current.sort_order
            : Math.min(current.sort_order, item.sort_order),
    });
  }

  return Array.from(deduped.values());
}

// ============================================
// DATA-ACCESS (ex-closures do hook; userId passa a ser parâmetro explícito)
// ============================================

export const findVariantInCart = async (
  cartId: string,
  productId: string,
  colorName: string | null,
): Promise<{ id: string; quantity: number } | null> => {
  const base = supabase
    .from('seller_cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId);
  const { data } = await (
    colorName === null ? base.is('color_name', null) : base.eq('color_name', colorName)
  ).maybeSingle();
  return data ?? null;
};

export const fetchCartWithItems = async (
  userId: string | undefined,
  cartId: string,
): Promise<SellerCart | null> => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('seller_carts')
    .select('*, seller_cart_items(*)')
    .eq('id', cartId)
    .eq('seller_id', userId)
    .order('sort_order', { ascending: true, foreignTable: 'seller_cart_items' })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toSellerCart(data as unknown as SellerCartRawRow);
};

export const buildRestorePayload = (
  userId: string | undefined,
  snapshot: SellerCart,
): RestorePayload => ({
  seller_id: userId ?? '',
  company_id: snapshot.company_id,
  company_name: snapshot.company_name,
  company_location: snapshot.company_location ?? null,
  company_logo_url: snapshot.company_logo_url ?? null,
  notes: snapshot.notes ?? null,
  status: snapshot.status,
  shipping_deadline: snapshot.shipping_deadline ?? null,
  items: (snapshot.items ?? []).map((it) => ({
    product_id: it.product_id,
    product_name: it.product_name,
    product_sku: it.product_sku ?? null,
    product_image_url: it.product_image_url ?? null,
    product_price: it.product_price,
    quantity: clampQuantity(it.quantity ?? 1),
    color_name: it.color_name ?? null,
    color_hex: it.color_hex ?? null,
    notes: it.notes ?? null,
    sort_order: it.sort_order ?? null,
  })),
});

export const restoreViaRpc = async (payload: RestorePayload): Promise<RestoreRpcResponse> => {
  const { data, error } = await supabase.rpc('restore_seller_cart', {
    _snapshot: payload as never,
  });

  if (error) throw error;

  const result = data as RestoreRpcResponse | null;
  const newCartId = result?.cart_id;
  if (!newCartId) throw new Error('restore_seller_cart não retornou cart_id');
  return {
    cart_id: newCartId,
    items_total: Number(result.items_total ?? 0),
    items_inserted: Number(result.items_inserted ?? 0),
    items_deduped: Number(result.items_deduped ?? 0),
  };
};

export const restoreViaClientFallback = async (
  userId: string | undefined,
  payload: RestorePayload,
): Promise<RestoreRpcResponse> => {
  if (!userId) throw new Error('Não autenticado');
  const dedupedItems = dedupeRestorePayloadItems(payload.items);
  const insertedIds: string[] = [];

  const { data: cartData, error: cartError } = await supabase
    .from('seller_carts')
    .insert({
      seller_id: userId,
      company_id: payload.company_id,
      company_name: payload.company_name,
      company_location: payload.company_location,
      company_logo_url: payload.company_logo_url,
      notes: payload.notes,
      status: payload.status,
      shipping_deadline: payload.shipping_deadline,
    })
    .select('id')
    .single();

  if (cartError) throw cartError;
  const newCartId = cartData?.id;
  if (!newCartId) throw new Error('Restauração não retornou id do carrinho');

  try {
    if (dedupedItems.length > 0) {
      const { data: insertedItems, error: itemsError } = await supabase
        .from('seller_cart_items')
        .insert(
          dedupedItems.map((item) => ({
            cart_id: newCartId,
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            product_image_url: item.product_image_url,
            product_price: item.product_price,
            quantity: item.quantity,
            color_name: item.color_name,
            color_hex: item.color_hex,
            notes: item.notes,
            sort_order: item.sort_order,
          })),
        )
        .select('id');

      if (itemsError) throw itemsError;
      insertedIds.push(...((insertedItems ?? []) as { id: string }[]).map((item) => item.id));
    }
  } catch (err) {
    if (insertedIds.length > 0) {
      await supabase.from('seller_cart_items').delete().in('id', insertedIds);
    }
    await supabase.from('seller_carts').delete().eq('id', newCartId).eq('seller_id', userId);
    throw err;
  }

  return {
    cart_id: newCartId,
    items_total: dedupedItems.length,
    items_inserted: dedupedItems.length,
    items_deduped: Math.max(0, payload.items.length - dedupedItems.length),
  };
};

// ============================================
// MUTATION FNS (corpos das mutations do hook)
// ============================================

export const duplicateSellerCart = async (args: {
  userId: string | undefined;
  carts: SellerCart[];
  queryClient: QueryClient;
  sourceCartId: string;
}): Promise<string> => {
  const { userId, carts, queryClient, sourceCartId } = args;
  if (!userId) {
    const err = new Error('Sessão expirada. Faça login novamente para duplicar o carrinho.');
    (err as Error & { code?: string }).code = 'AUTH';
    throw err;
  }
  const sourceCart = carts.find((c) => c.id === sourceCartId);
  if (!sourceCart) {
    const err = new Error('Carrinho de origem não encontrado. Atualize a lista e tente novamente.');
    (err as Error & { code?: string }).code = 'NOT_FOUND';
    throw err;
  }

  // Validação prévia: garante NOT NULLs de product_name/product_price nos itens
  const invalidItems = sourceCart.items.filter(
    (i) =>
      !i.product_id ||
      !i.product_name ||
      typeof i.product_price !== 'number' ||
      Number.isNaN(i.product_price),
  );
  if (invalidItems.length > 0) {
    const err = new Error(
      `Não é possível duplicar: ${invalidItems.length} item(ns) com dados incompletos (nome ou preço ausentes).`,
    );
    (err as Error & { code?: string }).code = 'VALIDATION';
    throw err;
  }

  // Create new cart
  const { data: newCart, error: cartErr } = await supabase
    .from('seller_carts')
    .insert({
      seller_id: userId,
      company_id: sourceCart.company_id,
      company_name: sourceCart.company_name,
      company_location: sourceCart.company_location,
      company_logo_url: sourceCart.company_logo_url,
    })
    .select()
    .maybeSingle();
  if (cartErr) {
    if (isCartLimitError(cartErr)) {
      const err = new Error(
        `Você já tem ${MAX_SELLER_CARTS} carrinhos ativos. Finalize ou exclua um antes de duplicar.`,
      );
      (err as Error & { code?: string }).code = 'LIMIT';
      throw err;
    }
    throw cartErr;
  }
  if (!newCart) {
    const err = new Error(
      'O carrinho foi criado mas não pôde ser lido de volta (RLS). Recarregue a página.',
    );
    (err as Error & { code?: string }).code = 'RLS';
    throw err;
  }

  // Copy items
  if (sourceCart.items.length > 0) {
    const newItems = sourceCart.items.map((i) => ({
      cart_id: newCart.id,
      product_id: i.product_id,
      product_name: i.product_name,
      product_sku: i.product_sku,
      product_image_url: i.product_image_url,
      product_price: i.product_price,
      quantity: clampQuantity(i.quantity),
      color_name: i.color_name,
      color_hex: i.color_hex,
      notes: i.notes,
      sort_order: i.sort_order,
    }));
    const { error: itemsErr } = await supabase.from('seller_cart_items').insert(newItems);
    if (itemsErr) {
      // Compensação: a cópia dos itens falhou. Sem isso, sobraria um
      // carrinho vazio órfão consumindo o limite de 3 (canCreateCart) e
      // poluindo a lista. Remove o carrinho recém-criado e propaga o erro.
      const { error: cleanupErr } = await supabase
        .from('seller_carts')
        .delete()
        .eq('id', newCart.id);
      if (cleanupErr) {
        const err = new Error(
          `Falha ao inserir itens e ao limpar carrinho criado. Recarregue e verifique se restou um carrinho vazio.`,
        );
        (err as Error & { code?: string }).code = 'CLEANUP';
        throw err;
      }
      throw itemsErr;
    }
  }

  // Polling: refetch até o novo carrinho aparecer na query cache
  // (até 5 tentativas x 400ms = 2s). Evita inconsistência quando a
  // replicação/latência do PostgREST atrasa a leitura.
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    const fresh = queryClient.getQueryData<SellerCart[]>([QUERY_KEY, userId]);
    if (fresh?.some((c) => c.id === newCart.id)) break;
    if (attempt < maxAttempts - 1) {
      await new Promise<void>((r) => {
        setTimeout(r, 400);
      });
    }
  }

  return newCart.id;
};

export const moveSellerCartItem = async (args: {
  itemId: string;
  targetCartId: string;
  carts: SellerCart[];
}): Promise<void> => {
  const { itemId, targetCartId, carts } = args;
  const item = carts.flatMap((c) => c.items).find((i) => i.id === itemId);
  if (!item) throw new Error('Item não encontrado');

  // Se o carrinho destino já tiver a mesma variante, um UPDATE puro de
  // cart_id violaria unique_cart_item_variant. Mesclamos: soma a quantidade
  // no item existente do destino e remove o item de origem.
  const existing = await findVariantInCart(targetCartId, item.product_id, item.color_name);
  if (existing && existing.id !== itemId) {
    const previousQty = existing.quantity;
    const projected = previousQty + item.quantity;
    // Rejeita antes de qualquer escrita: mover com overflow silenciosamente
    // apagaria unidades que não cabem no destino. Falhar é mais seguro que
    // perder quantidade.
    if (projected > MAX_ITEM_QUANTITY) {
      throw new Error(
        `A quantidade combinada (${projected.toLocaleString('pt-BR')}) excede o limite de ${MAX_ITEM_QUANTITY.toLocaleString('pt-BR')} unidades por SKU`,
      );
    }
    const { error: updErr } = await supabase
      .from('seller_cart_items')
      .update({ quantity: projected })
      .eq('id', existing.id);
    if (updErr) throw updErr;
    const { error: delErr } = await supabase.from('seller_cart_items').delete().eq('id', itemId);
    if (delErr) {
      // Compensação condicional: reverte o destino só se a quantidade ainda
      // for o valor que escrevemos. Se outra aba/usuário alterou o destino
      // entre o UPDATE e este rollback, o .eq('quantity', projected) evita
      // sobrescrever a mudança deles com o valor obsoleto.
      const { data: rollbackData, error: rollbackErr } = await supabase
        .from('seller_cart_items')
        .update({ quantity: previousQty })
        .eq('id', existing.id)
        .eq('quantity', projected)
        .select('id');
      if (rollbackErr) {
        throw new Error(
          `Falha ao mover item (delete: ${delErr.message}; compensação: ${rollbackErr.message}) — recarregue para verificar o estado`,
        );
      }
      if (!rollbackData?.length) {
        throw new Error(
          `Falha ao mover item (delete: ${delErr.message}; compensação: destino já modificado por outra operação) — recarregue para verificar o estado`,
        );
      }
      throw delErr;
    }
    return;
  }

  const { error } = await supabase
    .from('seller_cart_items')
    .update({ cart_id: targetCartId })
    .eq('id', itemId);
  if (error) throw error;
};

export const duplicateSellerCartItem = async (args: {
  itemId: string;
  targetCartId: string;
  carts: SellerCart[];
}): Promise<void> => {
  const { itemId, targetCartId, carts } = args;
  // Find the item in current carts
  const allItems = carts.flatMap((c) => c.items);
  const item = allItems.find((i) => i.id === itemId);
  if (!item) throw new Error('Item não encontrado');

  // Mescla se o destino já tiver a variante (evita 23505 do unique constraint).
  const existing = await findVariantInCart(targetCartId, item.product_id, item.color_name);
  if (existing) {
    const projected = existing.quantity + item.quantity;
    if (projected > MAX_ITEM_QUANTITY) {
      throw new Error(
        `A quantidade combinada (${projected.toLocaleString('pt-BR')}) excede o limite de ${MAX_ITEM_QUANTITY.toLocaleString('pt-BR')} unidades por SKU`,
      );
    }
    const { error } = await supabase
      .from('seller_cart_items')
      .update({ quantity: projected })
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('seller_cart_items').insert({
    cart_id: targetCartId,
    product_id: item.product_id,
    product_name: item.product_name,
    product_sku: item.product_sku,
    product_image_url: item.product_image_url,
    product_price: item.product_price,
    quantity: clampQuantity(item.quantity),
    color_name: item.color_name,
    color_hex: item.color_hex,
    notes: item.notes,
    // sort_order omitido: o trigger assign_cart_item_sort_order atribui o
    // próximo valor gapless no destino (copiar o do origem causaria colisão de ordem).
  });
  if (error) throw error;
};

export const restoreSellerCartItems = async (args: {
  cartId: string;
  items: AddToCartInput[];
}): Promise<void> => {
  const { cartId, items } = args;
  if (items.length === 0) return;

  // Promise.all é seguro aqui: o constraint unique_cart_item_variant garante que
  // o carrinho origem nunca tinha itens duplicados por (product_id, color_name),
  // portanto não há disputa de linha entre as corrotinas paralelas.
  // Per-item find+update/insert (em vez de upsert) mantém compatibilidade com
  // NULL color_name (PostgREST não infere IS NULL em onConflict).
  await Promise.all(
    items.map(async (item) => {
      const colorName = item.color_name ?? null;
      const safeQty = clampQuantity(item.quantity ?? 1);

      const existing = await findVariantInCart(cartId, item.product_id, colorName);
      if (existing) {
        // Mescla: se outro processo adicionou o mesmo item durante o intervalo do
        // undo, somamos ao invés de sobrescrever — evita perder unidades adicionadas
        // entre o clear e o restore. clampQuantity garante o teto de 999999.
        const { error } = await supabase
          .from('seller_cart_items')
          .update({
            quantity: clampQuantity(existing.quantity + safeQty),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('seller_cart_items').insert({
          cart_id: cartId,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku || null,
          product_image_url: item.product_image_url || null,
          product_price: item.product_price,
          quantity: safeQty,
          color_name: colorName,
          color_hex: item.color_hex || null,
          notes: item.notes ?? null,
          sort_order: item.sort_order ?? null,
        });
        if (error) throw error;
      }
    }),
  );

  // updated_at do carrinho-pai é propagado pelo trigger
  // trg_touch_seller_cart_on_item_change (migration 20260617130000).
};

export const restoreSellerCartSnapshot = async (
  userId: string | undefined,
  snapshot: SellerCart,
): Promise<RestoredSellerCart> => {
  if (!userId) throw new Error('Não autenticado');

  // Payload enxuto: apenas o que a RPC lê. Descarta id/timestamps por design.
  const payload = buildRestorePayload(userId, snapshot);
  let result: RestoreRpcResponse;
  try {
    result = await restoreViaRpc(payload);
  } catch (err) {
    if (isCartLimitError(err as { code?: string; message?: string | null })) {
      throw new Error(
        `Você já tem ${MAX_SELLER_CARTS} carrinhos ativos. Finalize ou exclua um antes de restaurar.`,
      );
    }
    if (!isRestoreRpcUnavailableError(err)) throw err;

    cartDeleteLog.warn('cart_restore_rpc_unavailable_fallback', {
      snapshot_id: snapshot.id,
      items_total: payload.items.length,
      error: errorMessage(err),
    });
    result = await restoreViaClientFallback(userId, payload);
  }

  cartDeleteLog.info('cart_restore_ok', {
    cart_id: result.cart_id,
    items_total: result.items_total,
    items_inserted: result.items_inserted,
    items_deduped: result.items_deduped,
  });

  return {
    id: result.cart_id,
    seller_id: userId,
    company_id: snapshot.company_id,
    company_name: snapshot.company_name,
    company_location: snapshot.company_location ?? null,
    company_logo_url: snapshot.company_logo_url ?? null,
    notes: snapshot.notes ?? null,
    status: snapshot.status,
    shipping_deadline: snapshot.shipping_deadline ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: snapshot.items ?? [],
    restore_metrics: {
      items_total: result.items_total,
      items_inserted: result.items_inserted,
      items_deduped: result.items_deduped,
    },
  } satisfies RestoredSellerCart;
};
