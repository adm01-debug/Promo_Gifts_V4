-- ============================================================
-- DROP 7 funções-landmine que referenciam archive.media_sync_log
-- Nenhuma ligada a trigger, view, policy ou função chamadora.
-- pipeline ativo usa fn_get_image_upload_queue + UPDATEs diretos
-- (ADR-001; confirmado por auditoria 27/06/2026)
-- fix_version: media_cleanup_20260627
-- ============================================================

-- 1. Pure loggers (só fazem INSERT INTO media_sync_log)
DROP FUNCTION IF EXISTS public.log_image_upload(uuid, character varying, text, text, bigint, character varying);
DROP FUNCTION IF EXISTS public.log_video_upload(uuid, character varying, text, text, bigint, character varying);

-- 2. Stat reader (SELECT de media_sync_log)
DROP FUNCTION IF EXISTS public.get_cloudflare_stats();

-- 3. Register functions (INSERT product_images/videos + INSERT media_sync_log → quebradas)
DROP FUNCTION IF EXISTS public.register_cloudflare_image(
  uuid, character varying, text, character varying,
  uuid, uuid, character varying, bigint,
  integer, integer, character varying, boolean, integer,
  character varying, text
);
DROP FUNCTION IF EXISTS public.register_cloudflare_video(
  uuid, character varying, text, character varying, character varying,
  text, text, text, character varying, bigint,
  integer, integer, integer, boolean, integer,
  character varying, character varying, text
);

-- 4. Update-after-sync helpers (UPDATE product_images/videos + INSERT media_sync_log → quebradas)
DROP FUNCTION IF EXISTS public.update_image_after_sync(
  uuid, character varying, text, bigint, integer, integer, character varying
);
DROP FUNCTION IF EXISTS public.update_video_after_sync(
  uuid, character varying, text, text, text, text, integer, integer, integer
);
;
