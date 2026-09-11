
-- Remove forwarding views de public para as 3 tabelas mortas do Grupo 1.
-- As tabelas continuam intactas em archive.* — só limpamos a "janela" pública desnecessária.
DROP VIEW IF EXISTS public.color_analysis_staging;
DROP VIEW IF EXISTS public.import_staging_images;
DROP VIEW IF EXISTS public.scraper_images_staging;
;
