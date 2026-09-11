
-- ═══════════════════════════════════════════════════════════════
-- PARTE 1: DDL + DADOS + CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: deduplicar antes de adicionar unique constraint
-- mantém: cf_id preenchido > updated_at mais recente
DELETE FROM public.xbz_gallery_staging
WHERE id IN (
    SELECT id FROM (
        SELECT id,
            ROW_NUMBER() OVER (
                PARTITION BY codigo_amigavel, url_original
                ORDER BY cloudflare_image_id NULLS LAST, updated_at DESC
            ) AS rn
        FROM public.xbz_gallery_staging
    ) t WHERE rn > 1
);

-- STEP 2: adicionar colunas SM (nullable primeiro)
ALTER TABLE public.xbz_gallery_staging
    ADD COLUMN IF NOT EXISTS variant_id       uuid,
    ADD COLUMN IF NOT EXISTS supplier_id      uuid,
    ADD COLUMN IF NOT EXISTS image_slug       text,
    ADD COLUMN IF NOT EXISTS image_id_site    integer,
    ADD COLUMN IF NOT EXISTS image_type       text,
    ADD COLUMN IF NOT EXISTS is_primary       boolean,
    ADD COLUMN IF NOT EXISTS display_order    integer,
    ADD COLUMN IF NOT EXISTS source           text,
    ADD COLUMN IF NOT EXISTS uploaded_at      timestamptz,
    ADD COLUMN IF NOT EXISTS product_image_id uuid,
    ADD COLUMN IF NOT EXISTS populated_at     timestamptz,
    ADD COLUMN IF NOT EXISTS partition_id     integer,
    ADD COLUMN IF NOT EXISTS retry_count      integer,
    ADD COLUMN IF NOT EXISTS cf_custom_id     text,
    ADD COLUMN IF NOT EXISTS cf_filename      text;

-- STEP 3: popular colunas novas a partir dos dados existentes
UPDATE public.xbz_gallery_staging SET
    supplier_id      = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid,
    image_type       = CASE WHEN d_number = 1 THEN 'main' ELSE 'gallery' END,
    is_primary       = (d_number = 1),
    display_order    = d_number - 1,
    source           = 'site',
    cf_custom_id     = cloudflare_image_id,
    cf_filename      = cloudflare_image_id || '.jpg',
    populated_at     = created_at,
    retry_count      = 0,
    uploaded_at      = CASE WHEN status = 'uploaded' THEN updated_at ELSE NULL END,
    image_slug       = lower(regexp_replace(
                           regexp_replace(coalesce(cloudflare_image_id,''), '^xbz-', ''),
                           '-\d{2}$', ''));

-- product_image_id: link via cloudflare_image_id → product_images
UPDATE public.xbz_gallery_staging xgs
SET    product_image_id = pi.id
FROM   public.product_images pi
WHERE  pi.cloudflare_image_id = xgs.cloudflare_image_id
  AND  xgs.product_image_id IS NULL;

-- STEP 4: migrar status para nomenclatura SM
UPDATE public.xbz_gallery_staging SET status = 'pending'   WHERE status = 'discovered';
UPDATE public.xbz_gallery_staging SET status = 'uploading' WHERE status = 'downloaded';

-- STEP 5: renomear colunas operacionais
ALTER TABLE public.xbz_gallery_staging RENAME COLUMN codigo_amigavel TO sku;
ALTER TABLE public.xbz_gallery_staging RENAME COLUMN url_original    TO source_url;
ALTER TABLE public.xbz_gallery_staging RENAME COLUMN url_cdn         TO cloudflare_url;

-- STEP 6: NOT NULL + defaults nas novas colunas
ALTER TABLE public.xbz_gallery_staging
    ALTER COLUMN supplier_id   SET NOT NULL,
    ALTER COLUMN supplier_id   SET DEFAULT 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid,
    ALTER COLUMN image_type    SET NOT NULL,
    ALTER COLUMN image_type    SET DEFAULT 'gallery',
    ALTER COLUMN is_primary    SET NOT NULL,
    ALTER COLUMN is_primary    SET DEFAULT false,
    ALTER COLUMN display_order SET NOT NULL,
    ALTER COLUMN display_order SET DEFAULT 0,
    ALTER COLUMN source        SET NOT NULL,
    ALTER COLUMN source        SET DEFAULT 'site',
    ALTER COLUMN retry_count   SET NOT NULL,
    ALTER COLUMN retry_count   SET DEFAULT 0,
    ALTER COLUMN status        SET DEFAULT 'pending';

-- STEP 7: constraints
ALTER TABLE public.xbz_gallery_staging
    DROP CONSTRAINT IF EXISTS uq_staging_codigo_d;

ALTER TABLE public.xbz_gallery_staging
    ADD CONSTRAINT uq_xbz_staging_sku_source_url UNIQUE (sku, source_url);

ALTER TABLE public.xbz_gallery_staging
    ADD CONSTRAINT uq_xbz_staging_cf_id UNIQUE (cf_custom_id);

CREATE INDEX IF NOT EXISTS idx_xbz_staging_status
    ON public.xbz_gallery_staging (status, created_at);
;
