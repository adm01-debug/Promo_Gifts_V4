-- Migration aditiva e idempotente para suportar idempotency no webhook-inbound.
-- contract_version já existe NOT NULL — não tocar (a versão do Lovable tentaria
-- adicionar como TEXT nullable, o que seria no-op por IF NOT EXISTS).

-- 1) Adicionar idempotency_key (nullable: webhooks sem chave continuam funcionando)
ALTER TABLE public.inbound_webhook_events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2) Índice único parcial para detectar duplicatas (só quando key fornecida)
--    A versão do Lovable usava (endpoint_id, idempotency_key). Mantemos.
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_idempotency
  ON public.inbound_webhook_events (endpoint_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3) Função SECURITY DEFINER para atualização atômica de stats no endpoint.
--    Substitui o UPDATE direto que sofria de race condition em paralelo.
CREATE OR REPLACE FUNCTION public.increment_webhook_stats(
  p_endpoint_id UUID,
  p_is_invalid  BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inbound_webhook_endpoints
  SET
    last_received_at = NOW(),
    total_received   = COALESCE(total_received, 0) + 1,
    total_invalid    = COALESCE(total_invalid,  0) + CASE WHEN p_is_invalid THEN 1 ELSE 0 END
  WHERE id = p_endpoint_id;
END;
$$;

-- 4) ACL: só service_role chama isto via RPC; revogar do resto.
REVOKE ALL ON FUNCTION public.increment_webhook_stats(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_webhook_stats(UUID, BOOLEAN) TO service_role, postgres;
