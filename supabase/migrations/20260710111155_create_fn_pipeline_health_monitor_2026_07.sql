
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: create_fn_pipeline_health_monitor_2026_07
--
-- Função de monitoramento contínuo do pipeline de imagens.
-- Detecta automaticamente os problemas que encontramos nas auditorias:
-- 1. Produtos com primary_image_url CF sem verified primary record
-- 2. Orphan variants (active variant de produto inativo)
-- 3. Orphan images (active image de produto inativo)
-- 4. Imagens pending bloqueadas (sem tentativas há > 1h)
-- 5. Produtos ativos sem nenhuma imagem (gap)
-- 6. Swatches duplicados no JSONB
-- 7. Tokens de desativação expirados sem uso
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_pipeline_health_monitor()
RETURNS TABLE (
  check_name        text,
  status            text,    -- 'OK' | 'WARNING' | 'CRITICAL'
  value             bigint,
  target            bigint,
  details           text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN

  -- 1. Gap de imagens — produtos ativos sem CF verified
  RETURN QUERY SELECT
    'gap_sem_cf_images'::text,
    CASE WHEN (SELECT COUNT(*) FROM products p WHERE p.is_active=true
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id=p.id AND pi.cf_sync_status='verified' AND pi.is_active=true)) > 50
      THEN 'CRITICAL' WHEN (SELECT COUNT(*) FROM products p WHERE p.is_active=true
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id=p.id AND pi.cf_sync_status='verified' AND pi.is_active=true)) > 0
      THEN 'WARNING' ELSE 'OK' END,
    (SELECT COUNT(*) FROM products p WHERE p.is_active=true
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id=p.id AND pi.cf_sync_status='verified' AND pi.is_active=true))::bigint,
    0::bigint,
    'Produtos ativos sem imagem verificada no Cloudflare'::text;

  -- 2. Primary consistency — CF URL sem verified primary record
  RETURN QUERY SELECT
    'primary_cf_without_verified_record'::text,
    CASE WHEN (SELECT COUNT(*) FROM products p WHERE p.is_active=true AND p.primary_image_url LIKE '%imagedelivery.net%'
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id=p.id AND pi.is_primary=true AND pi.cf_sync_status='verified' AND pi.is_active=true)) > 0
      THEN 'CRITICAL' ELSE 'OK' END,
    (SELECT COUNT(*) FROM products p WHERE p.is_active=true AND p.primary_image_url LIKE '%imagedelivery.net%'
      AND NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id=p.id AND pi.is_primary=true AND pi.cf_sync_status='verified' AND pi.is_active=true))::bigint,
    0::bigint,
    'primary_image_url aponta CF mas sem product_images.is_primary=true verified'::text;

  -- 3. Orphan variants
  RETURN QUERY SELECT
    'orphan_variants'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.is_active=false AND pv.is_active=true) > 0
      THEN 'CRITICAL' ELSE 'OK' END,
    (SELECT COUNT(*) FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.is_active=false AND pv.is_active=true)::bigint,
    0::bigint,
    'Variantes ativas pertencendo a produtos inativos'::text;

  -- 4. Orphan images
  RETURN QUERY SELECT
    'orphan_images'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_images pi JOIN products p ON p.id=pi.product_id WHERE p.is_active=false AND pi.is_active=true) > 0
      THEN 'CRITICAL' ELSE 'OK' END,
    (SELECT COUNT(*) FROM product_images pi JOIN products p ON p.id=pi.product_id WHERE p.is_active=false AND pi.is_active=true)::bigint,
    0::bigint,
    'Imagens ativas pertencendo a produtos inativos'::text;

  -- 5. Imagens pending há muito tempo (> 6h)
  RETURN QUERY SELECT
    'pending_images_stuck'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_images WHERE cf_sync_status='pending' AND is_active=true AND updated_at < NOW() - INTERVAL '6 hours') > 0
      THEN 'WARNING' ELSE 'OK' END,
    (SELECT COUNT(*) FROM product_images WHERE cf_sync_status='pending' AND is_active=true AND updated_at < NOW() - INTERVAL '6 hours')::bigint,
    0::bigint,
    'Imagens pending sem atualização há > 6h (pipeline pode estar preso)'::text;

  -- 6. Swatches duplicados
  RETURN QUERY SELECT
    'swatch_duplicates'::text,
    CASE WHEN (
      SELECT COUNT(*) FROM (
        SELECT p.id FROM products p,
          jsonb_array_elements(CASE jsonb_typeof(p.color_swatches) WHEN 'array' THEN p.color_swatches ELSE '[]'::jsonb END) cs
        WHERE p.is_active=true AND cs->>'image_url' IS NOT NULL AND cs->>'color_name' IS NOT NULL
        GROUP BY p.id, cs->>'color_name', cs->>'image_url' HAVING COUNT(*)>1
      ) t) > 0 THEN 'WARNING' ELSE 'OK' END,
    (SELECT COUNT(*) FROM (
        SELECT p.id FROM products p,
          jsonb_array_elements(CASE jsonb_typeof(p.color_swatches) WHEN 'array' THEN p.color_swatches ELSE '[]'::jsonb END) cs
        WHERE p.is_active=true AND cs->>'image_url' IS NOT NULL AND cs->>'color_name' IS NOT NULL
        GROUP BY p.id, cs->>'color_name', cs->>'image_url' HAVING COUNT(*)>1
      ) t)::bigint,
    0::bigint,
    'Produtos com entradas duplicadas em color_swatches'::text;

  -- 7. Tokens expirados sem uso
  RETURN QUERY SELECT
    'expired_unused_tokens'::text,
    CASE WHEN (SELECT COUNT(*) FROM product_deactivation_tokens WHERE used=false AND expires_at < NOW()) > 0
      THEN 'WARNING' ELSE 'OK' END,
    (SELECT COUNT(*) FROM product_deactivation_tokens WHERE used=false AND expires_at < NOW())::bigint,
    0::bigint,
    'Tokens de autorização de desativação expirados sem uso'::text;

  -- 8. primary_image_url inválida (HTML em vez de imagem)
  RETURN QUERY SELECT
    'invalid_primary_image_url'::text,
    CASE WHEN (SELECT COUNT(*) FROM products WHERE is_active=true
      AND primary_image_url IS NOT NULL
      AND primary_image_url NOT LIKE '%imagedelivery.net%'
      AND primary_image_url NOT LIKE '%.jpg%'
      AND primary_image_url NOT LIKE '%.png%'
      AND primary_image_url NOT LIKE '%.webp%'
    ) > 0 THEN 'WARNING' ELSE 'OK' END,
    (SELECT COUNT(*) FROM products WHERE is_active=true
      AND primary_image_url IS NOT NULL
      AND primary_image_url NOT LIKE '%imagedelivery.net%'
      AND primary_image_url NOT LIKE '%.jpg%'
      AND primary_image_url NOT LIKE '%.png%'
      AND primary_image_url NOT LIKE '%.webp%'
    )::bigint,
    0::bigint,
    'primary_image_url aponta para URL não-imagem (HTML, texto, etc.)'::text;

END $$;

COMMENT ON FUNCTION public.fn_pipeline_health_monitor IS
'Monitor de saúde do pipeline de imagens CF. Detecta orphans, inconsistências,
 imagens stuck, swatches duplicados e tokens expirados. Criado em 2026-07-10.';
;
