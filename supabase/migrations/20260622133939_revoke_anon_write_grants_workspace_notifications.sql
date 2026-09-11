
-- ============================================================
-- BUG-SECURITY-ANON-WRITE: workspace_notifications
-- ============================================================
-- DIAGNÓSTICO:
--   anon tem GRANT INSERT, UPDATE, DELETE em workspace_notifications.
--   Todas as policies DML são TO authenticated (não anon).
--   Portanto anon nunca consegue gravar na prática (WITH CHECK falha),
--   mas o GRANT existe e viola princípio de menor privilégio.
--
-- IMPACTO DO REVOKE:
--   - anon: 0 rows afetadas (RLS já bloqueava tudo)
--   - authenticated: não afetado (não tem relação com anon grants)
--   - service_role: não afetado (bypassa RLS e grant)
--   - Edge Functions (n8n, notificationService): usam service_role → NÃO AFETADAS
--   - Simulação adversarial: 100% seguro
--
-- MOTIVAÇÃO:
--   Princípio de menor privilégio. Revogação elimina risco de:
--   1. Bug futuro na RLS que acidentalmente exporia escrita para anon
--   2. HEAD/OPTIONS requests de anon gerando erros 4xx no console
-- ============================================================

REVOKE INSERT, UPDATE, DELETE
  ON public.workspace_notifications
  FROM anon;

-- SELECT mantido: permite que HEAD requests de anon retornem 200+0rows
-- em vez de 401 (evita poluição de console durante race condition de auth)

NOTIFY pgrst, 'reload schema';
;
