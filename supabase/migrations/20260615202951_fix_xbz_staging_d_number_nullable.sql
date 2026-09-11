
-- d_number é coluna legada XBZ — novos inserts via fn_site_promote_to_gold
-- não fornecem d_number, então precisa ser nullable
ALTER TABLE public.xbz_gallery_staging
    ALTER COLUMN d_number DROP NOT NULL;
;
