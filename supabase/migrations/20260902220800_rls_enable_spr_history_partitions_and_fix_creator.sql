-- Advisor ERROR rls_disabled_in_public: partições criadas por fn_purge_spr_history
-- (JOB 3) nasciam sem RLS, diferente das irmãs p2026_06..p2026_10.
-- Aplicada em produção via MCP em 2026-09-02 (registro remoto homônimo).
-- IF EXISTS: num replay limpo essas partições podem ainda não existir
-- (são criadas pelo JOB 3 abaixo / cron); em produção existiam.
ALTER TABLE IF EXISTS public.supplier_products_raw_history_p2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_products_raw_history_p2026_12 ENABLE ROW LEVEL SECURITY;

-- Causa raiz: JOB 3 agora habilita RLS em toda partição futura que criar.
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
      -- RLS: partição nova nasce protegida como as demais (fix 2026-09-02, advisor ERROR)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_nome);
    END IF;
  END LOOP;

  RETURN v_deleted;
END
$function$;
