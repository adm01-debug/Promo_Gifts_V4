-- M10b: move o marcador fix_version para DENTRO do corpo de fn_purge_old_stock_snapshots
-- (estava so no cabecalho da migration M10, invisivel a pg_get_functiondef). Logica inalterada:
-- mesmo piso de 31d, advisory lock, delete bounded, retorno jsonb (tudo ja validado).
-- Assim o marcador some se o bot Lovable reescrever o corpo -> deteccao de regressao.
CREATE OR REPLACE FUNCTION public.fn_purge_old_stock_snapshots(p_retention_days integer DEFAULT 60, p_batch integer DEFAULT 500000)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cutoff timestamptz := now() - make_interval(days => GREATEST(p_retention_days, 31));
  v_deleted integer := 0;
BEGIN
  -- fix_version: purge_stock_snapshots_bounded_daily_v1
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
$function$;;
