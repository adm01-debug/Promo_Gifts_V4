-- M15: fecha buraco de seguranca reaberto pelo bot Lovable durante a sessao.
-- _archive_supplier_price_tiers_20260626 (arquivo de supplier_price_tiers, 31157 linhas de
-- dados de custo) nasceu com anon read+write e SEM RLS. Mesma classe do M13.
-- Zero risco: 0 refs em funcoes/views/frontend; service_role/definer/crons bypassam RLS.
-- fix_version: rls_coverage_close_v1
ALTER TABLE public._archive_supplier_price_tiers_20260626 ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';;
