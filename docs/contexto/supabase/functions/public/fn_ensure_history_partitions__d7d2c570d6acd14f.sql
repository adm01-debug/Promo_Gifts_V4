CREATE OR REPLACE FUNCTION public.fn_ensure_history_partitions(p_months_ahead integer DEFAULT 3)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_created integer := 0;
  v_i integer;
  v_month date;
  v_name text;
BEGIN
  FOR v_i IN 0..p_months_ahead LOOP
    v_month := (date_trunc('month', now()) + make_interval(months => v_i))::date;
    v_name := 'supplier_products_raw_history_p' || to_char(v_month, 'YYYY_MM');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = v_name AND relnamespace = 'public'::regnamespace
    ) THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.supplier_products_raw_history FOR VALUES FROM (%L) TO (%L)',
        v_name, v_month, (v_month + interval '1 month')::date
      );
      -- RLS é por relação e NÃO é herdada: a partição nasce protegida, com as mesmas
      -- duas policies das irmãs (paridade 2026-09-03). Sem isto, cada mês o cron
      -- reabriria o achado `rls_disabled_in_public` do Supabase.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
      EXECUTE format('CREATE POLICY hist_all_service ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', v_name);
      EXECUTE format('CREATE POLICY hist_select_admin ON public.%I FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())))', v_name);
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN v_created;
END;
$function$
