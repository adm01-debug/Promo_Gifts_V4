
-- Drop constraint (que criou índice full)
ALTER TABLE public.xbz_gallery_staging DROP CONSTRAINT IF EXISTS uq_xbz_staging_cf_id;

-- Recriar como partial index — idêntico ao SM
-- SM: WHERE (cf_custom_id IS NOT NULL)
CREATE UNIQUE INDEX uq_xbz_staging_cf_id
    ON public.xbz_gallery_staging (cf_custom_id)
    WHERE (cf_custom_id IS NOT NULL);
;
