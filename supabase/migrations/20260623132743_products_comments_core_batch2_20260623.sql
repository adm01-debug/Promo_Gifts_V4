
-- Batch 2: Mídia + Flags + Contadores
COMMENT ON COLUMN public.products.primary_image_url IS 'URL imagem principal (Cloudflare Images). 99%+ preenchido. Pré-calculado para listagens.';
COMMENT ON COLUMN public.products.images IS 'Cache jsonb galeria. Espelho de product_images (~72k linhas). Prefer product_images para queries completas.';
COMMENT ON COLUMN public.products.videos IS 'Cache jsonb vídeos. Espelho de product_videos.';
COMMENT ON COLUMN public.products.is_featured IS 'Produto em destaque. Toggle manual. Expira em is_featured_expires_at.';
COMMENT ON COLUMN public.products.is_new IS 'Produto novo. Boolean. Expira em is_new_expires_at.';
COMMENT ON COLUMN public.products.is_bestseller IS 'Bestseller. Calculado/manual. Expira em is_bestseller_expires_at.';
COMMENT ON COLUMN public.products.is_kit IS 'TRUE se kit/combo de itens. Afeta layout e cálculo de volume.';
COMMENT ON COLUMN public.products.is_imported IS 'TRUE se produto importado (vs nacional). Afeta cálculos fiscais.';
COMMENT ON COLUMN public.products.is_thermal IS 'TRUE se produto térmico (garrafa, caneca). Classificação automática.';
COMMENT ON COLUMN public.products.is_textil IS 'TRUE se têxtil (camiseta, toalha). Afeta weight_gr e surface_finish.';
COMMENT ON COLUMN public.products.view_count IS 'Total visualizações. Cache de product_views. Incrementado por trigger.';
COMMENT ON COLUMN public.products.favorite_count IS 'Total favoritos. Cache de favorite_items. Atualizado por trigger.';
COMMENT ON COLUMN public.products.order_count IS 'Total pedidos. Cache para ranking de popularidade.';
;
