-- ============================================================================
-- MELHORIA 4: Guard de schema-drift INTRA-PROJETO (self-contained, sem HTTP)
-- Fecha o gap real: bot Lovable rodando ALTER TABLE no projeto OFICIAL
-- (ex.: products drift 152->158). Complementa (nao substitui) o checker
-- cross-project fn_run_schema_drift_check (que compara contra sombra Lovable
-- via HTTP e esta cronicamente em timeout).
-- fix_version: schema_drift_local_guard_v1 (2026-06-26)
-- ANTI-REGRESSAO: se o bot Lovable regenerar estas funcoes, RESTAURAR
--   SECURITY DEFINER + SET search_path=public + os REVOKE/GRANT abaixo.
-- ============================================================================

-- 1) Baseline aprovada (granularidade de COLUNA) ----------------------------
CREATE TABLE IF NOT EXISTS public.schema_signature_baseline (
  table_name     text NOT NULL,
  column_name    text NOT NULL,
  data_type      text NOT NULL,
  baseline_label text NOT NULL DEFAULT 'init',
  captured_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (table_name, column_name)
);
COMMENT ON TABLE public.schema_signature_baseline IS
  'MELHORIA4 schema_drift_local_guard_v1: snapshot APROVADO de colunas do schema public. Recapturar via fn_capture_schema_baseline() apos mudancas intencionais. NAO DROPAR.';

-- 2) Allowlist coluna-aware (column_name NULL = tabela inteira ignorada) -----
CREATE TABLE IF NOT EXISTS public.schema_signature_drift_allowlist (
  table_name  text NOT NULL,
  column_name text,                      -- NULL => ignora a tabela toda
  reason      text NOT NULL,
  added_by    text NOT NULL DEFAULT 'manual',
  added_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schema_sig_allowlist
  ON public.schema_signature_drift_allowlist (table_name, COALESCE(column_name, '*'));
COMMENT ON TABLE public.schema_signature_drift_allowlist IS
  'MELHORIA4 schema_drift_local_guard_v1: mudancas de schema intencionais a ignorar no drift local. column_name NULL = tabela inteira.';

-- 3) Log de execucoes -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schema_signature_drift_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at          timestamptz NOT NULL DEFAULT now(),
  has_drift       boolean NOT NULL DEFAULT false,
  n_added         int NOT NULL DEFAULT 0,
  n_removed       int NOT NULL DEFAULT 0,
  n_retyped       int NOT NULL DEFAULT 0,
  columns_added   jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns_removed jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns_retyped jsonb NOT NULL DEFAULT '{}'::jsonb,
  tables_added    text[] NOT NULL DEFAULT '{}',
  tables_removed  text[] NOT NULL DEFAULT '{}',
  baseline_label  text
);
CREATE INDEX IF NOT EXISTS idx_schema_sig_drift_log_ran_at
  ON public.schema_signature_drift_log (ran_at DESC);
COMMENT ON TABLE public.schema_signature_drift_log IS
  'MELHORIA4 schema_drift_local_guard_v1: historico de checagens de drift intra-projeto.';

-- 4) Captura/recaptura da baseline ------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_capture_schema_baseline(p_label text DEFAULT 'manual')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  -- fix_version: schema_drift_local_guard_v1
  DELETE FROM public.schema_signature_baseline;
  INSERT INTO public.schema_signature_baseline (table_name, column_name, data_type, baseline_label, captured_at)
  SELECT table_name, column_name, data_type, p_label, now()
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE '_backup_%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 5) Checagem de drift (zero HTTP, imune a timeout) -------------------------
CREATE OR REPLACE FUNCTION public.fn_check_schema_signature_drift()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_added    jsonb := '{}'::jsonb;
  v_removed  jsonb := '{}'::jsonb;
  v_retyped  jsonb := '{}'::jsonb;
  v_tadded   text[];
  v_tremoved text[];
  v_n_add int; v_n_rem int; v_n_ret int;
  v_has_drift boolean;
  v_label text;
  v_log_id uuid;
BEGIN
  -- fix_version: schema_drift_local_guard_v1
  SELECT baseline_label INTO v_label FROM public.schema_signature_baseline LIMIT 1;

  CREATE TEMP TABLE _live ON COMMIT DROP AS
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name NOT LIKE 'pg_%' AND table_name NOT LIKE '_backup_%';

  CREATE TEMP TABLE _diff ON COMMIT DROP AS
    SELECT
      COALESCE(b.table_name, l.table_name) AS table_name,
      COALESCE(b.column_name, l.column_name) AS column_name,
      b.data_type AS base_type, l.data_type AS live_type,
      CASE
        WHEN b.column_name IS NULL THEN 'added'
        WHEN l.column_name IS NULL THEN 'removed'
        WHEN b.data_type IS DISTINCT FROM l.data_type THEN 'retyped'
        ELSE 'same'
      END AS verdict
    FROM public.schema_signature_baseline b
    FULL OUTER JOIN _live l
      ON b.table_name=l.table_name AND b.column_name=l.column_name;

  -- aplica allowlist: remove linhas cobertas por (tabela,*) ou (tabela,coluna)
  DELETE FROM _diff d
  USING public.schema_signature_drift_allowlist a
  WHERE d.table_name = a.table_name
    AND (a.column_name IS NULL OR a.column_name = d.column_name);

  -- tabelas inteiramente novas / removidas (set difference de table_name)
  SELECT array_agg(t ORDER BY t) INTO v_tadded FROM (
    SELECT DISTINCT table_name t FROM _live
    EXCEPT SELECT DISTINCT table_name FROM public.schema_signature_baseline
  ) x WHERE t NOT IN (SELECT table_name FROM public.schema_signature_drift_allowlist WHERE column_name IS NULL);

  SELECT array_agg(t ORDER BY t) INTO v_tremoved FROM (
    SELECT DISTINCT table_name t FROM public.schema_signature_baseline
    EXCEPT SELECT DISTINCT table_name FROM _live
  ) x WHERE t NOT IN (SELECT table_name FROM public.schema_signature_drift_allowlist WHERE column_name IS NULL);

  v_tadded   := COALESCE(v_tadded, '{}');
  v_tremoved := COALESCE(v_tremoved, '{}');

  -- agrega por tabela {table: [col, ...]}
  SELECT COALESCE(jsonb_object_agg(table_name, cols), '{}'::jsonb) INTO v_added
  FROM (SELECT table_name, jsonb_agg(column_name ORDER BY column_name) cols
        FROM _diff WHERE verdict='added' GROUP BY table_name) s;

  SELECT COALESCE(jsonb_object_agg(table_name, cols), '{}'::jsonb) INTO v_removed
  FROM (SELECT table_name, jsonb_agg(column_name ORDER BY column_name) cols
        FROM _diff WHERE verdict='removed' GROUP BY table_name) s;

  SELECT COALESCE(jsonb_object_agg(table_name, cols), '{}'::jsonb) INTO v_retyped
  FROM (SELECT table_name, jsonb_agg(jsonb_build_object('column',column_name,'from',base_type,'to',live_type) ORDER BY column_name) cols
        FROM _diff WHERE verdict='retyped' GROUP BY table_name) s;

  SELECT count(*) FILTER (WHERE verdict='added'),
         count(*) FILTER (WHERE verdict='removed'),
         count(*) FILTER (WHERE verdict='retyped')
    INTO v_n_add, v_n_rem, v_n_ret
  FROM _diff;

  v_has_drift := (v_n_add + v_n_rem + v_n_ret) > 0
                 OR array_length(v_tadded,1) > 0
                 OR array_length(v_tremoved,1) > 0;

  INSERT INTO public.schema_signature_drift_log
    (has_drift, n_added, n_removed, n_retyped, columns_added, columns_removed, columns_retyped, tables_added, tables_removed, baseline_label)
  VALUES
    (v_has_drift, v_n_add, v_n_rem, v_n_ret, v_added, v_removed, v_retyped, v_tadded, v_tremoved, v_label)
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'ok', true, 'has_drift', v_has_drift, 'log_id', v_log_id,
    'baseline_label', v_label,
    'n_added', v_n_add, 'n_removed', v_n_rem, 'n_retyped', v_n_ret,
    'columns_added', v_added, 'columns_removed', v_removed, 'columns_retyped', v_retyped,
    'tables_added', to_jsonb(v_tadded), 'tables_removed', to_jsonb(v_tremoved)
  );
END;
$function$;

-- 6) Seguranca: revoke PUBLIC/anon, grant explicito --------------------------
REVOKE ALL ON FUNCTION public.fn_capture_schema_baseline(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_check_schema_signature_drift() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_capture_schema_baseline(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_check_schema_signature_drift() TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';;
