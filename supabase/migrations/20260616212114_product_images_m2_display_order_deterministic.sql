-- ============================================================================
-- MELHORIA 2 — display_order determinístico por (product_id, color_id, image_type)
-- Primária sempre 1ª; desempate por (display_order, created_at, id). Elimina 18.484 colisões → 0.
-- Reversível (snapshot em backup). Suprime amplificação de triggers + resync determinístico final.
-- ============================================================================

-- Snapshot reversível do estado atual (ativas)
CREATE SCHEMA IF NOT EXISTS backup;
DROP TABLE IF EXISTS backup.product_images_display_order_20260616;
CREATE TABLE backup.product_images_display_order_20260616 AS
  SELECT id, display_order, now() AS snapshot_at
  FROM public.product_images WHERE is_active;

-- Suprime triggers nesta transação (sem ALTER global, sem lock exclusivo prolongado)
SET LOCAL session_replication_role = replica;

WITH reseq AS (
  SELECT id,
         row_number() OVER (PARTITION BY product_id, color_id, image_type
                            ORDER BY (NOT is_primary), display_order, created_at, id) AS new_order
  FROM public.product_images
  WHERE is_active
)
UPDATE public.product_images p
   SET display_order = r.new_order,
       updated_at    = now()
  FROM reseq r
 WHERE p.id = r.id
   AND p.display_order IS DISTINCT FROM r.new_order;

-- Restaura modo normal e reconstrói projeções (images/og/primary/fallback) determinísticamente
SET LOCAL session_replication_role = origin;
SELECT public.fn_resync_product_media(
  ARRAY(SELECT DISTINCT product_id FROM public.product_images WHERE is_active)
);;
