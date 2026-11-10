import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SegmentoComplete } from '@/types/ramo-atividade';

const mocks = vi.hoisted(() => ({
  segmentos: [] as SegmentoComplete[],
  byRamo: new Map<string, SegmentoComplete[]>(),
  queryOptions: undefined as undefined | { queryKey: unknown[]; queryFn: () => Promise<unknown> },
  fiscalData: undefined as undefined | { _variantId: string; isInherited: boolean },
  external: vi.fn(),
  invalidate: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/hooks/useRamoAtividade', () => ({
  useRamosAtividadeGroups: () => ({ data: { groups: [], totalGroups: 2 }, isLoading: false, error: null }),
}));
vi.mock('@/hooks/useRamoAtividadeFilho', () => ({
  useSegmentosCompletos: () => ({
    data: { segmentos: mocks.segmentos, byRamo: mocks.byRamo, totalSegmentos: mocks.segmentos.length },
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
vi.mock('@/lib/external-db', () => ({ invokeExternalDb: mocks.external }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn() } }));

import { useRamoAtividadeFilter } from '@/hooks/useRamoAtividadeFilter';
import { useSupplierFiscalData } from '@/hooks/useSupplierFiscalData';
import { getCategoryIcon, useCategoryIcons, type CategoryIcon } from '@/hooks/useCategoryIcons';

function segmento(name: string, slug: string, ramoName: string, ramoSlug: string): SegmentoComplete {
  return {
    segmento_id: slug, segmento_name: name, segmento_slug: slug,
    segmento_description: null, segmento_icon: null, segmento_display_order: 0,
    ramo_id: ramoSlug, ramo_name: ramoName, ramo_slug: ramoSlug,
    ramo_description: null, ramo_hex_code: null, ramo_icon: null, ramo_display_order: 0,
  };
}

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
});

const filterCases = ['', 'hosp', 'CLÍN', 'saúde', 'Educação', 'ausente'].flatMap(search =>
  ['none', 'saude', 'educacao'].flatMap(ramo => [false, true].map(selected => ({ search, ramo, selected }))),
);
describe('legacy ramo search and independent clear APIs remain available', () => {
  it.each(filterCases)('search=$search ramo=$ramo selected=$selected', ({ search, ramo, selected }) => {
    const { result, rerender } = renderHook(() => useRamoAtividadeFilter());
    act(() => {
      result.current.setSearchTerm(search);
      if (ramo !== 'none') result.current.toggleRamo(ramo);
      if (selected) result.current.toggleSegmento('hospitais');
    });
    const expected = mocks.segmentos.filter(s =>
      (!search || s.segmento_name.toLowerCase().includes(search.toLowerCase()) || s.ramo_name.toLowerCase().includes(search.toLowerCase())) &&
      (ramo === 'none' || s.ramo_slug === ramo) && (!selected || s.segmento_slug === 'hospitais'),
    );
    expect(result.current.filteredSegmentos).toEqual(expected);
    expect(result.current.segmentos).toBe(mocks.segmentos);
    expect(result.current.byRamo).toBe(mocks.byRamo);
    expect(result.current.activeFiltersCount).toBe(Number(ramo !== 'none') + Number(selected));
    rerender();
    expect(result.current.filteredSegmentos).toEqual(expected);
    act(() => result.current.clearRamoFilters());
    expect(result.current.filterState).toEqual({ selectedRamos: [], selectedSegmentos: selected ? ['hospitais'] : [], searchTerm: search });
    act(() => result.current.clearSegmentoFilters());
    expect(result.current.filterState.searchTerm).toBe(search);
    act(() => result.current.clearFilters());
    expect(result.current.filterState).toEqual({ selectedRamos: [], selectedSegmentos: [], searchTerm: '' });
  });

  it('removes only segments belonging to the deselected ramo', () => {
    const { result } = renderHook(() => useRamoAtividadeFilter());
    act(() => {
      result.current.toggleRamo('saude');
      result.current.toggleSegmento('hospitais');
      result.current.toggleSegmento('escolas');
    });
    expect(result.current.getSelectedSegmentosForRamo('saude')).toEqual([mocks.segmentos[0]]);
    act(() => result.current.toggleRamo('saude'));
    expect(result.current.filterState.selectedSegmentos).toEqual(['escolas']);
    expect(result.current.getSegmentosForRamo('missing')).toEqual([]);
  });
});

describe('legacy fiscal writes keep their supplier/product invalidation key', () => {
  it.each(['save', 'revert'])('%s keeps scoped VSS operation and invalidation', async operation => {
    mocks.fiscalData = { _variantId: 'variant', isInherited: false };
    mocks.external.mockResolvedValueOnce({ records: [{ id: 'source' }] }).mockResolvedValueOnce({ records: [] });
    const { result } = renderHook(() => useSupplierFiscalData('product', 'supplier'));
    let saved = false;
    await act(async () => {
      saved = operation === 'save'
        ? await result.current.saveFiscalOverride({ cst: '', cfop: '', icms_rate: 0, pis_rate: null, cofins_rate: null, cest: '', csosn: '', operation_nature: '' })
        : await result.current.revertToInherited();
    });
    expect(saved).toBe(true);
    expect(mocks.external.mock.calls[0][0]).toMatchObject({ table: 'variant_supplier_sources', filters: { supplier_id: 'supplier', variant_id: 'variant' }, limit: 1 });
    expect(mocks.external.mock.calls[1][0]).toMatchObject({ table: 'variant_supplier_sources', operation: operation === 'save' ? 'update' : 'delete', id: 'source' });
    if (operation === 'save') expect(mocks.external.mock.calls[1][0].data).toMatchObject({ cst: null, cfop: null, icms_rate: 0 });
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['supplier-fiscal-data', 'product', 'supplier'] });
  });
});

describe('category rows retain partial database values', () => {
  it('returns every original row and fields without filtering or normalizing', async () => {
    const rows = [{ id: null, category_name: null, icon: null, description: null }, { id: 'one', category_name: '', icon: '', description: '' }];
    const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.from.mockReturnValue({ select });
    renderHook(() => useCategoryIcons());
    expect(await mocks.queryOptions?.queryFn()).toBe(rows);
    expect(select).toHaveBeenCalledWith('id, category_name, icon, description');
    expect(eq).toHaveBeenCalledWith('is_active', true);
  });

  it.each([
    { name: null, rows: [], expected: '📦' },
    { name: 'Caneca', rows: [{ id: null, category_name: null, icon: null }], expected: '☕' },
    { name: 'Caneca', rows: [{ id: 'one', category_name: 'caneca', icon: null }], expected: '☕' },
    { name: 'Caneca', rows: [{ id: 'one', category_name: 'caneca', icon: '' }], expected: '' },
    { name: 'Caneca azul', rows: [{ id: 'one', category_name: 'caneca', icon: 'C' }], expected: 'C' },
    { name: 'Especial', rows: [{ id: 'one', category_name: 'especial', icon: 'E' }], expected: 'E' },
  ] satisfies { name: string | null; rows: CategoryIcon[]; expected: string }[])('handles $name with $expected', ({ name, rows, expected }) => {
    expect(getCategoryIcon(name, rows)).toBe(expected);
  });
});
