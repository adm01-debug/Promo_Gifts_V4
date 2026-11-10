import type {
  MagicUpCurationStatus,
  MagicUpQualityDiagnosis,
} from '@/pages/magic-up/magicUpStrategy';

export interface MagicUpProduct {
  id: string;
  name: string;
  sku: string;
  images: Array<{
    url_cdn?: string;
    url_original?: string;
    is_primary?: boolean;
    is_og_image?: boolean;
    image_type?: string;
    supplier_code?: string;
  }> | null;
  primary_image_url?: string | null;
  og_image_url?: string | null;
}

export interface Technique {
  id: string;
  name: string;
  code: string;
}

export interface ProductColor {
  hex: string;
  name: string;
  code: string;
  stock?: number;
}

export interface ProductImage {
  url: string;
  supplierCode: string | null;
  isPrimary: boolean;
  isOgImage: boolean;
}

export interface SelectedClient {
  id: string;
  name: string;
  logo_url?: string | null;
  ramo_atividade?: string | null;
  cor_primaria_hex?: string | null;
  cor_primaria_nome?: string | null;
}

export interface VariationItem {
  id: string | null;
  imageUrl: string;
  isFavorite: boolean;
  qualityScore?: number;
  qualityDiagnosis?: MagicUpQualityDiagnosis;
  curationStatus?: MagicUpCurationStatus;
  isWinner?: boolean;
}
