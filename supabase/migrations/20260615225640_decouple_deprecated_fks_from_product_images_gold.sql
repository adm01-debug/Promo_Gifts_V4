-- Remove o acoplamento cross-schema: tabelas em backup/ e archive/ não devem
-- mais amarrar a Gold viva (o caminho de DELETE da Gold tocava esses arquivos via SET NULL).
-- Os dados das tabelas de backup/arquivo permanecem intactos — só a FK é removida.
ALTER TABLE backup._deprecated_silver_images_queue_20260606
  DROP CONSTRAINT IF EXISTS silver_images_queue_gold_image_id_fkey;
ALTER TABLE archive.media_sync_log
  DROP CONSTRAINT IF EXISTS media_sync_log_image_id_fkey;;
