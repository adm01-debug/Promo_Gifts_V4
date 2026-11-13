import type { BoxFilters, KitBox, KitItem } from '@/lib/kit-builder';

export type BoxSortMode = 'occupancy' | 'price' | 'score';
export type BoxViewMode = 'grid' | 'list';

export interface BoxSelectorProps {
  boxes: KitBox[];
  /**
   * Catálogo completo (sem nenhum filtro aplicado) — usado só para listar
   * todos os materiais possíveis no checkbox de filtro, mesmo quando um
   * filtro ativo zera a contagem de algum deles. Sem isso o checkbox some
   * em vez de aparecer desabilitado. Se omitido, cai para `boxes`.
   */
  allBoxes?: KitBox[];
  selectedBox: KitBox | null;
  kitItems?: KitItem[];
  isLoading: boolean;
  filters: BoxFilters;
  onFiltersChange: (filters: BoxFilters) => void;
  onSelect: (box: KitBox) => void;
  onClear: () => void;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Navigates back to the items step, preserving state. */
  onEditItems?: () => void;
  /** Reopens the shared Kit Maker onboarding tour. */
  onOpenGuide?: () => void;
}
