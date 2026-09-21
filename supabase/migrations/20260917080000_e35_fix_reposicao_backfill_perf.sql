-- E35 — Corrige a causa raiz dominante da lentidão de fn_reposicao_backfill_today
-- (17,79 s/chamada em média, 436 execuções, cron.job_run_details) e reduz a
-- frequência do job de 1h para 4h como mitigação complementar.
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E35)
-- Ver docs/E35_REPOSICAO_BACKFILL_LENTO_2026-09-17.md para a investigação completa.
--
-- Causa raiz #1 (esta migration corrige): a CTE principal de
-- fn_aggregate_stock_daily (chamada por fn_reposicao_backfill_today) filtra
-- stock_snapshots com `(captured_at AT TIME ZONE 'America/Sao_Paulo')::date =
-- p_date` — predicado não-sargável que força Postgres a varrer o índice
-- inteiro (274.462 linhas, todo o histórico) a cada chamada, descartando por
-- Filter tudo que não é do dia. Medido com EXPLAIN (ANALYZE, BUFFERS) real
-- contra 2026-09-15: 7.513 ms com o predicado atual vs. 16 ms com o range
-- sargável abaixo — resultado idêntico (4.041 linhas nos dois casos,
-- equivalência provada por count(*) antes desta migration ser escrita).
-- América/Sao_Paulo não observa horário de verão desde 2019, então o range
-- de fronteira de dia é livre de ambiguidade.
--
-- Nenhuma mudança de lógica de agregação (window functions, upsert,
-- ON CONFLICT) — só a cláusula WHERE da CTE muda.
--
-- Causa raiz #2 (não corrigida em lógica nesta migration — ver documento):
-- o anti-join de baseline (19.698 fontes ativas) roda inteiro a cada
-- chamada horária, custando ~2,65 s mesmo quando não há nada a inserir.
-- Mitigada aqui só por redução de frequência (24 chamadas/dia → 6/dia),
-- que reduz o custo total diário sem reescrever a lógica de uma função com
-- histórico de bugs sutis de correção (comentário "FIX GAP-3" no corpo).
--
-- [REQUER-PO] — não aplicado nesta revisão. Caminho de aplicação: E15
-- (.github/workflows/db-apply-migration.yml), nunca supabase db push.
--
-- Rollback: cron.alter_job(117, schedule := '5 * * * *') + CREATE OR REPLACE
-- FUNCTION public.fn_aggregate_stock_daily com o WHERE original (versão
-- v5_sp_tz_minmax_fix) — comando completo na seção "Reversão" ao final deste
-- arquivo.

DO $precondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobid = 117 AND jobname = 'reposicao-backfill-hourly'
      AND schedule = '5 * * * *' AND active
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: cron.job jobid=117 (reposicao-backfill-hourly) não está no estado esperado (schedule=5 * * * *, active=true) — investigar antes de prosseguir';
  END IF;

  IF to_regprocedure('public.fn_aggregate_stock_daily(date)') IS NULL THEN
    RAISE EXCEPTION 'Precondição falhou: public.fn_aggregate_stock_daily(date) não existe — premissa da correção mudou, investigar antes de prosseguir';
  END IF;

  -- Reconfirma a equivalência de resultado entre o predicado atual e o
  -- range sargável para um dia histórico real, imediatamente antes de trocar
  -- a função — se algo no dado mudou desde a investigação (docs/E35_...),
  -- aborta em vez de aplicar uma reescrita que deixaria de ser equivalente.
  IF (
    SELECT count(*) FROM public.stock_snapshots
    WHERE (captured_at AT TIME ZONE 'America/Sao_Paulo')::date = '2026-09-15'::date
  ) <> (
    SELECT count(*) FROM public.stock_snapshots
    WHERE captured_at >= ('2026-09-15'::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND captured_at <  ('2026-09-16'::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
  ) THEN
    RAISE EXCEPTION 'Precondição falhou: predicado atual e range sargável não são mais equivalentes para 2026-09-15 — investigar antes de prosseguir (possível mudança de fuso ou dado retroativo)';
  END IF;
END;
$precondition$;

CREATE OR REPLACE FUNCTION public.fn_aggregate_stock_daily(p_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_upserted integer;
  v_purged   integer;
  v_baseline integer;
  v_today    date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;  -- "hoje" BR
BEGIN
  p_date := COALESCE(p_date, v_today);

  IF p_date > v_today THEN
    RAISE EXCEPTION 'fn_aggregate_stock_daily: data futura bloqueada (p_date=%, hoje_BR=%)',
                    p_date, v_today;
  END IF;

  DELETE FROM stock_daily_summary WHERE summary_date > v_today;
  GET DIAGNOSTICS v_purged = ROW_COUNT;
  IF v_purged > 0 THEN
    RAISE WARNING 'fn_aggregate_stock_daily: limpadas % entradas de datas futuras', v_purged;
  END IF;

  WITH open_close AS (
    SELECT DISTINCT ON (variant_supplier_source_id)
      variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,
      FIRST_VALUE(stock_total_old) OVER w AS stock_open,
      stock_total_new AS stock_close,
      -- FIX GAP-3: LEAST(old,new) garante min correto mesmo quando estoque cai
      -- A fórmula anterior MIN(COALESCE(old,new)) pegava só old e falhava quando old>new com sync_count=1
      MIN(LEAST(COALESCE(stock_total_old, stock_total_new),
                COALESCE(stock_total_new, stock_total_old))) OVER w AS stock_min,
      MAX(GREATEST(COALESCE(stock_total_old, stock_total_new),
                   COALESCE(stock_total_new, stock_total_old))) OVER w AS stock_max,
      SUM(COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0)) OVER w AS net_change,
      SUM(GREATEST(0, -(COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0)))) OVER w AS units_depleted,
      SUM(GREATEST(0,   COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0)))  OVER w AS units_restocked,
      BOOL_OR(COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0) > 0) OVER w AS restock_detected,
      SUM(CASE WHEN COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0) > 0 THEN 1 ELSE 0 END) OVER w AS restock_count,
      MAX(CASE WHEN COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0) > 0
               THEN COALESCE(stock_main_delta,0) + COALESCE(stock_other_delta,0) ELSE 0 END) OVER w AS restock_quantity,
      BOOL_OR(COALESCE(cost_price_delta,0) <> 0) OVER w AS price_changed,
      FIRST_VALUE(cost_price_old) OVER w AS cost_price_open,
      cost_price_new AS cost_price_close,
      COUNT(*) OVER w AS sync_count
    FROM stock_snapshots
    -- E35 (2026-09-17): predicado reescrito como range sargável — equivalente
    -- ao antigo `(captured_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date`
    -- (América/Sao_Paulo sem DST desde 2019), mas permite Index Scan real em
    -- vez de Filter sobre o índice inteiro. Ver docs/E35_... para a prova de
    -- equivalência e o EXPLAIN ANALYZE antes/depois.
    WHERE captured_at >= (p_date::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND captured_at <  ((p_date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND variant_supplier_source_id IS NOT NULL
      AND variant_supplier_source_id::text NOT LIKE '%-99999-%'
    WINDOW w AS (PARTITION BY variant_supplier_source_id ORDER BY captured_at
                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
    ORDER BY variant_supplier_source_id, captured_at DESC
  )
  INSERT INTO stock_daily_summary (
    variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,
    summary_date, stock_open, stock_close, stock_min, stock_max, net_change,
    units_depleted, units_restocked, restock_detected, restock_quantity, restock_count,
    restock_zero_to_positive,
    cost_price_open, cost_price_close, price_changed, sync_count
  )
  SELECT
    variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,
    p_date, stock_open, stock_close, stock_min, stock_max, net_change,
    units_depleted::int, units_restocked::int,
    restock_detected, restock_quantity::int, restock_count::smallint,
    (COALESCE(stock_open,0) = 0 AND COALESCE(stock_close,0) > 0),
    cost_price_open, cost_price_close, price_changed, sync_count::smallint
  FROM open_close
  ON CONFLICT (variant_supplier_source_id, summary_date) DO UPDATE SET
    stock_close               = EXCLUDED.stock_close,
    stock_min                 = LEAST(stock_daily_summary.stock_min, EXCLUDED.stock_min),
    stock_max                 = GREATEST(stock_daily_summary.stock_max, EXCLUDED.stock_max),
    net_change                = EXCLUDED.net_change,
    units_depleted            = EXCLUDED.units_depleted,
    units_restocked           = EXCLUDED.units_restocked,
    restock_detected          = EXCLUDED.restock_detected,
    restock_quantity          = EXCLUDED.restock_quantity,
    restock_count             = EXCLUDED.restock_count,
    restock_zero_to_positive  = (COALESCE(stock_daily_summary.stock_open,0) = 0
                                  AND COALESCE(EXCLUDED.stock_close,0) > 0),
    cost_price_close          = EXCLUDED.cost_price_close,
    price_changed             = EXCLUDED.price_changed,
    sync_count                = EXCLUDED.sync_count;
  GET DIAGNOSTICS v_upserted = ROW_COUNT;

  WITH missing AS (
    SELECT vss.id, vss.supplier_id, vss.supplier_branch_id, vss.variant_id,
           pv.product_id, vss.quantity AS cur_stock, vss.cost_price
    FROM variant_supplier_sources vss
    JOIN product_variants pv ON pv.id = vss.variant_id AND pv.is_active = true
    WHERE vss.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM stock_daily_summary sd
        WHERE sd.variant_supplier_source_id = vss.id AND sd.summary_date = p_date
      )
  )
  INSERT INTO stock_daily_summary (
    variant_supplier_source_id, supplier_id, supplier_branch_id, variant_id, product_id,
    summary_date, stock_open, stock_close, stock_min, stock_max, net_change,
    units_depleted, units_restocked, restock_detected, restock_quantity, restock_count,
    restock_zero_to_positive,
    cost_price_open, cost_price_close, price_changed, sync_count
  )
  SELECT id, supplier_id, supplier_branch_id, variant_id, product_id,
    p_date, cur_stock, cur_stock, cur_stock, cur_stock,
    0, 0, 0, false, 0, 0,
    false,
    cost_price, cost_price, false, 1
  FROM missing
  ON CONFLICT (variant_supplier_source_id, summary_date) DO NOTHING;
  GET DIAGNOSTICS v_baseline = ROW_COUNT;

  RETURN jsonb_build_object(
    'date', p_date, 'executed_at', NOW(),
    'version', 'v6_sargable_range_e35',
    'sentinel_guard', 'xbz_99999_excluded_from_deltas',
    'snapshots_purged', v_purged,
    'baseline_inserted', v_baseline,
    'summaries_upserted', v_upserted
  );
END;
$function$;

SELECT cron.alter_job(117, schedule := '5 */4 * * *');

DO $postcondition$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobid = 117 AND schedule = '5 */4 * * *' AND active
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: cron.job jobid=117 não está com o novo schedule (5 */4 * * *)';
  END IF;

  IF (
    SELECT count(*) FROM public.stock_snapshots
    WHERE (captured_at AT TIME ZONE 'America/Sao_Paulo')::date = '2026-09-15'::date
  ) <> (
    SELECT count(*) FROM public.stock_snapshots
    WHERE captured_at >= ('2026-09-15'::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND captured_at <  ('2026-09-16'::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
  ) THEN
    RAISE EXCEPTION 'Pós-condição falhou: predicado antigo e range sargável divergem para 2026-09-15 após a troca — a função nova pode estar processando um conjunto de linhas diferente do original';
  END IF;
END;
$postcondition$;

-- Reversão:
-- SELECT cron.alter_job(117, schedule := '5 * * * *');
--
-- CREATE OR REPLACE FUNCTION public.fn_aggregate_stock_daily(p_date date DEFAULT NULL::date)
-- ... (mesmo corpo desta migration, mas com o WHERE original:)
--   WHERE (captured_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date
--     AND variant_supplier_source_id IS NOT NULL
--     AND variant_supplier_source_id::text NOT LIKE '%-99999-%'
-- (versão 'v5_sp_tz_minmax_fix', arquivada em docs/E35_REPOSICAO_BACKFILL_LENTO_2026-09-17.md
-- e recuperável via `pg_get_functiondef` antes desta migration, se necessário
-- reconstituir o texto exato.)
