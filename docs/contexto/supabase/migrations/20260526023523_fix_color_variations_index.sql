-- Query real: is_active=true, select id/name/slug/group_id → índice cobre o filtro
CREATE INDEX IF NOT EXISTS idx_color_variations_active_group
  ON public.color_variations(group_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_color_variations_color_group
  ON public.color_variations(color_group_id)
  WHERE color_group_id IS NOT NULL;
