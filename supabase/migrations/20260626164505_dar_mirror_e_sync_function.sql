CREATE OR REPLACE FUNCTION public.sync_quote_discount_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qid       uuid := COALESCE(NEW.quote_id, OLD.quote_id);
  v_status    text;
  v_resp      timestamptz;
  v_prev_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- DAR mais recente do quote; NULL se nao sobrou nenhum (DELETE do ultimo) -> limpa o espelho
  SELECT status, responded_at INTO v_status, v_resp
  FROM public.discount_approval_requests
  WHERE quote_id = v_qid
  ORDER BY COALESCE(responded_at, created_at) DESC
  LIMIT 1;

  -- eleva contexto SOMENTE p/ o write derivado (mesmo escape hatch que immutability/validate ja reconhecem)
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.quotes
  SET discount_approval_status = v_status,
      discount_approved_at     = v_resp
  WHERE id = v_qid
    AND (discount_approval_status IS DISTINCT FROM v_status
         OR discount_approved_at IS DISTINCT FROM v_resp);   -- guarda anti no-op

  -- restaura o contexto imediatamente
  PERFORM set_config('request.jwt.claim.role', COALESCE(v_prev_role, ''), true);

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- espelhamento derivado NUNCA derruba a transacao primaria do DAR; auto-cura na proxima mudanca
  PERFORM set_config('request.jwt.claim.role', COALESCE(v_prev_role, ''), true);
  RAISE WARNING 'sync_quote_discount_approval falhou p/ quote %: % (espelhamento ignorado)', v_qid, SQLERRM;
  RETURN NULL;
END $$;;
