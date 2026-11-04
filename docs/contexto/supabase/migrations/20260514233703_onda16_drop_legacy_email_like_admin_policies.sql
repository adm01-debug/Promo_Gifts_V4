-- Onda 16 / item 3.4: drop legacy "email LIKE '%admin%'" policies (idempotente)
-- Em PROD essas policies ja foram dropadas e substituidas. Esta migration
-- garante consistencia entre PROD e repo, e protege contra recriacao do banco.

BEGIN;

-- storage.objects — policies frageis criadas em 27/abr/2026
DROP POLICY IF EXISTS "Acesso restrito ao bucket de quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Sistema pode gerenciar quarentena" ON storage.objects;

-- public.file_scan_logs — policy fragil criada em 27/abr/2026
DROP POLICY IF EXISTS "Apenas administradores podem visualizar logs de scan"
  ON public.file_scan_logs;

COMMIT;
