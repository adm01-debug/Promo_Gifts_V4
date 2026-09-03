-- Review cubic no PR #1825: partições p2026_11/12 receberam RLS (20260902220800)
-- mas não as policies das irmãs (hist_all_service/hist_select_admin, criadas
-- em p2026_06..p2026_10) — ficaram default-deny, mais restritivas que o padrão.
-- Paridade aplicada + criador de partições passa a criar as policies também.
-- Aplicada em produção via MCP em 2026-09-03; bateria pós-fix: 38/38 PASS.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['supplier_products_raw_history_p2026_11','supplier_products_raw_history_p2026_12'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='hist_all_service') THEN
        EXECUTE format('CREATE POLICY hist_all_service ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='hist_select_admin') THEN
        EXECUTE format('CREATE POLICY hist_select_admin ON public.%I FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())))', t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- fn_purge_spr_history v3: JOB 3 cria partição + RLS + policies (paridade total)
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
  -- ── JOB 1: DROP partições antigas de supplier_products_raw_history ──
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

  -- ── JOB 2 (nova arquitetura): DROP legacy quando todos os dados expirarem ──
  -- A tabela foi movida para archive em 2026-06-15 e não recebe novos dados.
  -- DROP TABLE é zero-bloat e instantâneo; DELETE em 3.18M rows geraria WAL massivo.
  -- A tabela só é dropada quando MAX(captured_at) < cutoff (todos os dados expiraram).
  IF to_regclass('archive.supplier_products_raw_history_legacy') IS NOT NULL THEN
    IF (SELECT max(captured_at)
        FROM archive.supplier_products_raw_history_legacy) < v_cutoff THEN
      EXECUTE 'DROP TABLE archive.supplier_products_raw_history_legacy';
      v_deleted := -1;  -- sinal de DROP executado (distingue de 0 rows deletados)
    END IF;
  END IF;

  -- ── JOB 3: garantir partições futuras (próximos 4 meses) ──
  FOR i IN 0..3 LOOP
    v_m := (date_trunc('month', now()) + (i || ' months')::interval)::date;
    v_nome := 'supplier_products_raw_history_p' || to_char(v_m, 'YYYY_MM');
    IF to_regclass('public.' || v_nome) IS NULL THEN
      EXECUTE format(
        'CREATE TABLE public.%I PARTITION OF public.supplier_products_raw_history'
        ' FOR VALUES FROM (%L) TO (%L)',
        v_nome, v_m, (v_m + interval '1 month')::date);
      -- Partição nova nasce com RLS + policies idênticas às irmãs (paridade 2026-09-03)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_nome);
      EXECUTE format('CREATE POLICY hist_all_service ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', v_nome);
      EXECUTE format('CREATE POLICY hist_select_admin ON public.%I FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())))', v_nome);
    END IF;
  END LOOP;

  RETURN v_deleted;
END
$function$;

-- Smoke 05 (rls_coverage) passa a cobrir também parents particionados (relkind 'p').
-- Patch de string exata sobre a definição vigente; tolerante se já aplicado.
DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_run_smoke_tests';

  IF position('c.relkind IN (''r'',''p'')' in v_def) > 0 THEN
    RAISE NOTICE 'smoke 05 já cobre relkind r+p — nada a fazer';
    RETURN;
  END IF;

  v_def := replace(v_def,
    'AND c.relkind=''r'' AND NOT c.relrowsecurity',
    'AND c.relkind IN (''r'',''p'') AND NOT c.relrowsecurity');

  IF position('c.relkind IN (''r'',''p'')' in v_def) = 0 THEN
    RAISE NOTICE 'padrão do smoke 05 não encontrado — pulando patch';
    RETURN;
  END IF;

  EXECUTE v_def;
END $$;

-- Estado endurecido explícito (idempotente; protege replays com DROP+CREATE)
REVOKE EXECUTE ON FUNCTION public.fn_run_smoke_tests() FROM PUBLIC, anon, authenticated;
