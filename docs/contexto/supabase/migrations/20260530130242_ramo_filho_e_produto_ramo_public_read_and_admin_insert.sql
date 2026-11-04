-- Contexto: external-db-bridge (Edge Function) foi descontinuada (HTTP 410).
-- ramoAtividadeService migra para PostgREST nativo. Estas policies espelham o
-- padrao ja aplicado em ramo_atividade (ramo_atividade_public_read).

-- 1) ramo_atividade_filho: leitura publica para o catalogo (segmentos)
--    Supersede a policy authenticated-only (anon+auth USING true a engloba).
DROP POLICY IF EXISTS raf_select_authenticated ON ramo_atividade_filho;
DROP POLICY IF EXISTS ramo_atividade_filho_public_read ON ramo_atividade_filho;
CREATE POLICY ramo_atividade_filho_public_read ON ramo_atividade_filho
  FOR SELECT TO anon, authenticated USING (true);

-- 2) produto_ramo_atividade: leitura publica (filtro de catalogo por segmento)
DROP POLICY IF EXISTS pra_select_authenticated ON produto_ramo_atividade;
DROP POLICY IF EXISTS produto_ramo_atividade_public_read ON produto_ramo_atividade;
CREATE POLICY produto_ramo_atividade_public_read ON produto_ramo_atividade
  FOR SELECT TO anon, authenticated USING (true);

-- 3) produto_ramo_atividade: INSERT por admin autenticado.
--    A bridge inseria via service_role; sem ela, o admin grava direto.
--    Mantemos pra_insert_service_role para jobs de backend.
DROP POLICY IF EXISTS pra_insert_admin ON produto_ramo_atividade;
CREATE POLICY pra_insert_admin ON produto_ramo_atividade
  FOR INSERT TO authenticated WITH CHECK (is_admin_or_above((SELECT auth.uid())));
