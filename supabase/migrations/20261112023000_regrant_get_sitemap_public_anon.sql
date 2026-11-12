-- Rollback: supabase/rollbacks/20261112023000_rollback.sql
-- Fix: /api/sitemap responde 503 "degraded" em produção.
-- Causa (medida em 2026-11-12 com a chave pública, a mesma usada pelo api/sitemap.ts):
--   POST /rest/v1/rpc/get_sitemap_public → HTTP 401
--   {"code":"42501","message":"permission denied for function get_sitemap_public"}
-- O GRANT original (20260909201000_public_sitemap_rpc.sql:52) foi removido fora do repositório
-- (nenhuma migration revoga esta função). A função é endpoint público intencional
-- (allowlist public_intent em 20260909210000 / 20261024163500): devolve só os 8 campos do sitemap,
-- com limite 1..1000 e offset 0..15000; as views de origem seguem privadas.
-- Idempotente: GRANT repetido não altera nada.

GRANT EXECUTE ON FUNCTION public.get_sitemap_public(INTEGER, INTEGER) TO anon, authenticated;
