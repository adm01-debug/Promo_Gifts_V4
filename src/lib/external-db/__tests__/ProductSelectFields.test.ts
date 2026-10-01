import { describe, it, expect } from 'vitest';
import {
  PRODUCT_SELECT_FIELDS_WITH_SALE,
  PRODUCT_SELECT_FIELDS_LEGACY,
  PRODUCT_SELECT_FIELDS_LEGACY_NO_THRESHOLD,
  PRODUCT_SELECT_FIELDS_DETAIL,
} from '../product-types';

describe('Product Select Fields - Price Freshness', () => {
  it('should include price_freshness_threshold_days in main select fields', () => {
    expect(PRODUCT_SELECT_FIELDS_WITH_SALE).toContain('price_freshness_threshold_days');
    expect(PRODUCT_SELECT_FIELDS_LEGACY).toContain('price_freshness_threshold_days');
    expect(PRODUCT_SELECT_FIELDS_DETAIL).toContain('price_freshness_threshold_days');
  });

  it('should include price_updated_at in main select fields', () => {
    expect(PRODUCT_SELECT_FIELDS_WITH_SALE).toContain('price_updated_at');
    expect(PRODUCT_SELECT_FIELDS_LEGACY).toContain('price_updated_at');
    expect(PRODUCT_SELECT_FIELDS_DETAIL).toContain('price_updated_at');
  });

  it('should include is_featured and is_bestseller for ranking', () => {
    expect(PRODUCT_SELECT_FIELDS_WITH_SALE).toContain('is_featured');
    expect(PRODUCT_SELECT_FIELDS_WITH_SALE).toContain('is_bestseller');
  });

  it('keeps the public legacy price in both legacy projections', () => {
    // A legacy catalog has no sale_price. Its public price is base_price;
    // cost_price is internal and must never become a customer-facing fallback.
    expect(PRODUCT_SELECT_FIELDS_LEGACY).toContain('base_price');
    expect(PRODUCT_SELECT_FIELDS_LEGACY_NO_THRESHOLD).toContain('base_price');
  });
});
