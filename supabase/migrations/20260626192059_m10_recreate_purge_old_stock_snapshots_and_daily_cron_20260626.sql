-- ============================================================================
-- M10: recria fn_purge_old_stock_snapshots (REMOVIDA -> cron 272 chamava funcao
-- inexistente; halt silencioso classe M6) e converte o job para cadencia DIARIA.
--
-- CONTEXTO (medido 2026-06-26): stock_snapshots = 3,87M linhas / 1,3GB, change-log
-- de estoque com ~184k linhas/dia, dados desde 2026-06-05 (21d). Nada >60d hoje
-- => primeira execucao apaga 0 (zero-risco), mas sem purga cresce ilimitado.
-- Leitor vinculante: fn_capacity_forecast usa lookback de 30 dias => retencao 60d
-- (buffer 2x). stock_daily_summary (336k lin) preserva o historico AGREGADO.
--
-- DESIGN: DELETE bounded por subquery LIMIT (usa idx_snapshots_captured_at,
-- Index Scan Backward) -> cabe no timeout; advisory_xact_lock evita concorrencia;
-- cadencia DIARIA pois o inflow diario (~184k) << batch (500k) mantem o ritmo
-- (purga semanal nao acompanharia 1,3M/semana dentro do timeout).
-- SEGURANCA: SECURITY DEFINER + SET search_path=public; EXECUTE revogado de
-- public/anon/authenticated (nao expor como RPC PostgREST).
-- ANTI-REGRESSAO: nao remover novamente; cron 272 deve chamar esta funcao.
-- fix_version = purge_stock_snapshots_bounded_daily_v1
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_purge_old_stock_snapshots(
  p_retention_days integer DEFAULT 60,
  p_batch          integer DEFAULT 500000
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff timestamptz := now() - make_interval(days => GREATEST(p_retention_days, 31));
  v_deleted integer := 0;
BEGIN
  -- lock transacional: se outra execucao roda, sai sem erro
  IF NOT pg_try_advisory_xact_lock(91010060) THEN
    RETURN jsonb_build_object('status','skipped_locked','ts',now());
  END IF;

  -- piso de seguranca: nunca apaga abaixo de 31 dias (protege o lookback de 30d do forecast)
  DELETE FROM public.stock_snapshots
   WHERE id IN (
     SELECT id FROM public.stock_snapshots
      WHERE captured_at < v_cutoff
      ORDER BY captured_at
      LIMIT GREATEST(p_batch, 1)
   );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'status','ok',
    'cutoff', v_cutoff,
    'retention_days_efetivo', GREATEST(p_retention_days, 31),
    'batch', GREATEST(p_batch, 1),
    'deletados', v_deleted,
    'ts', now()
  );
END
$function$;

REVOKE ALL ON FUNCTION public.fn_purge_old_stock_snapshots(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_purge_old_stock_snapshots(integer, integer) TO service_role;

-- Reescalona o cron 272: semanal -> DIARIO 03:11, timeout 180s, args explicitos.
SELECT cron.alter_job(
  job_id   := 272,
  schedule := '11 3 * * *',
  command  := $cmd$SELECT public.fn_cron_safe_run(5::bigint, 'SELECT public.fn_purge_old_stock_snapshots(60, 500000);', 180000, 'stock-snapshots-purge');$cmd$
);
;
