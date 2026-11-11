-- Rollback: supabase/rollbacks/20261111191000_rollback.sql
-- Restaura o EXECUTE de anon em public.get_sitemap_public(integer, integer).
-- Declarado em 20260909201000_public_sitemap_rpc.sql (GRANT ... TO anon, authenticated,
-- service_role) e permitido na allowlist de endpoints públicos (20260909210000), mas
-- ausente em produção em 2026-11-11 (só authenticated): /api/sitemap chama com a chave
-- pública (anon) e devolvia 503 "degraded"; o sitemap servido era o XML estático legado.
-- Função SECURITY DEFINER somente leitura sobre public.vw_sitemap_all (produtos/categorias
-- ativos e públicos; limit 1..1000, offset 0..15000). Aproveita para fixar o search_path (E066).
ALTER FUNCTION public.get_sitemap_public(integer, integer) SET search_path = public, pg_catalog, pg_temp;
GRANT EXECUTE ON FUNCTION public.get_sitemap_public(integer, integer) TO anon;
