CREATE OR REPLACE FUNCTION public.fn_vacuum_high_dead_tuples()
 RETURNS TABLE(tabela text, dead_before bigint, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- fix_version=2026-07-11-vacuum-high-dead-tuples-v1 ANTI-REGRESSÃO
DECLARE
  v_dead bigint;
BEGIN
  SELECT n_dead_tup INTO v_dead FROM pg_stat_user_tables WHERE relname='mv_product_images_audit';
  RETURN QUERY SELECT 'mv_product_images_audit'::text, v_dead, 'VACUUM agendado via cron'::text;
  SELECT n_dead_tup INTO v_dead FROM pg_stat_user_tables WHERE relname='mv_stock_rupture_alert';
  RETURN QUERY SELECT 'mv_stock_rupture_alert'::text, v_dead, 'VACUUM agendado via cron'::text;
  SELECT n_dead_tup INTO v_dead FROM pg_stat_user_tables WHERE relname='stock_snapshots';
  RETURN QUERY SELECT 'stock_snapshots'::text, v_dead, 'VACUUM agendado via cron'::text;
END;
$function$
