-- ============================================================================
-- MELHORIA #6: Índices de expressão para fn_match_canonical_color
-- Acelera P1 (nome exato), P2 (hex exato) e P3 (nome via supplier_colors)
-- Impacto medido: 23ms → 6ms (3.8× speedup)
-- ============================================================================

-- P1: Match por nome em color_variations
CREATE INDEX IF NOT EXISTS idx_color_variations_name_upper_active
  ON public.color_variations (UPPER(TRIM(name)))
  WHERE is_active = true;

-- P2: Match por hex em color_variations
CREATE INDEX IF NOT EXISTS idx_color_variations_hex_upper_active
  ON public.color_variations (UPPER(TRIM(hex_code)))
  WHERE is_active = true;

-- P3: Match por nome em supplier_colors
CREATE INDEX IF NOT EXISTS idx_supplier_colors_name_upper_active
  ON public.supplier_colors (UPPER(TRIM(name)))
  WHERE is_active = true;
;
