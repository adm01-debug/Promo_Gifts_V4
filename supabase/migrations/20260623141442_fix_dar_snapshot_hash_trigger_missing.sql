
-- ============================================================
-- FIX BUG-DB-02: Trigger fn_dar_set_snapshot_hash existia mas
-- nunca foi anexado à tabela discount_approval_requests.
-- Resultado: quote_snapshot_hash ficava sempre NULL, fazendo
-- fn_quotes_validate_discount falhar a comparação hash = _current_hash
-- (NULL != anything em SQL), impedindo que vendedores salvem 
-- orçamentos APÓS aprovação admin.
-- ============================================================

-- Verificar se o trigger já existe (idempotência)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND event_object_table = 'discount_approval_requests'
      AND trigger_name = 'trg_dar_set_snapshot_hash'
  ) THEN
    EXECUTE '
      CREATE TRIGGER trg_dar_set_snapshot_hash
        BEFORE INSERT ON public.discount_approval_requests
        FOR EACH ROW
        EXECUTE FUNCTION public.fn_dar_set_snapshot_hash()
    ';
    RAISE NOTICE 'Trigger trg_dar_set_snapshot_hash criado com sucesso.';
  ELSE
    RAISE NOTICE 'Trigger trg_dar_set_snapshot_hash já existe — nenhuma ação.';
  END IF;
END;
$$;

-- Backfill: preencher hash para aprovações existentes sem hash
-- (aprovações pendentes ou aprovadas que estão com hash NULL)
UPDATE public.discount_approval_requests
SET quote_snapshot_hash = public.compute_quote_snapshot_hash(quote_id)
WHERE quote_snapshot_hash IS NULL
  AND quote_id IS NOT NULL;

-- Verificar quantas linhas foram corrigidas
DO $$
DECLARE n int;
BEGIN
  SELECT COUNT(*) INTO n FROM public.discount_approval_requests 
  WHERE quote_snapshot_hash IS NOT NULL;
  RAISE NOTICE 'discount_approval_requests com hash preenchido após backfill: %', n;
END;
$$;
;
