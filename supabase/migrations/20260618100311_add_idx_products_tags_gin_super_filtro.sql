-- Super Filtro health gate: idx_tags_gin estava 🔴 (índice ausente).
-- products.tags é jsonb (array de atributos do produto). Índice GIN parcial
-- (somente ativos/não-deletados), mesmo padrão de idx_products_target_audience_gin
-- e idx_products_surface_finish_gin. Aditivo, sem impacto em leitura existente.
CREATE INDEX IF NOT EXISTS idx_products_tags_gin
  ON public.products USING gin (tags)
  WHERE (is_active = true AND is_deleted IS NOT TRUE);;
