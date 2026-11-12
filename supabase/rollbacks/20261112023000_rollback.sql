-- Rollback de 20261112023000_regrant_get_sitemap_public_anon.sql
-- Volta ao estado anterior (sitemap dinâmico indisponível para anon → /api/sitemap 503).
REVOKE EXECUTE ON FUNCTION public.get_sitemap_public(INTEGER, INTEGER) FROM anon, authenticated;
