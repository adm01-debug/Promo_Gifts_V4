/**
 * Testes — useReposicaoVariantsSummary
 *
 * O caso que motivou: variante sem nome de cor gerava um `warn` POR VARIANTE a
 * cada refetch (staleTime 60s), e o catálogo tem 46 variantes nesse estado —
 * produto de variante única sem dimensão de cor (caixa, conjunto, copo). O
 * console do vendedor enchia de linha repetida. Agora sai UMA linha por busca,
 * com contagem, produtos afetados e amostra.
 *
 * Os outros casos travam o que já funcionava: o Map é indexado por nome de cor
 * normalizado (sem acento, minúsculo) e produto cujas variantes TODAS estão sem
 * nome não entra no Map.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

// `vi.mock` e hoisted acima das declaracoes do modulo, entao os espioes nascem
// dentro de `vi.hoisted` — senao o factory le a variavel antes da inicializacao.
const { rpc, warn, error } = vi.hoisted(() => ({
  rpc: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a) },
}));

vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ warn, error, info: vi.fn(), debug: vi.fn() }),
}));

import { useReposicaoVariantsSummary } from '@/hooks/products/useReposicaoVariantsSummary';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

const variante = (over: Record<string, unknown> = {}) => ({
  variant_id: 'v1',
  nome: 'Azul',
  hex: '#00f',
  stock_qty: 10,
  has_upcoming_restock: false,
  next_restock_date: null,
  ...over,
});

beforeEach(() => {
  rpc.mockReset();
  warn.mockReset();
  error.mockReset();
});

describe('useReposicaoVariantsSummary', () => {
  it('não dispara a RPC sem productIds', () => {
    const { result } = renderHook(() => useReposicaoVariantsSummary([]), { wrapper });
    expect(rpc).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('indexa por nome de cor normalizado (minúsculo, sem acento)', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          product_id: 'p1',
          variants_summary: [variante({ nome: ' Verde Água ', stock_qty: 7 })],
        },
      ],
      error: null,
    });
    const { result } = renderHook(() => useReposicaoVariantsSummary(['p1']), { wrapper });
    await waitFor(() => expect(result.current.data?.size).toBe(1));
    const porCor = result.current.data?.get('p1');
    expect(porCor?.get('verde agua')).toMatchObject({ variantId: 'v1', stockQty: 7 });
    expect(warn).not.toHaveBeenCalled();
  });

  it('variantes sem nome de cor viram UM aviso agregado, não um por variante', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          product_id: 'p1',
          variants_summary: [
            variante({ variant_id: 'a', nome: null }),
            variante({ variant_id: 'b', nome: '   ' }),
            variante({ variant_id: 'c', nome: 'Azul' }),
          ],
        },
        {
          product_id: 'p2',
          variants_summary: [variante({ variant_id: 'd', nome: null })],
        },
      ],
      error: null,
    });
    const { result } = renderHook(() => useReposicaoVariantsSummary(['p1', 'p2']), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());

    // UMA linha, não 3.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('variantes_sem_nome_de_cor', {
      total: 3,
      produtos_afetados: 2,
      amostra: [
        { variant_id: 'a', product_id: 'p1' },
        { variant_id: 'b', product_id: 'p1' },
        { variant_id: 'd', product_id: 'p2' },
      ],
    });
    // A variante COM nome continua chegando; o produto sem nenhuma, não entra.
    expect(result.current.data?.get('p1')?.get('azul')).toBeDefined();
    expect(result.current.data?.has('p2')).toBe(false);
  });

  it('erro da RPC devolve mapa vazio e avisa uma vez, sem derrubar a tela', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useReposicaoVariantsSummary(['p1']), { wrapper });
    await waitFor(() => expect(result.current.data?.size).toBe(0));
    expect(warn).toHaveBeenCalledWith('rpc_failed', { error: 'boom', ids: 1 });
  });
});
