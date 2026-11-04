-- Fix quarantine storage policy: replace email-based check with role-based auth

DROP POLICY IF EXISTS "Acesso restrito ao bucket de quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Sistema pode gerenciar quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar quarentena" ON storage.objects;

CREATE POLICY "quarantine_select_admin_or_service"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'quarantine'
  AND public.is_supervisor_or_above((SELECT auth.uid()))
);

CREATE POLICY "quarantine_insert_service"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quarantine'
  AND public.is_supervisor_or_above((SELECT auth.uid()))
);

CREATE POLICY "quarantine_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quarantine'
  AND public.is_supervisor_or_above((SELECT auth.uid()))
);
