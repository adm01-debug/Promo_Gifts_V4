import type { KitItem, ItemFilters, CompatibilityResult, KitBuilderFlow } from '@/lib/kit-builder';
import type { VariantSelectionData } from './VariantSelector';

export interface ItemWithCompatibility extends KitItem {
  compatibility: CompatibilityResult | null;
}

export interface ItemSelectorProps {
  items: ItemWithCompatibility[];
  /** Stable, unfiltered catalog used to keep facet options/counts visible. */
  catalogItems?: KitItem[];
  selectedItems: KitItem[];
  isLoading: boolean;
  filters: ItemFilters;
  onFiltersChange: (filters: ItemFilters) => void;
  onAddItem: (item: KitItem) => CompatibilityResult;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateVariant: (itemId: string, data: VariantSelectionData) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onClearAll?: () => void;
  boxSelected: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Total catalog size before filtering — powers the "X de Y produtos" counter. */
  totalCount?: number;
  /** Journey badge shown in the step header. */
  flow?: KitBuilderFlow;
  kitQuantity?: number;
  /** Real occupancy once a box exists; undefined/no box shows the "pending" copy. */
  volumeUsagePercent?: number;
  onNext?: () => void;
  canProceed?: boolean;
}
