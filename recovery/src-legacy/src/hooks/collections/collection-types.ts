export interface CollectionVariantInfo {
  color_name?: string | null;
  color_hex?: string | null;
  size_code?: string | null;
  variant_id?: string | null;
  thumbnail?: string | null;
}

export interface CollectionProductItem {
  productId: string;
  variant?: CollectionVariantInfo;
  notes?: string;
  priceAtSave?: number | null;
  addedAt?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isFeatured: boolean;
  clientId?: string | null;
  clientName?: string | null;
  shareToken?: string | null;
  shareExpiresAt?: string | null;
  isPublic?: boolean;
  /** @deprecated Use productItems instead */
  productIds: string[];
  productItems: CollectionProductItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DbCollectionRow {
  id: string;
  name: string;
  description: string | null;
  icon_color: string | null;
  icon: string | null;
  is_featured: boolean | null;
  client_id: string | null;
  client_name: string | null;
  share_token: string | null;
  share_expires_at: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface DbCollectionItemRow {
  product_id: string;
  color_name: string | null;
  color_hex: string | null;
  thumbnail_url: string | null;
  notes: string | null;
  price_at_save: number | null;
  created_at: string;
  collection_id: string;
  sort_order: number | null;
}
