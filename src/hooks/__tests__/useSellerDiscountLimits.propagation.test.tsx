/**
 * Etapa 080 (ACH-033) — o teto de desconto tem de propagar do painel para o builder.
 *
 * Hoje `useSellerDiscountLimits` guarda `myLimit` em `useState` e busca so no mount
 * (`useSellerDiscountLimits.ts:23,33`), enquanto os paineis de admin escrevem pela
 * propria mutation/react-query. O admin reduz o limite, o vendedor segue com o antigo
 * e `useQuoteBuilderState.ts:67` aplica o teto velho — bug de dinheiro.
 *
 * Este teste usa UM QueryClient (o mesmo cache da aplicacao) e prova que depois da
 * escrita o valor lido pelo builder muda sem recarregar a pagina.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSellerDiscountLimits } from '@/hooks/quotes/useSellerDiscountLimits';

// "Banco" mutavel: o mock le e escreve aqui, simulando seller_discount_limits.
const db = vi.hoisted(() => ({ maxDiscountPercent: 5 as number | null }));

const maybeSingle = vi.fn(() => ({
  data: db.maxDiscountPercent === null ? null : { max_discount_percent: db.maxDiscountPercent },
  error: null as unknown,
}));

const upsert = vi.fn((row: { max_discount_percent: number }) => {
  db.maxDiscountPercent = row.max_discount_percent;
  return { error: null as unknown };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      upsert,
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
      order: vi.fn(() => ({ data: [], error: null })),
    })),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'seller-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, Wrapper };
}

describe('teto de desconto — propagacao painel -> builder (ACH-033)', () => {
  beforeEach(() => {
    db.maxDiscountPercent = 5;
    maybeSingle.mockClear();
    upsert.mockClear();
  });

  it('builder le o teto novo depois que o admin grava outro limite', async () => {
    const { Wrapper } = makeWrapper();

    // O builder do vendedor: le myLimit.
    const builder = renderHook(() => useSellerDiscountLimits(), { wrapper: Wrapper });
    await waitFor(() => expect(builder.result.current.myLimit).toBe(5));

    // O painel do admin, mesma sessao/cache, grava 2%.
    const admin = renderHook(() => useSellerDiscountLimits(), { wrapper: Wrapper });
    await act(async () => {
      const ok = await admin.result.current.setLimit('seller-1', 2);
      expect(ok).toBe(true);
    });

    await waitFor(() => expect(builder.result.current.myLimit).toBe(2));
  });
});
