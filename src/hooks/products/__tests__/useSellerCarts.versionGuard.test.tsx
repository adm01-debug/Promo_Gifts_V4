/**
 * useSellerCarts — optimistic locking por `seller_carts.version`.
 *
 * A coluna `version` (migration 20260905033000) é incrementada pelo trigger
 * `trg_seller_carts_version` a cada UPDATE real. As mutações de campos do
 * carrinho (notas, status, prazo) condicionam o UPDATE à versão que o cache
 * conhece; 0 linhas afetadas significa que outra aba/dispositivo salvou antes.
 *
 * Contrato validado aqui:
 *  1. Cache com `version` → UPDATE leva `.eq('version', v)` + `.select('id')`
 *     e resolve quando o banco devolve a linha.
 *  2. Cache com `version` e 0 linhas devolvidas → lança
 *     `CartVersionConflictError`, invalida o cache e o toast mostra a mensagem
 *     do conflito (não a genérica de `sanitizeError`).
 *  3. Cache sem `version` (fixtures/caches antigos) → UPDATE incondicional por
 *     id, sem `.select` (comportamento anterior preservado).
 *  4. `updateCartStatus` usa o mesmo guard.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'seller-1', email: 's@t.com' } }),
}));

const VERSIONED_CART_ID = 'cart-versioned';
const LEGACY_CART_ID = 'cart-legacy';
const now = () => new Date().toISOString();
const baseCart = (id: string) => ({
  id,
  seller_id: 'seller-1',
  company_id: 'co-1',
  company_name: 'ACME',
  company_location: null,
  company_logo_url: null,
  notes: null,
  status: 'em_separacao',
  shipping_deadline: null,
  created_at: now(),
  updated_at: now(),
  seller_cart_items: [
    {
      id: `item-${id}`,
      cart_id: id,
      product_id: 'p-1',
      product_name: 'Caneta',
      product_sku: null,
      product_image_url: null,
      product_price: 10,
      quantity: 3,
      color_name: null,
      color_hex: null,
      notes: null,
      sort_order: 0,
      created_at: now(),
      updated_at: now(),
    },
  ],
});
const CARTS_RAW = [{ ...baseCart(VERSIONED_CART_ID), version: 3 }, baseCart(LEGACY_CART_ID)];

// Registro das chamadas do builder de UPDATE.
const calls = { payload: [] as unknown[], eq: [] as [string, unknown][], select: 0 };
let selectResult: { data: unknown[] | null; error: unknown } = {
  data: [{ id: VERSIONED_CART_ID }],
  error: null,
};

function updateBuilder(payload: unknown) {
  calls.payload.push(payload);
  const afterId = {
    // Caminho condicionado: .eq('version', v).select('id')
    eq: (col: string, val: unknown) => {
      calls.eq.push([col, val]);
      return {
        select: () => {
          calls.select += 1;
          return Promise.resolve(selectResult);
        },
      };
    },
    // Caminho legado: `await update.eq('id', id)` resolve direto.
    then: (
      onFulfilled: (v: { data: null; error: null }) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected),
  };
  return {
    eq: (col: string, val: unknown) => {
      calls.eq.push([col, val]);
      return afterId;
    },
  };
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'seller_carts') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: CARTS_RAW, error: null }),
              }),
            }),
          }),
          update: updateBuilder,
        };
      }
      return {
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      };
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  },
}));

import { useSellerCarts, CartVersionConflictError } from '@/hooks/products/useSellerCarts';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

async function renderLoaded() {
  const hook = renderHook(() => useSellerCarts(), { wrapper: wrapper() });
  await waitFor(() => expect(hook.result.current.carts).toHaveLength(2));
  return hook;
}

describe('useSellerCarts — optimistic locking por version', () => {
  beforeEach(() => {
    calls.payload = [];
    calls.eq = [];
    calls.select = 0;
    selectResult = { data: [{ id: VERSIONED_CART_ID }], error: null };
    toastError.mockReset();
  });

  it('condiciona o UPDATE à versão do cache e resolve quando a linha volta', async () => {
    const { result } = await renderLoaded();
    await act(async () => {
      await result.current.updateCartNotes.mutateAsync({
        cartId: VERSIONED_CART_ID,
        notes: 'urgente',
      });
    });
    expect(calls.payload).toEqual([{ notes: 'urgente' }]);
    expect(calls.eq).toEqual([
      ['id', VERSIONED_CART_ID],
      ['version', 3],
    ]);
    expect(calls.select).toBe(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('0 linhas afetadas → CartVersionConflictError com toast da mensagem específica', async () => {
    selectResult = { data: [], error: null };
    const { result } = await renderLoaded();
    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.updateCartNotes.mutateAsync({
          cartId: VERSIONED_CART_ID,
          notes: 'x',
        });
      } catch (e) {
        thrown = e;
      }
    });
    expect(thrown).toBeInstanceOf(CartVersionConflictError);
    expect((thrown as CartVersionConflictError).code).toBe('VERSION_CONFLICT');
    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    expect(toastError.mock.calls[0][1]).toEqual({
      description: (thrown as Error).message,
    });
    expect((thrown as Error).message).toMatch(/outra aba ou dispositivo/);
  });

  it('cache sem version → UPDATE incondicional por id, sem select (legado)', async () => {
    const { result } = await renderLoaded();
    await act(async () => {
      await result.current.updateCartNotes.mutateAsync({ cartId: LEGACY_CART_ID, notes: 'ok' });
    });
    expect(calls.eq).toEqual([['id', LEGACY_CART_ID]]);
    expect(calls.select).toBe(0);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('updateCartStatus usa o mesmo guard de versão', async () => {
    const { result } = await renderLoaded();
    await act(async () => {
      await result.current.updateCartStatus.mutateAsync({
        cartId: VERSIONED_CART_ID,
        status: 'pronto_orcamento',
      });
    });
    expect(calls.payload).toEqual([{ status: 'pronto_orcamento' }]);
    expect(calls.eq).toContainEqual(['version', 3]);
    expect(calls.select).toBe(1);
  });
});
