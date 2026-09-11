-- ============================================================
-- Consolidar video_type 'product' → 'product_video'
-- 11 linhas SPOT inativas com rótulo duplicado/ambíguo.
-- Nem 'product' nem 'product_video' existem em video_types.code —
-- canonicalização completa (alinhamento com video_types + video_type_id)
-- é BACKLOG de produto (requer decisão semântica: product_video→overview? promo→commercial?)
-- ============================================================
UPDATE product_videos
SET video_type = 'product_video'
WHERE video_type = 'product';
;
