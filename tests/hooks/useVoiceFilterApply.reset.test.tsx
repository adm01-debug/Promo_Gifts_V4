/**
 * Resgatado de `salvo/codex-fix-gate1-kit-pdf-types-261109-2252`
 * (`src/pages/FiltersPage.tsx:70-73`), onde o comando de voz `clear` fazia
 * `state.setFilters(defaultFilters)` — zerar o FilterState inteiro.
 *
 * Na main os dois únicos handlers de `clear` (`useGlobalSearch.ts:201` e
 * `AdvancedSearch.tsx:95`) limpavam só o TEXTO da busca. Quem ditava "limpar
 * os filtros" via o catálogo continuar filtrado por cor, categoria, material,
 * faixa de preço, estoque, kit, gênero e público-alvo.
 */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultFilters, type FilterState } from '@/components/filters/FilterPanel';
import { useVoiceFilterApply } from '@/hooks/products/useVoiceFilterApply';
import { useVoiceFilterBridge } from '@/stores/voiceFilterBridge';

beforeEach(() => {
  useVoiceFilterBridge.setState({ pendingFilters: null, pendingReset: false });
});
afterEach(cleanup);

describe('comando de voz "limpar" zera os filtros do catálogo', () => {
  it('aplica defaultFilters e consome o pedido uma única vez', () => {
    const setFilters = vi.fn();
    const { rerender } = renderHook(() => useVoiceFilterApply(setFilters));

    act(() => {
      useVoiceFilterBridge.getState().requestReset();
    });
    rerender();

    expect(setFilters).toHaveBeenCalledWith(defaultFilters);
    // Consumido: não pode reaplicar a cada render nem ao voltar para a rota.
    expect(useVoiceFilterBridge.getState().pendingReset).toBe(false);

    setFilters.mockClear();
    rerender();
    expect(setFilters).not.toHaveBeenCalled();
  });

  it('sem pedido de limpeza, não mexe nos filtros', () => {
    const setFilters = vi.fn();
    renderHook(() => useVoiceFilterApply(setFilters));
    expect(setFilters).not.toHaveBeenCalled();
  });

  it('limpar descarta filtro ditado que ainda não foi consumido', () => {
    const setFilters = vi.fn();

    act(() => {
      useVoiceFilterBridge.getState().requestFilters({ category: 'Canecas' });
      useVoiceFilterBridge.getState().requestReset();
    });
    renderHook(() => useVoiceFilterApply(setFilters));

    // Quem falou "limpar" depois de "canecas" quer a tela limpa, não os dois.
    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setFilters).toHaveBeenCalledWith(defaultFilters);
    expect(useVoiceFilterBridge.getState().pendingFilters).toBeNull();
  });

  it('o caminho de filtro ditado continua funcionando', () => {
    const setFilters = vi.fn<(u: FilterState | ((p: FilterState) => FilterState)) => void>();

    act(() => {
      useVoiceFilterBridge.getState().requestFilters({ category: 'Canecas' });
    });
    renderHook(() => useVoiceFilterApply(setFilters));

    // Guarda contra "consertar" o clear quebrando o filter.
    expect(setFilters).toHaveBeenCalledOnce();
    const atualizador = setFilters.mock.calls[0][0];
    expect(typeof atualizador).toBe('function');
  });
});
