/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/useKitBuilderQueries.legacy.test.tsx
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 6 · neste arquivo: 6
 * Casos em runtime: 6 de 6 (omitidos: 0)
 *
 * DRIFT ADAPTADO:
 * Dois desvios, ambos resolvidos sem perder cobertura:
 *
 * 1) Caminho da pasta: `@/hooks/useKitBuilderQueries` ->
 * `@/hooks/kit-builder/useKitBuilderQueries` (arquivo real em
 * /home/user/Promo_Gifts_V4/.claude/worktrees/wf_aed7e33f-e5e-6/src/hooks/kit-builder/useKitBuilderQueries.ts).
 * Os outros mocks do teste continuam válidos sem remapeamento: `@/lib/db/postgrest`
 * (dbInvoke) é exatamente a fonte de dados usada hoje pelo hook
 * (useKitBuilderQueries.ts:7) e por fetchKitStockVariants
 * (src/hooks/kit-builder/useKitStockValidation.ts:58);
 * `@/lib/external-db/product-types` e `@/integrations/supabase/client` existem nos
 * mesmos caminhos.
 *
 * 2) Contrato de erro renomeado/reprojetado: o hook não retorna mais
 * `itemQueryError`/`boxQueryError` (objeto Error). Hoje ele projeta a mensagem como
 * string:
 *    - src/hooks/kit-builder/useKitBuilderQueries.ts:385 `boxError: boxQueryError
 * instanceof Error ? boxQueryError.message : null`
 *    - src/hooks/kit-builder/useKitBuilderQueries.ts:386 `itemError: itemQueryError
 * instanceof Error ? itemQueryError.message : null`
 *    O Error cru só existe internamente (linha 306, `error: itemQueryError`), não é
 * exportado pelo return.
 *    Adaptação: o caso "returns real empty arrays" passou a exigir `itemError ===
 * null` e `boxError === null`; o caso "exposes server failure" passou a exigir
 * `itemError === 'items offline'` (mensagem propagada do throw do mock) +
 * `availableItems === []`. A intenção original (erro de servidor fica visível e não há
 * fallback fabricado) foi preservada integralmente — só mudou o formato do valor
 * asseverado.
 *
 * Nada mais precisou mudar: paginação >200 (PRODUCT_PAGE_SIZE=200, offset 200
 * observado), `secondaryOrderBy.column === 'id'`, ausência de `base_price` no select
 * (KIT_PACKAGING_SELECT/KIT_ITEM_SELECT), distinção stock 8/0/null via
 * evaluateKitStock, filtro local mantendo catálogos completos e queda de estoque
 * virando `null` (não 0) já batem com o código atual sem edição.
 *
 * Arquivo final copiado para
 * /var/lib/postgresql/ported/tests/hooks/useKitBuilderQueries.legacy.test.tsx
 *
 */
import React from 'react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const m = vi.hoisted(() => ({ invoke: vi.fn(), failItems: false, failStock: false, empty: false }));
vi.mock('@/lib/db/postgrest', () => ({ dbInvoke: m.invoke }));
vi.mock('@/lib/external-db', async () => await import('@/lib/external-db/product-types'));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
import { useKitBuilderQueries } from '@/hooks/kit-builder/useKitBuilderQueries';
const product = (id: string, packaging = false) => ({
  id,
  name: packaging ? 'Caixa ' + id : 'Caneta ' + id,
  sku: 'SKU-' + id,
  product_type: packaging ? 'packaging' : 'simple',
  sale_price: 12,
  primary_image_url: 'https://cdn.test/' + id,
  images: [],
  internal_width_cm: 30,
  internal_height_cm: 20,
  internal_length_cm: 10,
  width_cm: 2,
  height_cm: 3,
  length_cm: 1,
  materials: ['kraft'],
  weight_g: 20,
  packing_type: 'Caixa para transporte',
  allows_personalization: true,
});
const items = Array.from({ length: 205 }, (_, i) => product('i' + i));
const boxes = Array.from({ length: 201 }, (_, i) => product('b' + i, true));
function wrapper({ children }: { children: React.ReactNode }) {
  const [q] = React.useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }),
  );
  return <QueryClientProvider client={q}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  vi.clearAllMocks();
  m.failItems = false;
  m.failStock = false;
  m.empty = false;
  m.invoke.mockImplementation(async (o) => {
    if (o.table === 'product_variants') {
      if (m.failStock) throw Error('stock offline');
      const ids = o.filters.product_id as string[];
      const variants = ids
        .filter((id) => id !== 'i2')
        .map((id) => ({
          id: 'v-' + id,
          product_id: id,
          color_name: 'Azul',
          stock_quantity: id === 'i1' ? 0 : 8,
        }));
      return { records: variants, count: variants.length };
    }
    if (m.failItems && !o.filters.product_type) throw Error('items offline');
    const records = m.empty ? [] : o.filters.product_type ? boxes : [...items, boxes[0]];
    return {
      records: records.slice(o.offset || 0, (o.offset || 0) + o.limit),
      count: o.countMode === 'exact' ? records.length : null,
    };
  });
});
afterEach(cleanup);
describe('Original query uses Gold, all pages and truthful state', () => {
  it('loads >200 boxes/items and server catalog facts; never treats shipping package as product role', async () => {
    const { result } = renderHook(useKitBuilderQueries, { wrapper });
    await waitFor(() => expect(result.current.completeItemCatalog).toHaveLength(205));
    await waitFor(() => expect(result.current.completeBoxCatalog).toHaveLength(201));
    expect(result.current.availableItems[0]).toMatchObject({
      id: 'i0',
      price: 12,
      imageUrl: 'https://cdn.test/i0',
    });
    const productCalls = m.invoke.mock.calls.map(([o]) => o).filter((o) => o.table === 'products');
    expect(productCalls.some((o) => o.offset === 200)).toBe(true);
    expect(productCalls.every((o) => o.secondaryOrderBy?.column === 'id')).toBe(true);
    expect(productCalls.every((o) => !o.select.includes('base_price'))).toBe(true);
  });
  it('preserves aggregated positive/zero/unknown stock distinctions', async () => {
    const { result } = renderHook(useKitBuilderQueries, { wrapper });
    await waitFor(() => expect(result.current.completeItemCatalog[0]?.stock).toBe(8));
    expect(result.current.completeItemCatalog[1].stock).toBe(0);
    expect(result.current.completeItemCatalog[2].stock).toBeNull();
  });
  it('keeps unfiltered AI catalogs while search/material/dimension selectors filter locally', async () => {
    const { result } = renderHook(useKitBuilderQueries, { wrapper });
    await waitFor(() => expect(result.current.completeItemCatalog).toHaveLength(205));
    act(() => {
      result.current.setBoxFilters({ search: 'b200', material: ['kraft'], minWidth: 20 });
      result.current.setItemFilters({ search: 'SKU-i204' });
    });
    await waitFor(() => expect(result.current.availableBoxes).toHaveLength(1));
    await waitFor(() => expect(result.current.availableItems).toHaveLength(1));
    expect(result.current.completeBoxCatalog).toHaveLength(201);
    expect(result.current.completeItemCatalog).toHaveLength(205);
    expect(result.current.availableItems[0].category).not.toBeTypeOf('number');
  });
  it('returns real empty arrays instead of production mock data', async () => {
    m.empty = true;
    const { result } = renderHook(useKitBuilderQueries, { wrapper });
    await waitFor(() => expect(result.current.isLoadingItems).toBe(false));
    expect(result.current.completeItemCatalog).toEqual([]);
    expect(result.current.completeBoxCatalog).toEqual([]);
    // Contrato atual: o hook projeta o erro como string (`itemError`), não
    // como instância de Error (useKitBuilderQueries.ts:386).
    expect(result.current.itemError).toBeNull();
    expect(result.current.boxError).toBeNull();
  });
  it('exposes server failure and no fabricated product fallback', async () => {
    m.failItems = true;
    const { result } = renderHook(useKitBuilderQueries, { wrapper });
    await waitFor(() => expect(result.current.itemError).toBe('items offline'), {
      timeout: 4000,
    });
    expect(result.current.availableItems).toEqual([]);
  });
  it('stock failure becomes unknown rather than zero or endless loading', async () => {
    m.failStock = true;
    const { result } = renderHook(useKitBuilderQueries, { wrapper });
    await waitFor(() => expect(result.current.completeItemCatalog[0]?.stock).toBeNull(), {
      timeout: 4000,
    });
    expect(result.current.completeItemCatalog).toHaveLength(205);
  });
});
