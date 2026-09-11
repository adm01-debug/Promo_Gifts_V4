-- M14: torna fn_check_schema_signature_drift idempotente DENTRO de uma transacao.
-- BUG: cria TEMP TABLE _live e _diff com ON COMMIT DROP; como ON COMMIT DROP so limpa no
-- COMMIT, chamar a funcao 2x na MESMA transacao colidia com 42P07 "_live already exists".
-- Em producao o cron 245 chama 1x/dia (nao disparava), mas era fragil. Correcao: DROP IF
-- EXISTS das 2 temp tables no inicio. Logica de comparacao/allowlist/log inalterada.
-- fix_version: schema_drift_local_guard_v4
CREATE OR REPLACE FUNCTION public.fn_check_schema_signature_drift()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_added jsonb := '{}'::jsonb; v_removed jsonb := '{}'::jsonb; v_retyped jsonb := '{}'::jsonb;
  v_tadded text[]; v_tremoved text[];
  v_n_add int; v_n_rem int; v_n_ret int;
  v_has_drift boolean; v_label text; v_log_id uuid;
BEGIN
  -- fix_version: schema_drift_local_guard_v4 (idempotente intra-transacao: DROP IF EXISTS
  --   das TEMP TABLEs _live/_diff; ON COMMIT DROP so limpa no commit, entao 2 chamadas na
  --   mesma transacao colidiam com 42P07 relation "_live" already exists)
  DROP TABLE IF EXISTS _live;
  DROP TABLE IF EXISTS _diff;
  SELECT baseline_label INTO v_label FROM public.schema_signature_baseline LIMIT 1;
  CREATE TEMP TABLE _live ON COMMIT DROP AS
    SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND table_name NOT LIKE 'pg_%' AND table_name NOT LIKE '_backup_%';
  CREATE TEMP TABLE _diff ON COMMIT DROP AS
    SELECT COALESCE(b.table_name,l.table_name) AS table_name, COALESCE(b.column_name,l.column_name) AS column_name,
      b.data_type AS base_type, l.data_type AS live_type,
      CASE WHEN b.column_name IS NULL THEN 'added' WHEN l.column_name IS NULL THEN 'removed'
           WHEN b.data_type IS DISTINCT FROM l.data_type THEN 'retyped' ELSE 'same' END AS verdict
    FROM public.schema_signature_baseline b
    FULL OUTER JOIN _live l ON b.table_name=l.table_name AND b.column_name=l.column_name;
  DELETE FROM _diff d USING public.schema_signature_drift_allowlist a
   WHERE d.table_name=a.table_name AND (a.column_name IS NULL OR a.column_name=d.column_name);
  SELECT array_agg(t ORDER BY t) INTO v_tadded FROM (
    SELECT DISTINCT table_name t FROM _live EXCEPT SELECT DISTINCT table_name FROM public.schema_signature_baseline
  ) x WHERE t NOT IN (SELECT table_name FROM public.schema_signature_drift_allowlist WHERE column_name IS NULL);
  SELECT array_agg(t ORDER BY t) INTO v_tremoved FROM (
    SELECT DISTINCT table_name t FROM public.schema_signature_baseline EXCEPT SELECT DISTINCT table_name FROM _live
  ) x WHERE t NOT IN (SELECT table_name FROM public.schema_signature_drift_allowlist WHERE column_name IS NULL);
  v_tadded := COALESCE(v_tadded,'{}'); v_tremoved := COALESCE(v_tremoved,'{}');
  SELECT COALESCE(jsonb_object_agg(table_name,cols),'{}'::jsonb) INTO v_added
   FROM (SELECT table_name, jsonb_agg(column_name ORDER BY column_name) cols FROM _diff WHERE verdict='added' GROUP BY table_name) s;
  SELECT COALESCE(jsonb_object_agg(table_name,cols),'{}'::jsonb) INTO v_removed
   FROM (SELECT table_name, jsonb_agg(column_name ORDER BY column_name) cols FROM _diff WHERE verdict='removed' GROUP BY table_name) s;
  SELECT COALESCE(jsonb_object_agg(table_name,cols),'{}'::jsonb) INTO v_retyped
   FROM (SELECT table_name, jsonb_agg(jsonb_build_object('column',column_name,'from',base_type,'to',live_type) ORDER BY column_name) cols FROM _diff WHERE verdict='retyped' GROUP BY table_name) s;
  SELECT count(*) FILTER (WHERE verdict='added'), count(*) FILTER (WHERE verdict='removed'), count(*) FILTER (WHERE verdict='retyped')
    INTO v_n_add, v_n_rem, v_n_ret FROM _diff;
  v_has_drift := (COALESCE(v_n_add,0)+COALESCE(v_n_rem,0)+COALESCE(v_n_ret,0))>0 OR cardinality(v_tadded)>0 OR cardinality(v_tremoved)>0;
  INSERT INTO public.schema_signature_drift_log
    (has_drift,n_added,n_removed,n_retyped,columns_added,columns_removed,columns_retyped,tables_added,tables_removed,baseline_label)
  VALUES (v_has_drift,v_n_add,v_n_rem,v_n_ret,v_added,v_removed,v_retyped,v_tadded,v_tremoved,v_label)
  RETURNING id INTO v_log_id;
  RETURN jsonb_build_object('ok',true,'has_drift',v_has_drift,'log_id',v_log_id,'baseline_label',v_label,
    'n_added',v_n_add,'n_removed',v_n_rem,'n_retyped',v_n_ret,
    'columns_added',v_added,'columns_removed',v_removed,'columns_retyped',v_retyped,
    'tables_added',to_jsonb(v_tadded),'tables_removed',to_jsonb(v_tremoved));
END;
$function$;;
