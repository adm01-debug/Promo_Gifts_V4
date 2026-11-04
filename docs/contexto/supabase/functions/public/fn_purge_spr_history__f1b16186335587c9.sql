CREATE OR REPLACE FUNCTION public.fn_purge_spr_history(p_keep_days integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff   timestamptz := now() - make_interval(days => GREATEST(p_keep_days, 30));
  v_deleted  integer := 0;
  v_n        integer;
  r          RECORD;
  v_m        date;
  v_nome     text;
BEGIN
  FOR r IN
    SELECT c.oid::regclass::text AS part,
           (regexp_match(pg_get_expr(c.relpartbound, c.oid),
                         'TO \(''([^'']+)''\)'))[1]::timestamptz AS ub
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'public.supplier_products_raw_history'::regclass
  LOOP
    IF r.ub IS NOT NULL AND r.ub <= v_cutoff THEN
      EXECUTE format('DROP TABLE %s', r.part);
    END IF;
  END LOOP;

  IF to_regclass('archive.supplier_products_raw_history_legacy') IS NOT NULL THEN
    IF (SELECT max(captured_at)
        FROM archive.supplier_products_raw_history_legacy) < v_cutoff THEN
      EXECUTE 'DROP TABLE archive.supplier_products_raw_history_legacy';
      v_deleted := -1;
    END IF;
  END IF;

  FOR i IN 0..3 LOOP
    v_m := (date_trunc('month', now()) + (i || ' months')::interval)::date;
    v_nome := 'supplier_products_raw_history_p' || to_char(v_m, 'YYYY_MM');
    IF to_regclass('public.' || v_nome) IS NULL THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.supplier_products_raw_history'
        ' FOR VALUES FROM (%L) TO (%L)',
        v_nome, v_m, (v_m + interval '1 month')::date);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_nome);
      EXECUTE format('CREATE POLICY hist_all_service ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', v_nome);
      EXECUTE format('CREATE POLICY hist_select_admin ON public.%I FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())))', v_nome);
    END IF;
  END LOOP;

  RETURN v_deleted;
END
$function$
