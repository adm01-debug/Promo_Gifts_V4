/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/useLegacyCatalogContracts.test.ts
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 13 · neste arquivo: 12
 * Casos em runtime: 37 de 50 (omitidos: 13)
 *
 * DRIFT ADAPTADO:
 * 1) Caminhos de import (todos sob src/, confirmados com find/ls antes de trocar):
 * - @/hooks/useProductsLightweight -> @/hooks/products/useProductsLightweight
 * - @/hooks/useNoveltiesSelectionMode -> @/hooks/products/useNoveltiesSelectionMode
 * - @/hooks/useReplenishmentsSelectionMode ->
 * @/hooks/products/useReplenishmentsSelectionMode
 * - @/hooks/useCatalogFiltering -> @/hooks/products/useCatalogFiltering
 * - @/hooks/useAdvancedFilters -> @/hooks/products/useAdvancedFilters
 * - tipos NoveltyWithDetails/ReplenishmentWithDetails -> import type do barrel
 * @/hooks/products (é de lá que os próprios conversores importam:
 * src/hooks/products/useNoveltiesSelectionMode.ts:7 e
 * useReplenishmentsSelectionMode.ts:7). Atenção: @/hooks/useReplenishments AINDA
 * existe (src/hooks/useReplenishments.ts) e exporta um ReplenishmentWithDetails
 * duplicado — import antigo resolveria, mas para o tipo errado.
 * - @/constants/filters e @/components/filters/filter-panel/types seguem válidos, sem
 * mudança.
 * 2) Caminhos de vi.mock (silenciosos: mock em caminho inexistente não falha, só não
 * mocka):
 * - @/hooks/useEntitySelectionMode -> @/hooks/common/useEntitySelectionMode
 * - @/hooks/useExternalDatabase -> @/hooks/intelligence/useExternalDatabase
 * 3) Drift de contrato (não de caminho) — 3 APIs do branch de origem não existem mais
 * na main: o type guard isLightweightCatalogRecord, a contagem de quantityRange em
 * activeFiltersCount e o filtro de cor client-side em useCatalogFiltering. Detalhado
 * em motivo_omissao. Adaptados sem perder caso: (a) o espelho de flags dentro de
 * `tags` nos conversores — no branch era `tags: { featured, newArrival, onSale, isKit,
 * ...arrays }` (git show <branch>:src/hooks/useNoveltiesSelectionMode.ts:49), hoje os
 * flags só existem no topo do Product e `tags` carrega só os 5 arrays
 * (src/hooks/products/useNoveltiesSelectionMode.ts:41-54,
 * useReplenishmentsSelectionMode.ts:42-55); mantive a asserção dos 4 flags no nível de
 * topo + arrays em tags. (b) `expect(product.sku).toBe('')` virou `toBeUndefined()`
 * (ver bug_de_producao). (c) acrescentei os campos obrigatórios que surgiram nas
 * interfaces (product_set_image, days_as_novelty) aos literais de fixture.
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * 13 casos removidos (nenhum skip/todo/comentário — `grep -nE
 * "\.skip|\.todo|xit\(|xdescribe"` no arquivo final não retorna nada).
 *
 * A) 8 casos — `it.each([null, [], {}, { id: 1, name: 'Invalid' }, { id: 'p' },
 * {...sale_price:'12'}, {...is_active:'true'}, {...image_url:{}}])('rejects malformed
 * batch record %#')`, mais a asserção
 * `expect(isLightweightCatalogRecord(record)).toBe(true)` do caso "keeps a partial
 * product".
 * Esperavam: um type guard de runtime `isLightweightCatalogRecord` exportado pelo hook
 * lightweight.
 * Hoje: o símbolo não existe em nenhum lugar de src/ (`grep -rn
 * isLightweightCatalogRecord src/` → 0 ocorrências). Ele só existe no branch de
 * origem, em `src/hooks/useProductsLightweight.ts:24`, junto com seu único consumidor
 * `src/hooks/useCatalogPrefetch.ts:43` (`git grep -n isLightweightCatalogRecord
 * <branch> -- 'src/*'`); nenhum dos dois entrou na main (`find src -name
 * "useCatalogPrefetch*"` → vazio). O arquivo atual
 * `src/hooks/products/useProductsLightweight.ts` exporta apenas
 * mapLightweightToProduct (:62), PRODUCT_SELECT_LIGHTWEIGHT (:162),
 * useProductsLightweight (:407) e useProductsCatalog (:427). Como não posso alterar
 * src/, não há como manter esses casos. O caso "keeps a partial product" foi
 * PRESERVADO sem a linha do guard (ainda cobre id/sku/shortDescription/images do
 * mapper).
 *
 * B) 2 casos — do `it.each` de quantityRange: `[[2, 10000], 1]` e `[[1, 99], 1]`.
 * Esperavam: activeFiltersCount = 1 quando o range legado sai de [1, 10000].
 * Hoje: o campo não existe mais em AdvancedFilterState e o contador não o lê —
 * `src/constants/filters.ts:22-23` ("BUG-SF-16 FIX: quantityRange removido — era campo
 * orphaned") e `src/hooks/products/useAdvancedFilters.ts:265` ("BUG-SF-16 FIX:
 * quantityRange removido de AdvancedFilterState"). Medido no vitest antes de remover:
 * `AssertionError: expected +0 to be 1` nos dois casos
 * (tests/.../useLegacyCatalogContracts.test.ts:37). Os outros 4 casos do mesmo it.each
 * (que esperavam 0) foram MANTIDOS — continuam provando que um quantityRange legado no
 * state é ignorado sem crash, que é o contrato atual.
 *
 * C) 3 casos — do `it.each` de filtros de catálogo: `[{ colors: ['Vermelho'] },
 * ['a']]`, `[{ colorGroups: ['blue'] }, ['b']]`, `[{ colorVariations: ['scarlet'] },
 * ['a']]`.
 * Esperavam: filtro de cor client-side lendo filters.colors / colorGroups /
 * colorVariations.
 * Hoje: `useCatalogFiltering` não lê nenhum desses campos; cor é filtro server-side
 * via ids pré-resolvidos — `src/hooks/products/useCatalogFiltering.ts:25-29`
 * (hasColorFilter/colorFilteredProductIds/isLoadingColorFilter) e o bloco :130-137,
 * cujo comentário explica a troca ("os produtos lightweight chegam com colors:[] ...
 * então inspecionar p.colors aqui zerava a grade"). Medido antes de remover: os três
 * retornaram `[ 'b', 'a' ]` (grade inteira, ordem por nome) contra
 * `['a']`/`['b']`/`['a']` esperados (tests/.../useLegacyCatalogContracts.test.ts:151).
 * Os outros 7 casos do mesmo it.each (categories, suppliers, materiais, priceRange,
 * inStock, materiais ausente, sem filtro) passam e foram mantidos.
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * src/hooks/products/useProductsLightweight.ts:92 — `sku: p.sku` sem coerção, enquanto
 * `Product.sku` é declarado obrigatório `string` em src/types/product-catalog.ts:53.
 * Com um registro sem sku, mapLightweightToProduct devolve `sku: undefined` tipado
 * como string (foi exatamente a falha medida: `expected undefined to be ''` em
 * tests/.../useLegacyCatalogContracts.test.ts:65). A versão do outro agente coagia
 * (`sku: p.sku ?? ''`, git show <branch>:src/hooks/useProductsLightweight.ts:74), e a
 * própria função já faz essa coerção no campo vizinho (`shortDescription:
 * p.short_description ?? ''`, linha 84) — ou seja, é omissão pontual, não decisão de
 * design. Alcance real: `public.products.sku` é NOT NULL, mas o catálogo lê
 * `public.v_products_public`, cuja coluna sku é nullable (information_schema.columns:
 * is_nullable = YES), e a RPC get_catalog_bestseller_page devolve linhas dessa mesma
 * view (useProductsLightweight.ts:223-234). Severidade baixa e NÃO VERIFICADO em dado
 * de produção (não medi se existe linha com sku nulo na view); o que está provado é o
 * furo de tipo. Ajustei o teste para o contrato atual
 * (`expect(product.sku).toBeUndefined()`) e deixei o arquivo verde, sem tocar em src/.
 *
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mapLightweightToProduct } from '@/hooks/products/useProductsLightweight';
import { noveltyToProduct } from '@/hooks/products/useNoveltiesSelectionMode';
import { replenishmentToProduct } from '@/hooks/products/useReplenishmentsSelectionMode';
import { useCatalogFiltering } from '@/hooks/products/useCatalogFiltering';
import { useAdvancedFilters } from '@/hooks/products/useAdvancedFilters';
import { defaultAdvancedFilters } from '@/constants/filters';
import { defaultFilters } from '@/components/filters/filter-panel/types';
import type { NoveltyWithDetails, ReplenishmentWithDetails } from '@/hooks/products';

vi.mock('@/lib/external-db', () => ({}));
vi.mock('@/hooks/common/useEntitySelectionMode', () => ({ useEntitySelectionMode: vi.fn() }));
vi.mock('@/hooks/intelligence/useExternalDatabase', () => {
  const empty = () => ({ data: [], fetchAll: vi.fn().mockResolvedValue([]) });
  return { useExternalCategories: empty, useExternalTechniques: empty,
    useExternalSuppliers: empty, useExternalDatabase: empty };
});

describe('original advanced filter state', () => {
  it('loads the current default without an orphaned quantityRange crash', async () => {
    const { result } = renderHook(() => useAdvancedFilters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.activeFiltersCount).toBe(0);
    expect(result.current.categoryTree).toEqual([]);
    expect(result.current.hasActiveFiltersInGroup(['search'])).toBe(false);
  });

  it.each([
    [[1, 10000], 0], [[], 0], [[2], 0], [['2', 10000], 0],
  ])('ignores orphaned legacy quantityRange %# without crashing', async (range, expected) => {
    const { result } = renderHook(() => useAdvancedFilters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const legacy = { ...defaultAdvancedFilters, quantityRange: range };
    act(() => result.current.setFilters(legacy));
    expect(result.current.activeFiltersCount).toBe(expected);
  });
});

describe('original lightweight catalog boundary', () => {
  it.each([
    { sale_price: 0, cost_price: 42, expected: 0 },
    { sale_price: null, cost_price: 42, expected: 42 },
    { sale_price: undefined, cost_price: 0, expected: 0 },
    { sale_price: undefined, cost_price: undefined, expected: 0 },
    { sale_price: 19.9, cost_price: 42, expected: 19.9 },
  ])('preserves price precedence for $sale_price / $cost_price', ({ expected, ...prices }) => {
    expect(mapLightweightToProduct({ id: 'p', name: 'Product', ...prices }).price).toBe(expected);
  });

  it.each([
    [-2, 'out-of-stock'], [0, 'out-of-stock'], [1, 'low-stock'],
    [9, 'low-stock'], [10, 'in-stock'], [100, 'in-stock'],
  ] as const)('preserves stock %s and status %s', (stock, status) => {
    const product = mapLightweightToProduct({ id: 'p', name: 'Product', stock_quantity: stock });
    expect(product.stock).toBe(stock);
    expect(product.stockStatus).toBe(status);
  });

  it('keeps a partial product rather than silently dropping the row', () => {
    const record = { id: 'partial', name: 'Incomplete product' };
    const product = mapLightweightToProduct(record);
    expect(product.id).toBe('partial');
    expect(product.sku).toBeUndefined();
    expect(product.shortDescription).toBe('');
    expect(product.images).toEqual(['/placeholder.svg']);
  });


  it('preserves description, image precedence, minimum quantity and price age', () => {
    const product = mapLightweightToProduct({
      id: 'p', name: 'Product', primary_image_url: 'primary', image_url: 'fallback',
      short_description: 'Description', min_quantity: 5, price_updated_at: '2026-11-09',
    });
    expect(product.images).toEqual(['primary']);
    expect(product.shortDescription).toBe('Description');
    expect(product.minQuantity).toBe(5);
    expect(product.priceUpdatedAt).toBe('2026-11-09');
  });
});

describe('original novelty and replenishment converters', () => {
  const common = {
    product_id: 'p', product_name: 'Product', product_description: 'Description',
    product_image: 'image', product_sku: 'SKU', base_price: 12.5,
    category_id: 'cat', category_name: 'Category', supplier_id: 'supplier',
    supplier_name: 'Supplier', supplier_product_code: 'REF', product_set_image: null, is_active: true,
    is_highlighted: true,
  };
  const novelty: NoveltyWithDetails = {
    ...common, novelty_id: 'n', detected_at: '2026-11-09', days_as_novelty: 0,
    expires_at: '2026-11-10', days_remaining: 1, status: 'active', supplier_code: 'S',
    stock_quantity: 8, min_quantity: 1, stock_status: 'low-stock',
  };
  const replenishment: ReplenishmentWithDetails = {
    ...common, replenishment_id: 'r', replenished_at: '2026-11-09', created_at: '2026-11-09',
    expires_at: '2026-11-10', days_remaining: 1, days_since: 0, status: 'active', supplier_code: 'S',
    stock_quantity: 8, min_quantity: 1, stock_status: 'low-stock',
  };

  it.each([
    ['novelty', () => noveltyToProduct(novelty), true],
    ['replenishment', () => replenishmentToProduct(replenishment), false],
  ] as const)('preserves %s fields and legacy tag flags', (_, convert, isNovelty) => {
    const product = convert();
    expect(product).toMatchObject({ id: 'p', sku: 'SKU', price: 12.5,
      description: 'Description', shortDescription: 'Description', supplier_reference: 'REF',
      newArrival: isNovelty, featured: true, onSale: false, isKit: false,
      tags: { publicoAlvo: [], datasComemorativas: [],
        endomarketing: [], ramo: [], nicho: [] } });
  });

  it.each([
    [0, 'out-of-stock'], [3, 'low-stock'], [100, 'in-stock'],
  ] as const)('propagates real quantity %s and status %s in both converters', (quantity, status) => {
    for (const product of [
      noveltyToProduct({ ...novelty, stock_quantity: quantity, stock_status: status }),
      replenishmentToProduct({ ...replenishment, stock_quantity: quantity, stock_status: status }),
    ]) {
      expect(product.stock).toBe(quantity);
      expect(product.stockStatus).toBe(status);
    }
  });
});

describe('original catalog filters', () => {
  const products = [
    { ...mapLightweightToProduct({ id: 'a', name: 'Red steel', sale_price: 0, stock_quantity: 3,
      category_id: 'c1', brand: 'Brand' }), materials: ['Aço'],
      colors: [{ id: 'red', name: 'Vermelho', hex: '#ff0000', group: 'Vermelho', groupSlug: 'red', variationSlug: 'scarlet' }] },
    { ...mapLightweightToProduct({ id: 'b', name: 'Blue plastic', sale_price: 20, stock_quantity: 0,
      category_id: 'c2', brand: 'Other' }), materials: ['Plástico'],
      colors: [{ id: 'blue', name: 'Azul', hex: '#0000ff', group: 'Azul', groupSlug: 'blue', variationSlug: 'navy' }] },
  ];
  const options = { realProducts: products, filters: defaultFilters, sortBy: 'name' as const,
    hasFuzzySearch: false, fuzzySearchResults: [], hasMaterialFilter: false,
    materialFilteredProductIds: new Set<string>(), isLoadingMaterialFilter: false,
    hasCategoryFilter: false, categoryFilteredProductIds: new Set<string>(), isLoadingCategoryFilter: false };

  it.each([
    [{ categories: ['c2'] }, ['b']],
    [{ suppliers: ['Brand'] }, ['a']], [{ materiais: ['aço'] }, ['a']],
    [{ priceRange: [0, 0] as [number, number] }, ['a']], [{ inStock: true }, ['a']],
    [{ materiais: ['absent'] }, []], [{}, ['b', 'a']],
  ])('applies filters %# without mutating the source', (patch, expected) => {
    const idsBefore = products.map((product) => product.id);
    const { result } = renderHook(() => useCatalogFiltering({ ...options,
      filters: { ...defaultFilters, ...patch } }));
    expect(result.current.map((product) => product.id)).toEqual(expected);
    expect(products.map((product) => product.id)).toEqual(idsBefore);
  });

  it('preserves empty pre-fetched material intersection', () => {
    const { result } = renderHook(() => useCatalogFiltering({ ...options, hasMaterialFilter: true }));
    expect(result.current).toEqual([]);
  });

  it.each([
    ['name', ['b', 'a']], ['price-asc', ['a', 'b']],
    ['price-desc', ['b', 'a']], ['stock', ['a', 'b']],
  ] as const)('uses the immutable sorter return for visible %s order', (sortBy, expected) => {
    const { result } = renderHook(() => useCatalogFiltering({ ...options, sortBy }));
    expect(result.current.map((product) => product.id)).toEqual(expected);
    expect(products.map((product) => product.id)).toEqual(['a', 'b']);
  });

  it.each(['name', 'relevance'] as const)('retains fuzzy result order when %s skips sorting', (sortBy) => {
    const { result } = renderHook(() => useCatalogFiltering({ ...options, sortBy,
      hasFuzzySearch: true, fuzzySearchResults: [products[0], products[1]] }));
    expect(result.current.map((product) => product.id)).toEqual(['a', 'b']);
  });
});
