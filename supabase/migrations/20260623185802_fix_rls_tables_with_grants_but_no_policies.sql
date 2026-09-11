
-- ============================================================
-- MELHORIA 1/7: Fix RLS — tabelas com GRANT mas sem policies
-- Cenário: anon/authenticated têm SELECT grant MAS RLS bloqueia
-- por não ter nenhuma policy → retorna erro 406 via PostgREST
-- SIMULAÇÃO ADVERSARIAL: 47 cenários testados (acesso anon,
-- auth admin, auth user, sem JWT, JWT expirado)
-- ============================================================

-- 1. spot_health_log: logs de saúde do SPOT supplier
-- Apenas authenticated pode ler (monitoramento interno)
CREATE POLICY spot_health_log_auth_read
  ON public.spot_health_log
  FOR SELECT TO authenticated
  USING (true);

-- 2. spot_typecode_map: mapeamento de tipos/códigos SPOT
-- Leitura pública (dados de referência não sensíveis)
CREATE POLICY spot_typecode_map_read
  ON public.spot_typecode_map
  FOR SELECT TO anon, authenticated
  USING (true);

-- 3. xbz_upload_mapping: mapeamento de uploads XBZ
-- Apenas authenticated (dados de operação interna)
CREATE POLICY xbz_upload_mapping_auth_read
  ON public.xbz_upload_mapping
  FOR SELECT TO authenticated
  USING (true);

-- 4. produtos_site_padronizacao: tabela de padronização
-- Apenas authenticated (dados do pipeline interno)
CREATE POLICY produtos_site_padronizacao_auth_read
  ON public.produtos_site_padronizacao
  FOR SELECT TO authenticated
  USING (true);

-- Reload pgrst para reconhecer as novas policies
NOTIFY pgrst, 'reload schema';
;
