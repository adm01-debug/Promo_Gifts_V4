/**
 * applyVoiceFilterPatch — aplica os filtros ditados por voz sobre o FilterState.
 *
 * RESGATE: escrito por outro agente de IA em
 * origin/salvo/codex-fix-gate1-kit-pdf-types-261109-2252:src/lib/filters/voiceFilterPatch.ts,
 * nunca chegou à main. O contrato de voz em src/hooks/voice/types.ts:17-34 já declara
 * os 13 campos ("FIX-5: campos adicionais mapeados para FilterState"), mas nenhum
 * consumidor os aplicava: useGlobalSearch.ts e AdvancedSearch.tsx jogavam apenas
 * categoria/cor/material numa string de busca textual e descartavam preço, estoque,
 * gênero, público-alvo, kit, destaque, novidade, personalização e promoção.
 *
 * Mantido byte-a-byte na lógica do original; só o caminho do import de FilterState
 * mudou (a main moveu o tipo para components/filters/filter-panel/types.ts, reexportado
 * por FilterPanel).
 */
import type { FilterState } from '@/components/filters/FilterPanel';
import type { VoiceAgentAction } from '@/hooks/voice/types';

type VoiceFilters = NonNullable<NonNullable<VoiceAgentAction['data']>['filters']>;
const append = (values: string[], value: string) =>
  values.includes(value) ? values : [...values, value];

export function applyVoiceFilterPatch(previous: FilterState, filters: VoiceFilters): FilterState {
  const next = { ...previous };
  if (filters.color) next.colors = append(previous.colors, filters.color);
  if (filters.category) next.categories = append(previous.categories, filters.category);
  if (filters.material) next.materiais = append(previous.materiais, filters.material);
  if (filters.gender) next.gender = append(previous.gender, filters.gender);
  if (filters.publicoAlvo) next.publicoAlvo = append(previous.publicoAlvo, filters.publicoAlvo);
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const min = filters.minPrice ?? previous.priceRange[0];
    const max = filters.maxPrice ?? previous.priceRange[1];
    next.priceRange = min > max && max < 9999 ? [max, min] : [min, max];
  }
  if (filters.minStock !== undefined) next.minStock = filters.minStock;
  if (filters.inStock !== undefined) next.inStock = filters.inStock;
  if (filters.isKit !== undefined) next.isKit = filters.isKit;
  if (filters.featured !== undefined) next.featured = filters.featured;
  if (filters.isNew !== undefined) next.isNew = filters.isNew;
  if (filters.hasPersonalization !== undefined)
    next.hasPersonalization = filters.hasPersonalization;
  if (filters.onSale !== undefined) next.onSale = filters.onSale;
  return next;
}
