-- ST-001: Isolamento de owner nas policies do bucket art-files
-- Severidade: ALTO | Tipo: SEGURANÇA/STORAGE
-- Evidência: policies art_files_auth_delete/update/insert usam apenas bucket_id='art-files'
--            sem filtro por owner → qualquer autenticado pode deletar/alterar arquivos de outros.
-- Risco de regressão: baixo — usuários perdem acesso a arquivos alheios (comportamento incorreto).

DROP POLICY IF EXISTS "art_files_auth_delete" ON storage.objects;
CREATE POLICY "art_files_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'art-files'
    AND owner = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "art_files_auth_update" ON storage.objects;
CREATE POLICY "art_files_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'art-files'
    AND owner = (SELECT auth.uid())
  )
  WITH CHECK (
    bucket_id = 'art-files'
    AND owner = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "art_files_auth_insert" ON storage.objects;
CREATE POLICY "art_files_auth_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'art-files'
    AND owner = (SELECT auth.uid())
  );

-- ROLLBACK:
-- DROP POLICY IF EXISTS "art_files_auth_delete" ON storage.objects;
-- CREATE POLICY "art_files_auth_delete" ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'art-files');
-- (repetir para update e insert)
