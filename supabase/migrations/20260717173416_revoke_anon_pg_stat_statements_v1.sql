-- ============================================================================
-- fix_version: 20260717_revoke_anon_pg_stat_statements_v1
-- MELHORIA 4/6: Revogar acesso do anon a pg_stat_statements (extensions schema).
-- pg_stat_statements expunha ao anon: 4.980 queries SQL, incluindo 104 com
-- referência a 'cost_price' e 10 com 'api_credential' — information disclosure
-- sobre estrutura interna e dados sensíveis. Grant vinha via PUBLIC role.
-- SOLUÇÃO: REVOKE de PUBLIC. postgres/service_role mantêm acesso (superuser).
-- authenticated também perde acesso — aceitável (app não usa pg_stat_statements).
-- ============================================================================
REVOKE SELECT ON extensions.pg_stat_statements      FROM PUBLIC;
REVOKE SELECT ON extensions.pg_stat_statements_info FROM PUBLIC;;
