
-- ══════════════════════════════════════════════════════════════════════
-- MIGRATION 01: fn_purge_spr_history → nova arquitetura
-- Adapta Job 2 para usar DROP TABLE em archive.* (vs DELETE row-a-row)
-- Razão: legacy em archive não recebe novos dados (snapshot fixo de 5.1GB)
-- DROP é instantâneo e zero-bloat; DELETE em 3.18M rows geraria WAL massivo
-- Drop ocorrerá em ~2026-09-08 quando max(captured_at) ultrapassar 90 dias
-- Guard: p_keep_days >= 30 previne DROP acidental com janela mínima
-- ══════════════════════════════════════════════════════════════════════

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
    END IF;
  END LOOP;

  RETURN v_deleted;
END
$function$;

COMMENT ON FUNCTION public.fn_purge_spr_history(integer) IS
'Housekeeping do histórico Bronze.
Job1: DROP de partições de supplier_products_raw_history com data_fim < cutoff.
Job2: DROP de archive.supplier_products_raw_history_legacy quando max(captured_at) < cutoff
      (snapshot fixo — não recebe novos dados desde 2026-06-15). Retorna -1 se executou DROP.
Job3: CREATE de partições futuras (próximos 4 meses).
Guard: p_keep_days é flooreado em 30 para prevenir DROP acidental.
Cron: purge-spr-history-daily 03:30 daily com p_keep_days=90.';
;
