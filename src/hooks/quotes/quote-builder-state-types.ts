export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[] | null;
  colors?: { name: string; hex?: string; stock?: number }[];
  minQuantity?: number;
  totalStock?: number;
}

export interface RawProductColor {
  name?: string;
  hex?: string;
  stock?: number;
}

export type SimulatorPrefill = {
  product?: { id: string; name: string; sku?: string; imageUrl?: string; price?: number };
  quantity?: number;
  personalizations?: Array<{
    technique?: { id: string; name: string };
    specs?: { colors?: number; width?: number; height?: number };
    pricing?: { setupPrice?: number; unitPrice?: number; totalPrice?: number };
  }>;
};

export type CartPrefillItem = {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string;
  quantity: number;
  unit_price: number;
  color_name?: string;
  color_hex?: string;
};

export type CollectionPrefillProduct = {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string | null;
  unit_price: number;
  quantity: number;
  color_name?: string | null;
  color_hex?: string | null;
};
