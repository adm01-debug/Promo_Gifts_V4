-- P01 — Correção de policies rls_restrictive_* com qual=true
-- Severidade: CRÍTICO
-- Problema: 10 tabelas têm policies ALL com qual=true e without_check=null,
--           permitindo acesso irrestrito a qualquer usuário autenticado.
--
-- ESTAS QUERIES NÃO DEVEM SER APLICADAS DIRETAMENTE.
-- Seguir o fluxo: migration SQL → PR → db-apply-migration.yml → migration repair.
--
-- Status: PROPOSTA — NÃO APLICADA
-- Requer aprovação do PO antes de qualquer aplicação.
--
-- ROLLBACK: Restaurar as policies originais (ver comentários em cada ALTER POLICY).
-- As policies originais podem ser consultadas com:
--   SELECT schemaname, tablename, policyname, cmd, qual, with_check, roles
--   FROM pg_policies WHERE policyname ILIKE 'rls_restrictive_%';

-- ===========================================================================
-- ANÁLISE POR TABELA
-- ===========================================================================

-- 1. system_kill_switches
--    Risco: qualquer usuário autenticado pode ativar/desativar feature flags
--    Correção: restringir a role de admin ou service_role
--    ROLLBACK: DROP POLICY e recriar com qual=true

/*
DROP POLICY IF EXISTS rls_restrictive_system_kill_switches_authenticated ON public.system_kill_switches;
CREATE POLICY rls_restrictive_system_kill_switches_authenticated
  ON public.system_kill_switches
  FOR ALL
  TO authenticated
  USING (
    -- Apenas usuários com role 'admin' ou 'service_role' podem acessar
    (auth.jwt() ->> 'role') IN ('admin', 'service_role')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') IN ('admin', 'service_role')
  );
*/

-- 2. ai_usage_quotas
--    ATENÇÃO: ai_usage_quotas NÃO tem coluna user_id. É tabela de configuração por app_role
--    (colunas: id, role, monthly_limit, is_unlimited, created_at, updated_at).
--    Políticas existentes (ai_usage_quotas_admin_*) já usam is_dev() OR has_role(..., 'admin').
--    Problema: rls_restrictive_ai_usage_quotas (ALL, USING (true)) é permissivo demais.
--    Correção: dropar a policy ALL=true e criar política de escrita restrita a admin.

/*
DROP POLICY IF EXISTS rls_restrictive_ai_usage_quotas ON public.ai_usage_quotas;
-- SELECT: qualquer authenticated pode ver (para conhecer sua própria quota de uso)
CREATE POLICY rls_restrictive_ai_usage_quotas_read
  ON public.ai_usage_quotas
  FOR SELECT
  TO authenticated
  USING (true);
-- WRITE: apenas admin/dev
CREATE POLICY rls_restrictive_ai_usage_quotas_write
  ON public.ai_usage_quotas
  FOR ALL
  TO authenticated
  USING (is_dev() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_dev() OR has_role(auth.uid(), 'admin'::app_role));
*/

-- 3. kit_collaborators
--    Risco: usuário pode adicionar/remover colaboradores de kits alheios
--    Correção: filtrar por kit ownership ou colaboração

/*
DROP POLICY IF EXISTS rls_restrictive_kit_collaborators_authenticated ON public.kit_collaborators;
CREATE POLICY rls_restrictive_kit_collaborators_authenticated
  ON public.kit_collaborators
  FOR ALL
  TO authenticated
  USING (
    -- Owner do kit ou o próprio colaborador
    EXISTS (
      SELECT 1 FROM public.kits k
      WHERE k.id = kit_id AND k.created_by = auth.uid()
    )
    OR collaborator_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kits k
      WHERE k.id = kit_id AND k.created_by = auth.uid()
    )
  );
*/

-- 4. notification_preferences
--    Risco: usuário pode ver/alterar preferências de outros
--    Correção: filtrar por user_id

/*
DROP POLICY IF EXISTS rls_restrictive_notification_preferences_authenticated ON public.notification_preferences;
CREATE POLICY rls_restrictive_notification_preferences_authenticated
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
*/

-- 5. product_ai_content / product_fiscal / product_seo / product_supply
--    Risco: qualquer usuário autenticado vê/altera dados de produtos de outros orgs
--    Correção: filtrar por org_id via tabela products

/*
-- Exemplo para product_fiscal (replicar para product_ai_content, product_seo, product_supply):
DROP POLICY IF EXISTS rls_restrictive_product_fiscal_authenticated ON public.product_fiscal;
CREATE POLICY rls_restrictive_product_fiscal_read_authenticated
  ON public.product_fiscal
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND p.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
  );

CREATE POLICY rls_restrictive_product_fiscal_write_authenticated
  ON public.product_fiscal
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND p.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND p.org_id = (auth.jwt() ->> 'org_id')::uuid
    )
  );
*/

-- 6. push_subscriptions
--    Risco: usuário pode ver subscriptions de outros
--    Correção: filtrar por user_id

/*
DROP POLICY IF EXISTS rls_restrictive_push_subscriptions_authenticated ON public.push_subscriptions;
CREATE POLICY rls_restrictive_push_subscriptions_authenticated
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
*/

-- 7. recently_viewed_products
--    Risco: usuário pode ver histórico de outros
--    Correção: filtrar por user_id

/*
DROP POLICY IF EXISTS rls_restrictive_recently_viewed_products_authenticated ON public.recently_viewed_products;
CREATE POLICY rls_restrictive_recently_viewed_products_authenticated
  ON public.recently_viewed_products
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
*/

-- ===========================================================================
-- VERIFICAÇÃO PÓS-APLICAÇÃO (queries de leitura para confirmar)
-- ===========================================================================

-- Verificar que as policies foram atualizadas:
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE policyname ILIKE 'rls_restrictive_%'
  AND (qual::text = 'true' OR qual::text = '(true)')
ORDER BY tablename;
-- Esperado: 0 linhas (todas as policies corrigidas)
