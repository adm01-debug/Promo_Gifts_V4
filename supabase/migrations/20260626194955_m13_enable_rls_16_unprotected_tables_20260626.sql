-- ============================================================================
-- M13: habilita RLS nas 16 tabelas public que estavam SEM RLS (smoke test
-- rls_coverage). Todas tinham anon/authenticated com SELECT *E* write e 0 policies
-- => buraco: qualquer um com a anon key podia ler/alterar via PostgREST.
--
-- SEGURANCA/RISCO: provado seguro (zero risco funcional):
--  (1) grep no frontend: NENHUMA das 16 e consultada diretamente (0 arquivos);
--  (2) NENHUMA funcao SECURITY INVOKER chamavel por anon/auth referencia essas tabelas;
--  (3) acesso real e via crons / funcoes SECURITY DEFINER / service_role, que BYPASSAM RLS;
--  (4) dry-run: como anon, apos ENABLE RLS, count = 0 (era 6965) -> deny por default.
-- Sem policy = deny-all para anon/authenticated (correto: nao devem acessar).
-- fix_version = rls_coverage_close_v1
-- ============================================================================
ALTER TABLE public._bkp_kcvs_pre_normalize_20260624        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._bkp_kit_color_from_name_20260624       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._bkp_kit_packing_type_20260624          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._bkp_kit_pkg_material_20260624          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._qa_pct_results                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_produto_ramo_atividade_20260625  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_backfill_log_20260625               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eco_date_reconcile_log_20260626         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_component_ficha_staging             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_component_variant_skus              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_ficha_session_log                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_reconcile_log_20260626         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_technique_mappings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_signature_baseline               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_signature_drift_allowlist        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_signature_drift_log              ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
;
