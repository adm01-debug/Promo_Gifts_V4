-- Rollback de 20261111191000: retira o EXECUTE de anon (volta ao estado observado em 2026-11-11).
REVOKE EXECUTE ON FUNCTION public.get_sitemap_public(integer, integer) FROM anon;
