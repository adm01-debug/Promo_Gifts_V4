
-- Remove forwarding views e devolve as tabelas físicas para public
DROP VIEW IF EXISTS public.sm_images_staging;
DROP VIEW IF EXISTS public.xbz_gallery_staging;

ALTER TABLE archive.sm_images_staging  SET SCHEMA public;
ALTER TABLE archive.xbz_gallery_staging SET SCHEMA public;

NOTIFY pgrst, 'reload schema';
;
