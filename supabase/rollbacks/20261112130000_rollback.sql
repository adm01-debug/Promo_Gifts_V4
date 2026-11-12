-- Rollback: 20261112130000_fix_get_sitemap_public_anon_grant.sql
-- Volta ao estado pós-SEC-003 (anon sem EXECUTE): /api/sitemap volta a responder 503.
REVOKE EXECUTE ON FUNCTION public.get_sitemap_public(integer, integer) FROM anon;
