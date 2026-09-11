
CREATE INDEX IF NOT EXISTS idx_supplier_colors_supplier_code
  ON supplier_colors (supplier_id, code)
  WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_variation_values_type_active
  ON variation_values (variation_type_id, sort_order)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_novelties_expires_sweep
  ON product_novelties (supplier_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_color_variations_slug
  ON color_variations (slug);

CREATE INDEX IF NOT EXISTS idx_supplier_colors_code_lookup
  ON supplier_colors (code, organization_id)
  WHERE is_active = true;
;
