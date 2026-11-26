-- Rollback da migration 20261126230000_doc_mv_product_compositions_refresh_concurrently.sql
-- approved-by: adm01-debug

BEGIN;

COMMENT ON VIEW public.mv_product_compositions IS
  'VIEW publica sobre a matview analytics.mv_product_compositions (refresh pelo cron 47, horario). public.mv_* e VIEW, nao matview - nao rode REFRESH aqui. SECURITY DEFINER desde 20261122200000 porque a matview-base nao concede SELECT a anon nem suporta RLS. NAO religar security_invoker=true.';

COMMIT;