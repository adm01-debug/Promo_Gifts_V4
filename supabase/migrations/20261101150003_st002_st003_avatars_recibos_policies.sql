-- ST-002: Isolamento de owner em avatars (DELETE/UPDATE)
-- ST-003: WITH CHECK em recibos-entrega UPDATE
-- Severidade: MÉDIO | Tipo: SEGURANÇA/STORAGE

-- =============================================
-- ST-002: avatars — adicionar filtro owner
-- =============================================

DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;
CREATE POLICY "avatars_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
CREATE POLICY "avatars_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner = (SELECT auth.uid())
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND owner = (SELECT auth.uid())
  );

-- =============================================
-- ST-003: recibos-entrega — adicionar WITH CHECK
-- =============================================

DROP POLICY IF EXISTS "recibos_authenticated_update" ON storage.objects;
CREATE POLICY "recibos_authenticated_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated, service_role
  USING (bucket_id = 'recibos-entrega')
  WITH CHECK (bucket_id = 'recibos-entrega');

-- ROLLBACK:
-- Recriar as policies sem owner e sem WITH CHECK conforme estado anterior.
