-- Auditoria r3 (2026-09-05): analytics.mv_product_compositions era a única matview legível por anon
-- (advisor pg_graphql_anon_table_exposed / materialized_view_in_api). Matview não tem RLS.
-- O catálogo anônimo lê composições via public.v_product_compositions_public (SECURITY DEFINER,
-- roda como owner) — o grant direto ao anon é desnecessário. authenticated mantido (external-db).
-- Aplicada em produção via MCP em 2026-09-05.
-- Rollback: GRANT SELECT ON analytics.mv_product_compositions TO anon;
REVOKE SELECT ON analytics.mv_product_compositions FROM anon;
DO $$
BEGIN
  IF has_table_privilege('anon', 'analytics.mv_product_compositions', 'SELECT') THEN
    RAISE EXCEPTION 'anon ainda tem SELECT em analytics.mv_product_compositions';
  END IF;
END $$;
