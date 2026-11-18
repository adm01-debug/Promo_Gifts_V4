/**
 * Ponte voz -> catálogo: o comando de FILTRO aplica os critérios ditados no
 * FilterState real, em vez de virar busca textual.
 *
 * Antes deste resgate, useGlobalSearch.ts tratava 'search' e 'filter' no mesmo
 * bloco e colava apenas categoria/cor/material numa string de busca, descartando
 * preço, estoque, gênero, público-alvo, kit, destaque, novidade, personalização e
 * promoção — campos que o contrato de voz (src/hooks/voice/types.ts:17-34) declara.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import type { FilterState } from '@/components/filters/FilterPanel';
import { useVoiceFilterApply } from '@/hooks/products/useVoiceFilterApply';
import { defaultFilters } from '@/components/filters/FilterPanel';
import { applyVoiceFilterPatch } from '@/lib/filters/voiceFilterPatch';
import { useVoiceFilterBridge } from '@/stores/voiceFilterBridge';

describe('ponte de filtros por voz', () => {
  beforeEach(() => {
    act(() => {
      useVoiceFilterBridge.getState().consumeFilters();
    });
  });

  it('guarda os filtros ditados e entrega uma única vez', () => {
    expect(useVoiceFilterBridge.getState().pendingFilters).toBeNull();

    act(() => {
      useVoiceFilterBridge.getState().requestFilters({ color: 'Azul', maxPrice: 50 });
    });
    expect(useVoiceFilterBridge.getState().pendingFilters).toEqual({
      color: 'Azul',
      maxPrice: 50,
    });

    // O consumidor (useCatalogState) consome; uma volta de rota não reaplica.
    act(() => {
      useVoiceFilterBridge.getState().consumeFilters();
    });
    expect(useVoiceFilterBridge.getState().pendingFilters).toBeNull();
  });

  it('aplica no FilterState os critérios que a busca textual descartava', () => {
    const aplicado = applyVoiceFilterPatch(defaultFilters, {
      category: 'Canecas',
      color: 'Azul',
      minPrice: 20,
      maxPrice: 50,
      minStock: 100,
      inStock: true,
      isKit: true,
      gender: 'Feminino',
      publicoAlvo: 'Clientes',
      featured: true,
      isNew: true,
      hasPersonalization: true,
      onSale: true,
    });

    expect(aplicado).toMatchObject({
      categories: ['Canecas'],
      colors: ['Azul'],
      priceRange: [20, 50],
      minStock: 100,
      inStock: true,
      isKit: true,
      gender: ['Feminino'],
      publicoAlvo: ['Clientes'],
      featured: true,
      isNew: true,
      hasPersonalization: true,
      onSale: true,
    });
    // defaultFilters não é mutado.
    expect(defaultFilters.categories).toEqual([]);
    expect(defaultFilters.priceRange).not.toEqual([20, 50]);
  });
});

describe('aplicação no catálogo (useVoiceFilterApply)', () => {
  beforeEach(() => {
    act(() => {
      useVoiceFilterBridge.getState().consumeFilters();
    });
  });

  function montar() {
    return renderHook(() => {
      const [filters, setFilters] = useState<FilterState>(defaultFilters);
      useVoiceFilterApply(setFilters);
      return filters;
    });
  }

  it('aplica os filtros ditados no FilterState e limpa a ponte', () => {
    const { result } = montar();
    expect(result.current.colors).toEqual([]);

    act(() => {
      useVoiceFilterBridge.getState().requestFilters({ color: 'Azul', maxPrice: 50, isKit: true });
    });

    expect(result.current.colors).toEqual(['Azul']);
    expect(result.current.priceRange[1]).toBe(50);
    expect(result.current.isKit).toBe(true);
    // Consumido: uma remontagem (voltar para o catálogo) não reaplica.
    expect(useVoiceFilterBridge.getState().pendingFilters).toBeNull();
  });

  it('não toca no FilterState quando não há comando de voz pendente', () => {
    const setFilters = vi.fn();
    renderHook(() => useVoiceFilterApply(setFilters));
    expect(setFilters).not.toHaveBeenCalled();
  });
});
