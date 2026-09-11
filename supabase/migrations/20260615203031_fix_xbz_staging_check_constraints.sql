
-- chk_status: substituir valores XBZ antigos por SM-style
ALTER TABLE public.xbz_gallery_staging DROP CONSTRAINT chk_status;
ALTER TABLE public.xbz_gallery_staging
    ADD CONSTRAINT chk_status CHECK (status = ANY (ARRAY[
        'pending',   -- era 'discovered' (entry point)
        'uploading', -- era 'downloaded' (em trânsito para CF)
        'uploaded',  -- concluído no CF
        'promoted',  -- promovido para product_images (SM-style)
        'error',     -- falha
        'skipped'    -- ignorado intencionalmente
    ]));

-- chk_d_number: tornar permissivo para NULL (novos rows SM-style)
-- NULL passa automaticamente no PG, mas explicitamos com OR IS NULL
ALTER TABLE public.xbz_gallery_staging DROP CONSTRAINT chk_d_number;
ALTER TABLE public.xbz_gallery_staging
    ADD CONSTRAINT chk_d_number CHECK (d_number IS NULL OR (d_number >= 1 AND d_number <= 10));
;
