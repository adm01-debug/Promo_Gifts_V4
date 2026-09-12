/**
 * Kit Builder Types
 * Tipos para o sistema de montagem de kits de brindes
 */

// ============================================
// TIPOS BASE
// ============================================

/** Tipo de kit suportado */
export type KitType = 'montado' | 'original' | 'simples';

export interface KitBox {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  // Dimensões internas em cm
  internalWidth: number;
  internalHeight: number;
  internalDepth: number;
  // Volume calculado
  internalVolume: number;
  /** False only when the UI is showing a non-authoritative estimate. */
  dimensionsKnown?: boolean;
  // Categoria/tipo de caixa
  boxType?: string;
  // Cor da caixa
  color?: string;
  // Material
  material?: string;
  // Peso em gramas
  weight?: number;
  // Peso máximo suportado em gramas (para validação)
  maxWeight?: number;
}

export interface KitItem {
  id: string;
  /**
   * Stable identifier for one line in a kit. A product can legitimately occur
   * more than once when different variants are selected, therefore `id` alone
   * is not a safe key for UI actions, personalization or persistence.
   *
   * Older JSON snapshots do not contain this field; `getKitItemLineId` keeps
   * them readable and the builder normalizes them on hydration.
   */
  lineId?: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  price: number;
  // Dimensões do item em cm (convertidas de mm se necessário)
  width: number;
  height: number;
  depth: number;
  // Volume calculado
  volume: number;
  /** False only when the UI is showing a non-authoritative estimate. */
  dimensionsKnown?: boolean;
  // Peso em gramas
  weight?: number;
  // Categoria do item
  category?: string;
  // Material do item
  material?: string;
  // Cor selecionada
  selectedColor?: {
    name: string;
    hex?: string;
  };
  /** Canonical variant selected for stock, SKU and quote validation. */
  selectedVariantId?: string;
  // Tamanho selecionado
  selectedSize?: string;
  // Quantidade no kit
  quantity: number;
  // Flags de composição (do product_kit_components)
  isOptional?: boolean;
  isReplaceable?: boolean;
  isPackaging?: boolean;
  allowsPersonalization?: boolean;
  // Notas de personalização
  personalizationNotes?: string;
  // Variantes permitidas para troca
  allowedVariantIds?: string[];
  // Personalização configurada
  personalization?: KitItemPersonalization;
}

export interface KitItemPersonalization {
  enabled: boolean;
  techniqueId?: string;
  techniqueName?: string;
  techniqueCode?: string;
  colors?: number;
  width?: number;
  height?: number;
  /** Stable code returned by the customization catalog for the application area. */
  positionCode?: string;
  /** Human-readable application area. Kept separately from `position` for legacy snapshots. */
  positionName?: string;
  /** @deprecated Legacy display-only area name; use positionCode/positionName for new writes. */
  position?: string;
  /**
   * Optional artwork uploaded by the user for this exact kit line. The image is
   * a source asset for the commercial review; visual previews remain indicative
   * until the production team approves the application area.
   */
  artworkUrl?: string;
  estimatedPrice?: number;
}

export interface KitPersonalization {
  box: KitItemPersonalization;
  /** Keyed by KitItem.lineId (legacy snapshots may still use the product id). */
  items: Record<string, KitItemPersonalization>;
}

/**
 * Derives the canonical key for an item line without requiring a migration of
 * already persisted drafts.  A product and each selected variant are separate
 * composition lines; the base product is explicitly represented as `base`.
 */
export function getKitItemLineId(
  item: Pick<KitItem, 'id' | 'lineId' | 'selectedVariantId'>,
): string {
  return item.lineId || `${item.id}:${item.selectedVariantId || 'base'}`;
}

/** Returns a persisted-ready item with a deterministic line key. */
export function normalizeKitItemLine(item: KitItem): KitItem {
  const lineId = getKitItemLineId(item);
  return item.lineId === lineId ? item : { ...item, lineId };
}

// ============================================
// ESTADO DO KIT
// ============================================

export interface KitIdentity {
  color: string; // hex
  icon: string; // lucide icon name
  tag?: string; // free text label
  description?: string;
  isFavorite?: boolean;
}

export interface KitState {
  name: string;
  kitType: KitType;
  box: KitBox | null;
  items: KitItem[];
  personalization: KitPersonalization;
  identity?: KitIdentity;
  // Volumes
  totalItemsVolume: number;
  availableVolume: number;
  volumeUsagePercent: number;
  // Peso total em gramas
  totalWeight: number;
  // Preços
  boxPrice: number;
  itemsPrice: number;
  personalizationPrice: number;
  totalPrice: number;
  // Status
  isValid: boolean;
  validationErrors: string[];
}

// ============================================
// COMPATIBILIDADE
// ============================================

export interface CompatibilityResult {
  fits: boolean;
  confidence?: 'unknown' | 'verified';
  reason?: string;
  volumeAfterAdd?: number;
  percentAfterAdd?: number;
}

// ============================================
// WIZARD
// ============================================

export type KitBuilderStep = 'box' | 'items' | 'personalization' | 'summary';

/**
 * The same editor supports two intentional journeys.  This belongs to the
 * client state for now because existing custom_kits snapshots do not have a
 * dedicated journey column; it must never be inferred from the current step.
 */
export type KitBuilderFlow = 'box-first' | 'items-first';

export interface KitBuilderWizardState {
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  canProceed: boolean;
  flow: KitBuilderFlow;
}

// ============================================
// FILTROS
// ============================================

export interface BoxFilters {
  search?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  minDepth?: number;
  maxDepth?: number;
  minPrice?: number;
  maxPrice?: number;
  boxType?: string;
  material?: string;
  finish?: string;
  closure?: string;
}

export interface ItemFilters {
  search?: string;
  category?: string;
  maxVolume?: number;
  onlyFitting?: boolean;
}

// ============================================
// PRODUTO EXTERNO (para conversão)
// ============================================

/** Material object from the external DB */
interface ExternalMaterialEntry {
  name?: string;
  material?: string;
  [key: string]: unknown;
}

/** Color variation from the external DB */
interface ExternalColorEntry {
  color_name?: string;
  color_hex?: string;
  color_code?: string;
  [key: string]: unknown;
}

export interface ExternalProductForKit {
  id: string;
  name: string;
  sku: string;
  /**
   * Legacy fallback retained only for isolated fixtures and historical rows.
   * The public Gold product view exposes `sale_price`, not `base_price`.
   */
  base_price?: number | null;
  sale_price?: number | null;
  image_url: string | null;
  primary_image_url: string | null;
  images?: string[] | null;
  dimensions?:
    | string
    | {
        width_cm?: number;
        height_cm?: number;
        length_cm?: number;
        diameter_cm?: number;
        shape_type?: string;
      }
    | null;
  category_id?: string | null;
  category_name?: string | null;
  colors?: ExternalColorEntry[] | null;
  materials?: (ExternalMaterialEntry | string)[] | null;
  // Tipo do produto (product, packaging, etc.)
  product_type?: string | null;
  // Peso em gramas
  weight_g?: number | null;
  // Material legado
  material?: string | null;
  // Dimensões em mm (compatibilidade)
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  // Dimensões diretas em cm
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  // Campos específicos para caixas
  box_length_cm?: number | null;
  box_width_cm?: number | null;
  box_height_cm?: number | null;
  internal_length_cm?: number | null;
  internal_width_cm?: number | null;
  internal_height_cm?: number | null;
  is_box?: boolean;
  is_kit?: boolean;
  packing_classification?: string | null;
  packing_type?: string | null;
  // Composição de kit
  allows_personalization?: boolean;
  personalization_notes?: string | null;
  is_optional?: boolean;
  is_replaceable?: boolean;
  allowed_variant_ids?: string[] | null;
}

// ============================================
// CONVERSÃO mm → cm
// ============================================

export function mmToCm(mm: number | null | undefined): number | null {
  if (mm === null || mm === undefined || mm <= 0) return null;
  return mm / 10;
}
