
-- ============================================================
-- SEGURANÇA: Ativar RLS em tabelas de infra sem políticas
-- 2026-06-18 (audit-10-10)
-- 
-- Tabelas identificadas como acessíveis por anon/authenticated
-- sem qualquer política RLS — risco de exposição de dados internos
-- de pipeline via PostgREST.
--
-- Nenhuma dessas tabelas é usada diretamente pelo frontend.
-- service_role bypassa RLS por padrão em Supabase.
--
-- Política: deny-all para anon + authenticated; service_role livre.
-- ============================================================

-- asia_image_import_queue
ALTER TABLE public.asia_image_import_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.asia_image_import_queue
  FOR ALL TO anon, authenticated USING (false);

-- asia_upload_mapping
ALTER TABLE public.asia_upload_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.asia_upload_mapping
  FOR ALL TO anon, authenticated USING (false);

-- ingestion_run_log
ALTER TABLE public.ingestion_run_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.ingestion_run_log
  FOR ALL TO anon, authenticated USING (false);

-- pipeline_control
ALTER TABLE public.pipeline_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.pipeline_control
  FOR ALL TO anon, authenticated USING (false);

-- pipeline_known_issues
ALTER TABLE public.pipeline_known_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.pipeline_known_issues
  FOR ALL TO anon, authenticated USING (false);

-- pipeline_run_log
ALTER TABLE public.pipeline_run_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.pipeline_run_log
  FOR ALL TO anon, authenticated USING (false);

-- spot_cf_upload_queue
ALTER TABLE public.spot_cf_upload_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.spot_cf_upload_queue
  FOR ALL TO anon, authenticated USING (false);

-- spot_eu_image_diff_queue
ALTER TABLE public.spot_eu_image_diff_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.spot_eu_image_diff_queue
  FOR ALL TO anon, authenticated USING (false);

-- supplier_customization_options_raw (dados brutos de fornecedor)
ALTER TABLE public.supplier_customization_options_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rls_infra_deny_public" ON public.supplier_customization_options_raw
  FOR ALL TO anon, authenticated USING (false);
;
