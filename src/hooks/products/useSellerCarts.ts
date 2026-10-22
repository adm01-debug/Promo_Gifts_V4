/**
 * useSellerCarts - Hook para gerenciar carrinhos de vendedor
 * Persiste no banco de dados, máx MAX_SELLER_CARTS carrinhos simultâneos
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/security/sanitize-error';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import { CartVersionConflictError } from '@/lib/carts/cart-version-conflict';
import { isBadJwtError, maybeRecoverFromError } from '@/lib/auth/session-recovery';
import { SELLER_CART_TOASTS } from './sellerCartToasts';
import {
  cartDeleteLog,
  CartDeleteZeroRowsError,
  MAX_SELLER_CARTS,
  MIN_ITEM_QUANTITY,
  SELLER_CART_LIMIT_REACHED_SHORT,
  clampQuantity,
  describeCartError,
  QUERY_KEY,
  toSellerCart,
  isCartLimitError,
  findVariantInCart,
  fetchCartWithItems,
  duplicateSellerCart,
  moveSellerCartItem,
  duplicateSellerCartItem,
  restoreSellerCartItems,
  restoreSellerCartSnapshot,
  type SellerCart,
  type AddToCartInput,
  type CreateCartInput,
  type CartStatus,
  type SellerCartRawRow,
  type SellerCartUpdateBuilder,
  type RestoredSellerCart,
} from './useSellerCarts.helpers';

export { CartVersionConflictError } from '@/lib/carts/cart-version-conflict';
export {
  CartDeleteZeroRowsError,
  MAX_SELLER_CARTS,
  MIN_ITEM_QUANTITY,
  SELLER_CART_LIMIT_REACHED_MESSAGE,
  SELLER_CART_LIMIT_REACHED_SHORT,
  MAX_ITEM_QUANTITY,
  clampQuantity,
} from './useSellerCarts.helpers';

export type {
  SellerCart,
  RestoreCartMetrics,
  RestoredSellerCart,
  SellerCartItem,
  AddToCartInput,
  CreateCartInput,
  CartStatus,
} from './useSellerCarts.helpers';

const log = createClientLogger('carts.useSellerCarts');

// ============================================
// HOOK
// ============================================
export function useSellerCarts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // Fetch all carts with items — único round-trip via PostgREST nested select.
  const cartsQuery = useQuery<SellerCart[]>({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('seller_carts')
        .select('*, seller_cart_items(*)')
        .eq('seller_id', userId)
        .order('updated_at', { ascending: false })
        .order('sort_order', { ascending: true, foreignTable: 'seller_cart_items' });

      if (error) throw error;
      if (!data?.length) return [];

      return data.map((row) => toSellerCart(row as unknown as SellerCartRawRow));
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  // Optimistic locking: quando o cache conhece `version`, o UPDATE só se aplica
  // se o banco ainda estiver nessa versão (0 linhas = outra aba/dispositivo
  // salvou antes → CartVersionConflictError + refetch). Sem versão no cache,
  // comportamento anterior (UPDATE incondicional por id).
  const applyCartUpdate = async (update: SellerCartUpdateBuilder, cartId: string) => {
    const expected = (cartsQuery.data ?? []).find((c) => c.id === cartId)?.version;
    if (typeof expected !== 'number') {
      const { error } = await update.eq('id', cartId);
      if (error) throw error;
      return;
    }
    const { data, error } = await update.eq('id', cartId).eq('version', expected).select('id');
    if (error) throw error;
    if (!data?.length) {
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      throw new CartVersionConflictError();
    }
  };

  // Create cart
  const createCart = useMutation({
    mutationFn: async (input: CreateCartInput) => {
      if (!userId) throw new Error('Não autenticado');
      log.warn('cart_create_start', { company_id: input.company_id });

      const { data, error } = await supabase
        .from('seller_carts')
        .insert({
          seller_id: userId,
          company_id: input.company_id,
          company_name: input.company_name,
          company_location: input.company_location || null,
          company_logo_url: input.company_logo_url || null,
        })
        .select()
        .single();

      if (error) {
        if (isCartLimitError(error)) {
          throw new Error(
            `Você já tem ${MAX_SELLER_CARTS} carrinhos ativos. Finalize ou exclua um antes de criar outro.`,
          );
        }
        throw error;
      }
      return {
        ...data,
        notes: null,
        status: 'em_separacao' as CartStatus,
        shipping_deadline: null,
        items: [],
      } as SellerCart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      toast.error('Operação falhou', { description: sanitizeError(err) });
    },
  });

  // Delete cart
  const deleteCart = useMutation<SellerCart, Error, string>({
    mutationFn: async (cartId: string) => {
      if (!userId) throw new Error('Não autenticado');

      const startedAt = performance.now();
      cartDeleteLog.info('cart_delete_start', { cart_id: cartId });

      // Snapshot server-side imediatamente antes do DELETE. Em algumas telas o
      // cache pode estar com `items: []` por hidratação parcial; se usarmos esse
      // objeto, o Undo recria um carrinho vazio. O retorno desta mutation vira o
      // snapshot canônico para os chamadores exibirem o toast de Desfazer.
      const snapshot = await fetchCartWithItems(userId, cartId);
      if (!snapshot) {
        cartDeleteLog.warn('cart_delete_snapshot_missing', { cart_id: cartId });
        throw new CartDeleteZeroRowsError('Carrinho não encontrado para remoção.');
      }

      const { data, error } = await supabase
        .from('seller_carts')
        .delete()
        .eq('id', cartId)
        .eq('seller_id', userId)
        .select('id');

      const durationMs = Math.round(performance.now() - startedAt);
      const rowsAffected = Array.isArray(data) ? data.length : 0;

      if (error) {
        cartDeleteLog.error('cart_delete_failed', {
          cart_id: cartId,
          rows_affected: rowsAffected,
          duration_ms: durationMs,
          error: error.message,
        });
        throw error;
      }

      if (rowsAffected !== 1 || data?.[0]?.id !== cartId) {
        cartDeleteLog.warn('cart_delete_zero_rows', {
          cart_id: cartId,
          rows_affected: rowsAffected,
          duration_ms: durationMs,
        });
        throw new CartDeleteZeroRowsError();
      }

      cartDeleteLog.info('cart_delete_ok', {
        cart_id: cartId,
        rows_affected: rowsAffected,
        duration_ms: durationMs,
        snapshot_items_count: snapshot.items.length,
      });
      return snapshot;
    },
    onSuccess: (deletedSnapshot) => {
      queryClient.setQueryData<SellerCart[]>(
        [QUERY_KEY, userId],
        (previous) => previous?.filter((cart) => cart.id !== deletedSnapshot.id) ?? previous,
      );
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      // Toast de sucesso é emitido pelo chamador (showUndoToast em CartsListPage/
      // CartHeaderButton) para permitir o fluxo de Desfazer. Emitir aqui geraria
      // dois toasts sobrepostos.
    },
    onError: (err: Error) => {
      if (err instanceof CartDeleteZeroRowsError) {
        toast.error('Carrinho não foi removido', {
          description:
            'O servidor respondeu, mas nenhuma linha foi afetada. Atualize a lista e tente novamente.',
        });
        return;
      }
      toast.error('Operação falhou', { description: sanitizeError(err) });
    },
  });

  // Add item to cart
  const addItem = useMutation({
    mutationFn: async ({ cartId, item }: { cartId: string; item: AddToCartInput }) => {
      const colorName = item.color_name ?? null;
      // Quantidade sempre >= 1: protege o invariante mesmo se o chamador passar 0/negativo.
      const quantityToAdd = Math.max(MIN_ITEM_QUANTITY, Math.trunc(Number(item.quantity) || 1));

      const existing = await findVariantInCart(cartId, item.product_id, colorName);

      if (existing) {
        const { error } = await supabase
          .from('seller_cart_items')
          .update({
            // clamp do TETO: somatório de adds repetidos não pode ultrapassar 999999.
            quantity: clampQuantity(existing.quantity + quantityToAdd),
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
          quantity: clampQuantity(quantityToAdd),
          color_name: colorName,
          color_hex: item.color_hex || null,
          notes: item.notes ?? null,
        });

        // Se bater no constraint (race condition), tenta o update mais uma vez
        if (error?.code === '23505') {
          const retryExisting = await findVariantInCart(cartId, item.product_id, colorName);

          if (retryExisting) {
            const { error: retryErr } = await supabase
              .from('seller_cart_items')
              .update({ quantity: clampQuantity(retryExisting.quantity + quantityToAdd) })
              .eq('id', retryExisting.id);
            if (retryErr) throw retryErr;
          } else {
            // Item desapareceu entre o INSERT falho e o retry (ex: DELETE concorrente).
            // Lançar erro evita que o produto seja silenciosamente descartado.
            throw new Error('Conflito de carrinho: tente novamente');
          }
        } else if (error) {
          throw error;
        }
      }

      // updated_at do carrinho-pai é propagado pelo trigger
      // trg_touch_seller_cart_on_item_change (migration 20260617130000) em
      // INSERT/UPDATE/DELETE — não precisamos do round-trip manual aqui.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      // JWT expirado / bad_jwt (PostgREST 401 com "JWT expired"): delega para
      // o fluxo SSOT de recuperação de sessão — ele mostra o toast "Sua sessão
      // expirou. Faça login novamente." e redireciona para /login?next=…,
      // fechando o CartSelectorDialog junto com o unmount da rota. Suprimimos
      // o toast genérico de "Falha ao adicionar" para não empilhar mensagens
      // conflitantes com a UX de sessão expirada.
      const status = (err as Error & { status?: number }).status;
      if (isBadJwtError(err) || (status === 401 && /jwt/i.test(err.message ?? ''))) {
        maybeRecoverFromError(err, 'cart.addItem');
        return;
      }
      // Copy SSOT em `sellerCartToasts.ts`. NÃO passar `duration:` —
      // dependemos do auto-dismiss padrão do sonner (~4 s) nos asserts
      // E2E (12i/12m/12n) que garantem que o toast some e não empilha.
      toast.error(SELLER_CART_TOASTS.addItemError.title, { description: sanitizeError(err) });
    },
  });

  // Remove item — com update otimista para eliminar delay percebido no popover.
  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from('seller_cart_items').delete().eq('id', itemId);
      if (error) throw error;
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<SellerCart[]>([QUERY_KEY, userId]);
      if (previous) {
        queryClient.setQueryData<SellerCart[]>(
          [QUERY_KEY, userId],
          previous.map((cart) => ({
            ...cart,
            items: cart.items.filter((it) => it.id !== itemId),
          })),
        );
      }
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData([QUERY_KEY, userId], ctx.previous);
      }
      toast.error('Não foi possível remover o item', { description: sanitizeError(err) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
  });

  // Update item quantity — otimista: reflete o clique instantaneamente e reconcilia depois.
  const updateItemQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      // Defesa em profundidade: a UI já impede valores < 1, mas garantimos aqui
      // o invariante 1 <= quantity <= 999999 (espelha o CHECK no banco) para
      // qualquer chamador programático (templates, restore, futuros callers).
      const safeQty = clampQuantity(quantity);
      const { error } = await supabase
        .from('seller_cart_items')
        .update({ quantity: safeQty })
        .eq('id', itemId);
      if (error) throw error;
    },
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<SellerCart[]>([QUERY_KEY, userId]);
      const safeQty = clampQuantity(quantity);
      if (previous) {
        queryClient.setQueryData<SellerCart[]>(
          [QUERY_KEY, userId],
          previous.map((cart) => ({
            ...cart,
            items: cart.items.map((it) => (it.id === itemId ? { ...it, quantity: safeQty } : it)),
          })),
        );
      }
      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData([QUERY_KEY, userId], ctx.previous);
      }
      toast.error('Não foi possível atualizar a quantidade', { description: sanitizeError(err) });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
  });

  // Update item notes
  const updateItemNotes = useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes: string }) => {
      const { error } = await supabase
        .from('seller_cart_items')
        .update({ notes: notes || null })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      toast.error('Não foi possível salvar a observação', { description: sanitizeError(err) });
    },
  });

  // Update item sort order
  // BUG-6 FIX: substituído de N requests paralelos (Promise.all) para 1 RPC batch.
  // Com carrinhos grandes (50-200 itens), Promise.all gerava N conexões DB e risco
  // de rate limit no PostgREST. fn_batch_update_cart_item_sort_order é O(1) roundtrip.
  const updateItemSortOrder = useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      if (items.length === 0) return;
      const { error } = await supabase.rpc('fn_batch_update_cart_item_sort_order', {
        p_updates: items,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      // Revalida do servidor para desfazer a ordem otimista que ficou parcial.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      toast.error('Não foi possível reordenar os itens', { description: sanitizeError(err) });
    },
  });

  // Update cart notes
  const updateCartNotes = useMutation({
    mutationFn: async ({ cartId, notes }: { cartId: string; notes: string }) => {
      await applyCartUpdate(supabase.from('seller_carts').update({ notes: notes || null }), cartId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      toast.error('Não foi possível salvar as observações', {
        description: describeCartError(err),
      });
    },
  });

  // Update cart status
  const updateCartStatus = useMutation({
    mutationFn: async ({ cartId, status }: { cartId: string; status: CartStatus }) => {
      // Regra de negócio (SSOT em src/lib/carts/status-transition-guard.ts):
      // só é possível marcar "pronto p/ orçamento" se o carrinho tiver ao
      // menos 1 item. Defesa em profundidade — a UI já bloqueia, mas aqui
      // também para evitar chamadas via atalhos, testes ou race conditions.
      const { evaluateCartStatusTransition } = await import('@/lib/carts/status-transition-guard');
      const cart = (cartsQuery.data || []).find((c) => c.id === cartId);
      const decision = evaluateCartStatusTransition({
        nextStatus: status,
        itemCount: cart?.items?.length ?? 0,
      });
      if (!decision.allowed) {
        const err = new Error(decision.message);
        (err as Error & { code?: string }).code = 'EMPTY_CART';
        throw err;
      }
      await applyCartUpdate(supabase.from('seller_carts').update({ status }), cartId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      toast.error('Não foi possível atualizar o status', { description: describeCartError(err) });
    },
  });

  // Update cart shipping deadline (prazo p/ envio)
  const updateCartShippingDeadline = useMutation({
    mutationFn: async ({
      cartId,
      shippingDeadline,
    }: {
      cartId: string;
      shippingDeadline: string | null;
    }) => {
      // Validação Zod (formato ISO, data válida, não no passado).
      const { shippingDeadlineSchema } = await import('@/lib/carts/shipping-deadline');
      const parsed = shippingDeadlineSchema.safeParse(shippingDeadline);
      if (!parsed.success) {
        throw new Error(parsed.error.errors[0]?.message ?? 'Data inválida.');
      }
      await applyCartUpdate(
        supabase.from('seller_carts').update({ shipping_deadline: parsed.data }),
        cartId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      toast.error('Não foi possível salvar o prazo p/ envio', {
        description: describeCartError(err),
      });
    },
  });

  // Duplicate cart
  const duplicateCart = useMutation({
    mutationFn: (sourceCartId: string) =>
      duplicateSellerCart({
        userId,
        carts: cartsQuery.data || [],
        queryClient,
        sourceCartId,
      }),
    onSuccess: () => {
      toast.success('Carrinho duplicado com sucesso');
    },
    onError: (err: Error) => {
      // eslint-disable-next-line no-console
      console.error('[duplicateCart] falha', err);
      const code = (err as Error & { code?: string }).code;
      const supaCode = (err as Error & { code?: string; status?: number }).code;
      const status = (err as Error & { status?: number }).status;
      const msg = err.message ?? '';

      // Classificação amigável do erro
      let title = 'Não foi possível duplicar o carrinho';
      let description = sanitizeError(err);

      if (code === 'LIMIT') {
        title = SELLER_CART_LIMIT_REACHED_SHORT;
        description = err.message;
      } else if (code === 'VALIDATION') {
        title = 'Carrinho inválido';
        description = err.message;
      } else if (code === 'RLS' || supaCode === '42501' || status === 401 || status === 403) {
        title = 'Permissão negada';
        description =
          'Você não tem permissão para duplicar este carrinho. Recarregue e tente novamente.';
      } else if (code === 'AUTH') {
        title = 'Sessão expirada';
        description = err.message;
      } else if (
        msg.toLowerCase().includes('failed to fetch') ||
        msg.toLowerCase().includes('networkerror') ||
        code === 'NETWORK'
      ) {
        title = 'Falha de rede';
        description = 'Verifique sua conexão e tente novamente.';
      } else if (code === 'NOT_FOUND') {
        title = 'Carrinho não encontrado';
        description = err.message;
      } else if (code === 'CLEANUP') {
        title = 'Falha parcial ao duplicar';
        description = err.message;
      }

      toast.error(title, { description });
    },
  });

  // Move item to another cart
  const moveItemToCart = useMutation({
    mutationFn: ({ itemId, targetCartId }: { itemId: string; targetCartId: string }) =>
      moveSellerCartItem({ itemId, targetCartId, carts: cartsQuery.data || [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      toast.success('Item movido para outro carrinho');
    },
    onError: (err: Error) => {
      // Revalida do servidor: desfaz qualquer estado otimista/parcial da UI.
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      toast.error('Não foi possível mover o item', { description: sanitizeError(err) });
    },
  });

  // Duplicate item to another cart
  const duplicateItemToCart = useMutation({
    mutationFn: ({ itemId, targetCartId }: { itemId: string; targetCartId: string }) =>
      duplicateSellerCartItem({ itemId, targetCartId, carts: cartsQuery.data || [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
      toast.success('Item duplicado para outro carrinho');
    },
    onError: (err: Error) => {
      toast.error('Não foi possível duplicar o item', { description: sanitizeError(err) });
    },
  });

  // Computed
  const { carts, totalItems, canCreateCart } = useMemo(() => {
    const c = cartsQuery.data || [];
    return {
      carts: c,
      totalItems: c.reduce((sum, cart) => sum + cart.items.length, 0),
      canCreateCart: c.length < MAX_SELLER_CARTS,
    };
  }, [cartsQuery.data]);

  // Restore multiple items (Undo Clear)
  const restoreItems = useMutation({
    mutationFn: ({ cartId, items }: { cartId: string; items: AddToCartInput[] }) =>
      restoreSellerCartItems({ cartId, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      toast.error('Não foi possível restaurar os itens', { description: sanitizeError(err) });
    },
  });

  // ============================================================
  // RESTORE CART (Undo delete) — restauração ATÔMICA via RPC.
  // ============================================================
  // Toda a lógica de INSERT (cart + items) vive em `public.restore_seller_cart`
  // dentro de uma única transação Postgres:
  //   • Se qualquer item falhar (RLS, coluna, unique), o cart também rollback
  //     — impossível ficar órfão (bug antigo do path client-side sequencial).
  //   • Deduplica itens com mesmo (product_id, color_name) somando quantidades.
  //   • ON CONFLICT DO NOTHING contra `unique_cart_item_variant`.
  // Nunca vaza `id`, `seller_id`, `created_at`, `updated_at` do snapshot.
  const restoreCartWithItems = useMutation<RestoredSellerCart | undefined, Error, SellerCart>({
    mutationFn: (snapshot) => restoreSellerCartSnapshot(userId, snapshot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    onError: (err: Error) => {
      // Log estruturado com raw_error — o toast do chamador acrescenta
      // snapshot_id/itens + description sanitizada.
      cartDeleteLog.error('cart_restore_failed', { error: err.message });
    },
  });

  return {
    carts,
    isLoading: cartsQuery.isLoading,
    totalItems,
    canCreateCart,
    createCart,
    deleteCart,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemNotes,
    updateItemSortOrder,
    updateCartNotes,
    updateCartStatus,
    updateCartShippingDeadline,
    duplicateCart,
    moveItemToCart,
    duplicateItemToCart,
    restoreItems,
    restoreCartWithItems,
    clearCart: async (cartId: string) => {
      const { error } = await supabase.from('seller_cart_items').delete().eq('cart_id', cartId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
    refetch: cartsQuery.refetch,
  };
}
