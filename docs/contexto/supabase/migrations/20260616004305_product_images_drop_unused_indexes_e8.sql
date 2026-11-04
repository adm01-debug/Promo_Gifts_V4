-- ============================================================================
-- E8: Drop de 3 índices não utilizados / redundantes em product_images
-- Economia: ~3.2 MB de storage + redução de overhead em INSERT/UPDATE/DELETE.
-- ============================================================================

-- (1) 0 scans — nenhum query usa is_og_image como filtro de busca
DROP INDEX IF EXISTS public.idx_product_images_og;

-- (2) 44 scans — sistema single-tenant: organization_id sempre o mesmo valor
--     (índice de cardinalidade ~1 → full scan mais eficiente)
DROP INDEX IF EXISTS public.idx_product_images_organization_id;

-- (3) 67 scans — coberto por idx_product_images_product_type_active
--     (product_id, image_type, display_order WHERE is_active=true)
--     Queries por image_type isolado são admin/reporting, não hot path
DROP INDEX IF EXISTS public.idx_product_images_type;

-- Verificar espaço recuperado
DO $$
DECLARE v_total bigint;
BEGIN
  SELECT SUM(pg_relation_size(indexrelid)) INTO v_total
  FROM pg_stat_user_indexes WHERE relname = 'product_images';
  RAISE NOTICE 'Tamanho total dos índices restantes: %', pg_size_pretty(v_total);
END $$;
