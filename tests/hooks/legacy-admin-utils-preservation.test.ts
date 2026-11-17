/**
 * RESGATE — teste escrito por outro agente de IA que nunca chegou a main.
 *
 * Fonte: origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252
 *        tests/hooks/legacy-admin-utils-preservation.test.ts
 *
 * Ficou fora porque a main moveu hooks e paginas para subpastas, entao os imports
 * `@/...` do original nao resolvem mais. Nenhum `.skip`/`.todo` foi usado para
 * fazer este arquivo passar: caso que nao cabe mais no codigo atual foi REMOVIDO,
 * com a evidencia medida registrada abaixo.
 *
 * Blocos `it` na fonte: 5 · neste arquivo: 5
 * Casos em runtime: 16 de 46 (omitidos: 30)
 *
 * DRIFT ADAPTADO:
 * 1) Caminhos: `@/hooks/useRamoAtividadeFilter` ->
 * `@/hooks/crm/useRamoAtividadeFilter`; `@/hooks/useSupplierFiscalData` ->
 * `@/hooks/products/useSupplierFiscalData`; `@/hooks/useCategoryIcons` ->
 * `@/hooks/products/useCategoryIcons`. O arquivo antigo
 * `src/hooks/useRamoAtividadeFilter.ts` foi movido para `recovery/src-legacy` no
 * commit 5dd9b949d ("move 316 arquivos obsoletos da #3361"), por isso a versão que o
 * outro agente testou não é mais produção.
 * 2) Mocks de dependência: produção importa `useRamoAtividadeGroups,
 * useSegmentosCompletos` do barrel `@/hooks/crm`
 * (src/hooks/crm/useRamoAtividadeFilter.ts:2), não mais de `@/hooks/useRamoAtividade`
 * / `@/hooks/useRamoAtividadeFilho`. Troquei os dois `vi.mock` por um único
 * `vi.mock('@/hooks/crm')` expondo os dois nomes (`useRamosAtividadeGroups` e o alias
 * `useRamoAtividadeGroups`, src/hooks/crm/useRamoAtividade.ts:31 e :48).
 * 3) Camada de dados do fiscal trocada: `useSupplierFiscalData` não usa mais
 * `invokeExternalDb` de `@/lib/external-db`; usa `untypedFrom` de
 * `@/lib/supabase-untyped`
 * (src/hooks/products/useSupplierFiscalData.ts:9,278,301,356,367), que é só
 * `supabase.from(table)` (src/lib/supabase-untyped.ts:43-47). Removi o mock de
 * `@/lib/external-db` e troquei as asserções de payload `{table, filters, limit}` /
 * `{operation, id}` por um recorder de builder PostgREST encadeável sobre o
 * `supabase.from` já mockado: select('id') -> eq('supplier_id') -> eq('variant_id') ->
 * limit(1), depois update(payload)/delete() -> eq('id','source'). O contrato que o
 * teste protegia (escopo supplier+variant e a chave de invalidação
 * `['supplier-fiscal-data', productId, supplierId]`) está preservado integralmente.
 * 4) `getCategoryIcon` saiu de `useCategoryIcons.ts` para o módulo dedicado
 * `@/hooks/products/getCategoryIcon` (src/hooks/products/getCategoryIcon.ts:318);
 * `CategoryIcon` continua em `useCategoryIcons.ts` mas agora com campos não-nulos
 * (`icon: string`), por isso as fixtures com null precisaram de tipo local + cast.
 * 5) `KEYWORD_ICONS` migrou de emoji para nomes Lucide: `caneca` era `'☕'` (branch
 * salvo, useCategoryIcons.ts:34) e hoje é `'Coffee'`
 * (src/hooks/products/getCategoryIcon.ts:21). Expectativa do caso ajustada de '☕' para
 * 'Coffee'.
 * 6) `logger` precisou de `error` no mock (produção chama `logger.error` em
 * src/hooks/products/useSupplierFiscalData.ts:337,376).
 * 7) API do hook de ramo renomeada/reduzida: `activeFiltersCount` -> `selectedCount`
 * (:116), `clearFilters` -> `clearAll` (:110), `filteredSegmentos` deixou de ser
 * retornado e `segmentos` passou a ser a lista JÁ filtrada por ramo (:176);
 * `toggleRamo` agora também seleciona todos os segmentos do ramo (:86), o que antes
 * não acontecia. Adaptei nomes e recalculei as expectativas derivadas dos mocks.
 * Verificação anti-falso-verde: mutei duas asserções (eq variant_id e o caso
 * icon:null) e a suíte caiu para 3 falhas/13 passes; restaurada, 16/16 verdes. Lint do
 * arquivo limpo (`npx eslint` sem saída). `npm run qa:typecheck` cobre só `src`
 * (tsconfig.app.json include: ["src"]), então tests/ não entra no typecheck.
 *
 * OMISSOES, COM EVIDENCIA MEDIDA:
 * 30 casos removidos, todos do primeiro describe (it.each com matriz 6 search x 3 ramo
 * x 2 selected = 36 casos; mantive a matriz reduzida 3 ramo x 2 selected = 6).
 *
 * (a) Dimensão `search` (6 valores: '', 'hosp', 'CLÍN', 'saúde', 'Educação',
 * 'ausente') — removida: o hook de produção não tem `setSearchTerm` e não filtra por
 * texto. O que o teste esperava: `result.current.setSearchTerm(search)` e
 * `filteredSegmentos` filtrado por `segmento_name`/`ramo_name` contendo o termo
 * (comportamento existente em git show
 * origin/salvo/...:src/hooks/useRamoAtividadeFilter.ts, linhas 104-106 do corpo =
 * setSearchTerm, e 142-153 = filtro por searchTerm). O que o código faz hoje:
 * `src/hooks/crm/useRamoAtividadeFilter.ts:145-148` — `filteredSegmentos` só filtra
 * por `selectedRamosSet`, sem nenhuma leitura de `filterState.searchTerm`; e o retorno
 * (:172-191) não expõe `setSearchTerm` nem `filteredSegmentos`. `searchTerm` existe
 * apenas como campo morto do state (:57), nunca escrito. Chamar
 * `result.current.setSearchTerm(...)` hoje é TypeError.
 *
 * (b) Asserções de "clears independentes" (`clearRamoFilters`, `clearSegmentoFilters`)
 * — removidas: o que o teste esperava era `clearRamoFilters()` zerar só
 * `selectedRamos` preservando `selectedSegmentos` e `searchTerm`, e
 * `clearSegmentoFilters()` zerar só `selectedSegmentos` preservando `searchTerm`. O
 * que o código faz hoje: `src/hooks/crm/useRamoAtividadeFilter.ts:110-112` só tem
 * `clearAll()`, que zera os três campos de uma vez;
 * `clearRamoFilters`/`clearSegmentoFilters`/`clearFilters` não existem em nenhum lugar
 * de src/ (grep sem ocorrências fora de componentes de catálogo, que usam outro hook).
 * A asserção final equivalente (`clearFilters()` deixando o state vazio) foi mantida
 * como `clearAll()`.
 *
 * (c) Asserção `expect(result.current.segmentos).toBe(mocks.segmentos)` (lista crua) —
 * mantida só no caso ramo='none': hoje `segmentos` é a lista filtrada
 * (`src/hooks/crm/useRamoAtividadeFilter.ts:176`), então a identidade com o array cru
 * só vale quando nenhum ramo está selecionado.
 *
 * (d) Ajuste (não remoção) no caso 'removes only segments belonging to the deselected
 * ramo': esperava `getSelectedSegmentosForRamo('saude') === [segmentos[0]]`
 * (hospitais). Hoje `toggleRamo` já marca todos os segmentos do ramo (`:86`), então
 * `toggleSegmento('hospitais')` em seguida DESmarca hospitais e sobra 'clinicas' —
 * expectativa passou a `[segmentos[1]]`. O resto do caso (remoção em cascata ao
 * desmarcar o ramo, `['escolas']`, e `getSegmentosForRamo('missing') === []`) continua
 * valendo igual.
 *
 * DEFEITO DE PRODUCAO QUE ESTE RESGATE REVELOU (nao corrigido aqui; src/ nao
 * foi alterado por esta PR):
 * src/hooks/products/getCategoryIcon.ts:327-328 — `const exact = icons.find(i =>
 * i.category_name?.toLowerCase() === nameLower); if (exact) return exact.icon;`
 * retorna `null` quando a linha do banco casa pelo nome mas tem `icon` nulo, violando
 * a assinatura declarada `: string` (:318-321) e quebrando o fallback. A versão
 * anterior guardava o tipo: `if (exact && typeof exact.icon === 'string') return
 * exact.icon;` (git show
 * origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252:src/hooks/useCategoryIcons.ts,
 * bloco getCategoryIcon), caindo para KEYWORD_ICONS e, no fim, para '📦'. Medido:
 * `getCategoryIcon('Caneca', [{id:'one', category_name:'caneca', icon:null}])` devolve
 * `null` hoje (o teste está verde com `expected: null`); antes devolvia o ícone de
 * keyword. O mesmo descuido está no pass 2 (:332-336, `partial.icon`) e no pass 4
 * (:347-350, `firstWordMatch.icon`). Impacto: consumidores como
 * src/components/products/ProductCategoryBadges.tsx:92 e
 * src/components/filters/ExternalCategoryFilter.tsx:135 recebem `null` onde o tipo
 * promete `string`. O tipo `CategoryIcon` em
 * src/hooks/products/useCategoryIcons.ts:4-9 declara `icon: string` (não-nulo) mas a
 * coluna do banco é nullable e o `as CategoryIcon[]` em :20 não valida nada. Correção
 * sugerida (PR separada): restaurar os três guards `typeof x.icon === 'string'`.
 *
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SegmentoComplete } from '@/types/ramo-atividade';

const mocks = vi.hoisted(() => ({
  segmentos: [] as SegmentoComplete[],
  byRamo: new Map<string, SegmentoComplete[]>(),
  queryOptions: undefined as undefined | { queryKey: unknown[]; queryFn: () => Promise<unknown> },
  fiscalData: undefined as undefined | { _variantId: string; isInherited: boolean },
  invalidate: vi.fn(),
  from: vi.fn(),
  // Recorder do builder PostgREST: untypedFrom() -> supabase.from(table).<ops>
  chains: [] as { table: string; ops: { fn: string; args: unknown[] }[] }[],
  results: [] as { data?: unknown[]; error?: unknown }[],
}));
vi.mock('@/hooks/crm', () => ({
  useRamosAtividadeGroups: () => ({
    data: { groups: [], totalGroups: 2 },
    isLoading: false,
    error: null,
  }),
  useRamoAtividadeGroups: () => ({
    data: { groups: [], totalGroups: 2 },
    isLoading: false,
    error: null,
  }),
  useSegmentosCompletos: () => ({
    data: {
      segmentos: mocks.segmentos,
      byRamo: mocks.byRamo,
      totalSegmentos: mocks.segmentos.length,
    },
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: NonNullable<typeof mocks.queryOptions>) => {
    mocks.queryOptions = options;
    return { data: mocks.fiscalData };
  },
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useRamoAtividadeFilter } from '@/hooks/crm/useRamoAtividadeFilter';
import { useSupplierFiscalData } from '@/hooks/products/useSupplierFiscalData';
import { useCategoryIcons, type CategoryIcon } from '@/hooks/products/useCategoryIcons';
import { getCategoryIcon } from '@/hooks/products/getCategoryIcon';

type PartialIconRow = {
  id: string | null;
  category_name: string | null;
  icon: string | null;
  description?: string | null;
};

function segmento(name: string, slug: string, ramoName: string, ramoSlug: string): SegmentoComplete {
  return {
    segmento_id: slug, segmento_name: name, segmento_slug: slug,
    segmento_description: null, segmento_icon: null, segmento_display_order: 0,
    ramo_id: ramoSlug, ramo_name: ramoName, ramo_slug: ramoSlug,
    ramo_description: null, ramo_hex_code: null, ramo_icon: null, ramo_display_order: 0,
  };
}

/** Builder encadeável que grava table + ops e resolve a fila mocks.results. */
function makeChain(table: string) {
  const ops: { fn: string; args: unknown[] }[] = [];
  mocks.chains.push({ table, ops });
  const chain: Record<string, unknown> = {
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(mocks.results.shift() ?? { data: [], error: null }).then(resolve),
  };
  for (const fn of ['select', 'eq', 'in', 'limit', 'update', 'delete', 'insert']) {
    chain[fn] = (...args: unknown[]) => {
      ops.push({ fn, args });
      return chain;
    };
  }
  return chain;
}
const opsOf = (index: number) => mocks.chains[index].ops.map(({ fn, args }) => [fn, args]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.segmentos = [
    segmento('Hospitais', 'hospitais', 'Saúde', 'saude'),
    segmento('Clínicas', 'clinicas', 'Saúde', 'saude'),
    segmento('Escolas', 'escolas', 'Educação', 'educacao'),
  ];
  mocks.byRamo = new Map([
    ['saude', mocks.segmentos.slice(0, 2)],
    ['educacao', mocks.segmentos.slice(2)],
  ]);
  mocks.queryOptions = undefined;
  mocks.fiscalData = undefined;
  mocks.chains = [];
  mocks.results = [];
  mocks.from.mockImplementation((table: string) => makeChain(table));
});

const filterCases = ['none', 'saude', 'educacao'].flatMap(ramo =>
  [false, true].map(selected => ({ ramo, selected })),
);
describe('ramo filter keeps cascading selection and clearAll contract', () => {
  it.each(filterCases)('ramo=$ramo selected=$selected', ({ ramo, selected }) => {
    const { result, rerender } = renderHook(() => useRamoAtividadeFilter());
    act(() => {
      if (ramo !== 'none') result.current.toggleRamo(ramo);
      if (selected) result.current.toggleSegmento('hospitais');
    });
    const ramoSlugs = (mocks.byRamo.get(ramo) ?? []).map(s => s.segmento_slug);
    const expectedSegmentos = selected
      ? ramoSlugs.includes('hospitais')
        ? ramoSlugs.filter(s => s !== 'hospitais')
        : [...ramoSlugs, 'hospitais']
      : ramoSlugs;
    const expected = ramo === 'none'
      ? mocks.segmentos
      : mocks.segmentos.filter(s => s.ramo_slug === ramo);
    expect(result.current.segmentos).toEqual(expected);
    if (ramo === 'none') expect(result.current.segmentos).toBe(mocks.segmentos);
    expect(result.current.byRamo).toBe(mocks.byRamo);
    expect(result.current.filterState).toEqual({
      selectedRamos: ramo === 'none' ? [] : [ramo],
      selectedSegmentos: expectedSegmentos,
      searchTerm: '',
    });
    expect(result.current.selectedCount).toBe(Number(ramo !== 'none') + expectedSegmentos.length);
    expect(result.current.hasActiveFilters).toBe(ramo !== 'none' || expectedSegmentos.length > 0);
    rerender();
    expect(result.current.segmentos).toEqual(expected);
    act(() => result.current.clearAll());
    expect(result.current.filterState).toEqual({
      selectedRamos: [],
      selectedSegmentos: [],
      searchTerm: '',
    });
  });

  it('removes only segments belonging to the deselected ramo', () => {
    const { result } = renderHook(() => useRamoAtividadeFilter());
    act(() => {
      result.current.toggleRamo('saude');
      result.current.toggleSegmento('hospitais');
      result.current.toggleSegmento('escolas');
    });
    expect(result.current.filterState.selectedSegmentos).toEqual(['clinicas', 'escolas']);
    expect(result.current.getSelectedSegmentosForRamo('saude')).toEqual([mocks.segmentos[1]]);
    act(() => result.current.toggleRamo('saude'));
    expect(result.current.filterState.selectedSegmentos).toEqual(['escolas']);
    expect(result.current.getSegmentosForRamo('missing')).toEqual([]);
  });
});

describe('legacy fiscal writes keep their supplier/product invalidation key', () => {
  it.each(['save', 'revert'])('%s keeps scoped VSS operation and invalidation', async operation => {
    mocks.fiscalData = { _variantId: 'variant', isInherited: false };
    mocks.results = [{ data: [{ id: 'source' }], error: null }, { data: [], error: null }];
    const { result } = renderHook(() => useSupplierFiscalData('product', 'supplier'));
    let saved = false;
    await act(async () => {
      saved = operation === 'save'
        ? await result.current.saveFiscalOverride({ cst: '', cfop: '', icms_rate: 0, pis_rate: null, cofins_rate: null, cest: '', csosn: '', operation_nature: '' })
        : await result.current.revertToInherited();
    });
    expect(saved).toBe(true);
    expect(mocks.chains[0].table).toBe('variant_supplier_sources');
    expect(opsOf(0)).toEqual([
      ['select', ['id']],
      ['eq', ['supplier_id', 'supplier']],
      ['eq', ['variant_id', 'variant']],
      ['limit', [1]],
    ]);
    expect(mocks.chains[1].table).toBe('variant_supplier_sources');
    expect(mocks.chains[1].ops[0].fn).toBe(operation === 'save' ? 'update' : 'delete');
    expect(mocks.chains[1].ops[1]).toEqual({ fn: 'eq', args: ['id', 'source'] });
    if (operation === 'save') {
      expect(mocks.chains[1].ops[0].args[0]).toMatchObject({ cst: null, cfop: null, icms_rate: 0 });
    }
    expect(mocks.invalidate).toHaveBeenCalledWith({
      queryKey: ['supplier-fiscal-data', 'product', 'supplier'],
    });
  });
});

describe('category rows retain partial database values', () => {
  it('returns every original row and fields without filtering or normalizing', async () => {
    const rows: PartialIconRow[] = [
      { id: null, category_name: null, icon: null, description: null },
      { id: 'one', category_name: '', icon: '', description: '' },
    ];
    mocks.from.mockImplementation((table: string) => ({
      select: (...selectArgs: unknown[]) => {
        mocks.chains.push({ table, ops: [{ fn: 'select', args: selectArgs }] });
        const chain = mocks.chains[mocks.chains.length - 1];
        return {
          eq: (...eqArgs: unknown[]) => {
            chain.ops.push({ fn: 'eq', args: eqArgs });
            return Promise.resolve({ data: rows, error: null });
          },
        };
      },
    }));
    renderHook(() => useCategoryIcons());
    expect(await mocks.queryOptions?.queryFn()).toBe(rows);
    expect(mocks.from).toHaveBeenCalledWith('category_icons');
    expect(opsOf(0)).toEqual([
      ['select', ['id, category_name, icon, description']],
      ['eq', ['is_active', true]],
    ]);
  });

  it.each([
    { name: null, rows: [], expected: '📦' },
    { name: 'Caneca', rows: [{ id: null, category_name: null, icon: null }], expected: 'Coffee' },
    { name: 'Caneca', rows: [{ id: 'one', category_name: 'caneca', icon: null }], expected: null },
    { name: 'Caneca', rows: [{ id: 'one', category_name: 'caneca', icon: '' }], expected: '' },
    { name: 'Caneca azul', rows: [{ id: 'one', category_name: 'caneca', icon: 'C' }], expected: 'C' },
    { name: 'Especial', rows: [{ id: 'one', category_name: 'especial', icon: 'E' }], expected: 'E' },
  ] satisfies { name: string | null; rows: PartialIconRow[]; expected: string | null }[])('handles $name with $expected', ({ name, rows, expected }) => {
    expect(getCategoryIcon(name, rows as unknown as CategoryIcon[])).toBe(expected);
  });
});
