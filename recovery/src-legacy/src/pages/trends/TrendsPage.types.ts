export type DateRange = '7d' | '30d' | '90d';

export interface ProductView {
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  view_type: string | null;
  created_at: string;
}

export interface SearchRow {
  search_term: string;
  results_count: number;
  created_at: string;
}

export interface AggregatedProduct {
  id: string;
  name: string;
  sku?: string;
  views: number;
  details: number;
  compares: number;
  favorites: number;
  recentViews: number;
  baselineViews: number;
  trendingScore: number;
  classification: 'falling' | 'new' | 'rising' | 'stable';
}

export interface AggregatedSearch {
  term: string;
  count: number;
  totalResults: number;
  avgResults: number;
}
