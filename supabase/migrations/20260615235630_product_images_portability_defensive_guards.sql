-- ============================================================================
-- FIX (review Codex P2 #2 e #4): robustez/portabilidade dos migrations.
-- #2: products.primary_image_fallback_url existe em prod (escrito pelo trigger de
--     sync), porém é "coluna fantasma" não criada por migration commitada -> em
--     rebuild fresco, fn_resync_product_media falharia. Garante a coluna.
-- #4: VALIDATE CONSTRAINT do format aborta se houver valores legados (JPEG/jpg/mime)
--     em um DB construído do zero com dados pré-existentes. Backfill canônico
--     (no-op em prod, já 100% canônico) torna o estado consistente.
-- Idempotente; seguro (no-op em produção).
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS primary_image_fallback_url text;

UPDATE public.product_images
SET format = CASE
      WHEN substring(regexp_replace(lower(format), '^.*/', '') from '[a-z0-9]+') = 'jpg'
        THEN 'jpeg'
      ELSE substring(regexp_replace(lower(format), '^.*/', '') from '[a-z0-9]+')
    END
WHERE format IS NOT NULL AND format !~ '^[a-z0-9]+$';;
