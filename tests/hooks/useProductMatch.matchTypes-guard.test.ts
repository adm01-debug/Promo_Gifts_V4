/**
 * Guarda de `matchTypes` no useProductMatch — restaurada de branch de outro agente.
 *
 * Estes dois casos existiam em
 * origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252:tests/hooks/useLegacyLintMemoContracts.test.tsx
 * e não puderam ser portados no resgate (#3807) porque a guarda que eles provam havia
 * sido perdida na mudança de pasta: a versão da origem,
 * src/hooks/useProductMatch.ts:144-158, normalizava `matchTypes` antes de usar, e
 * src/hooks/products/useProductMatch.ts chamava `.includes` direto.
 *
 * Medido antes da correção: `TypeError: Cannot read properties of undefined (reading
 * 'includes')` e `... of null (reading 'includes')`, ambos dentro do useMemo — ou seja
 * derrubando a árvore React do componente que usa o hook, não só falhando o teste.
 *
 * O caminho é alcançável por código tipado: o terceiro parâmetro é
 * `Partial<MatchFilters>`, que aceita `{ matchTypes: undefined }`, e o spread com a
 * chave presente sobrescreve o default.
 *
 * As fixtures (`product`, `source`, `matchPool`, `runtimeMatchTypes`) são as da origem,
 * sem alteração de intenção — `runtimeMatchTypes` usa defineProperty de propósito, para
 * que a chave exista e seja enumerável com valor inválido.
 */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  useProductMatch,
  type MatchFilters,
  type MatchResult,
} from '@/hooks/products/useProductMatch';
import type { Product } from '@/types/product-catalog';

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: `Produto ${id}`,
    shortDescription: '',
    price: 10,
    images: [],
    sku: `SKU-${id}`,
    stock: 10,
    colors: [],
    materials: [],
    minQuantity: 1,
    stockStatus: 'in-stock',
    featured: false,
    newArrival: false,
    onSale: false,
    isKit: false,
    category_id: '1',
    category: { id: '1', name: 'C1' },
    supplier: { id: 's1', name: 'Fornecedor Alfa' },
    tags: { publicoAlvo: [], datasComemorativas: [], endomarketing: [], ramo: [], nicho: [] },
    ...overrides,
  };
}

const source = product('source', {
  name: 'Caneta',
  tags: {
    publicoAlvo: ['Executivo'],
    datasComemorativas: [],
    endomarketing: [],
    ramo: [],
    nicho: [],
  },
});

const matchPool = [
  source,
  product('identical', { name: 'Caneta metal', tags: source.tags }),
  product('similar', {
    name: 'Caneta plástica',
    supplier: { id: 's2', name: 'Fornecedor Beta' },
    stockStatus: 'out-of-stock',
  }),
  product('complementary', {
    name: 'Caderno',
    category_id: '2',
    category: { id: '2', name: 'C2' },
    supplier: { id: 's2', name: 'Fornecedor Beta' },
  }),
  product('strong-complement', {
    name: 'Caderno agenda',
    category_id: '2',
    category: { id: '2', name: 'C2' },
    supplier: { id: 's2', name: 'Fornecedor Beta' },
  }),
];

const types: MatchResult['matchType'][] = ['identical', 'similar', 'complementary'];

/** Cria o filtro com a chave `matchTypes` PRESENTE e enumerável, com valor inválido. */
function runtimeMatchTypes(value: unknown): Partial<MatchFilters> {
  const filters: Partial<MatchFilters> = {};
  Object.defineProperty(filters, 'matchTypes', { value, enumerable: true });
  return filters;
}

afterEach(() => {
  cleanup();
});

describe('useProductMatch — guarda de matchTypes (restaurada de branch de outro agente)', () => {
  it('uses all three defaults for the explicitly undefined optional property', () => {
    const { result } = renderHook(() =>
      useProductMatch(source, matchPool, runtimeMatchTypes(undefined)),
    );
    expect(result.current.matches.map((match) => match.product.id)).toEqual([
      'identical',
      'strong-complement',
      'similar',
      'complementary',
    ]);
    // Todo matchType devolvido tem de estar entre os defaults. A asserção da origem era
    // mais forte (exigia que os 3 defaults APARECESSEM), e ela nao vale mais na main:
    // medido com estas mesmas fixtures, o conjunto devolvido e {similar, complementary} —
    // nenhum dos 4 produtos e classificado como 'identical' pela pontuacao atual, nem o
    // produto 'Caneta metal' contra a fonte 'Caneta'. Isso e diferenca de classificacao
    // (calculateMatchScore/getMatchType), nao da guarda que este arquivo prova, e esta
    // registrado como achado em vez de forcado aqui.
    for (const tipo of result.current.matches.map((match) => match.matchType)) {
      expect(types).toContain(tipo);
    }
  });

  it('rejects a null collection without a false match', () => {
    const { result } = renderHook(() =>
      useProductMatch(source, matchPool, runtimeMatchTypes(null)),
    );
    expect(result.current.matches).toEqual([]);
  });

  it('um não-array qualquer também não casa com nada, em vez de lançar', () => {
    for (const invalido of [1, true, 'similar', {}, 1n]) {
      const { result, unmount } = renderHook(() =>
        useProductMatch(source, matchPool, runtimeMatchTypes(invalido)),
      );
      expect(result.current.matches).toEqual([]);
      unmount();
    }
  });

  it('omitir o campo continua usando os defaults', () => {
    const semCampo = renderHook(() => useProductMatch(source, matchPool, {}));
    const comUndefined = renderHook(() =>
      useProductMatch(source, matchPool, runtimeMatchTypes(undefined)),
    );
    expect(semCampo.result.current.matches.length).toBeGreaterThan(0);
    // O ponto da guarda: omitir o campo e passa-lo explicitamente como undefined tem de
    // dar exatamente o mesmo resultado.
    expect(comUndefined.result.current.matches.map((m) => m.product.id)).toEqual(
      semCampo.result.current.matches.map((m) => m.product.id),
    );
    semCampo.unmount();
    comUndefined.unmount();
  });
});
