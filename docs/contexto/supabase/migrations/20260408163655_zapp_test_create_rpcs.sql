-- ============================================================================
-- RPCs ADAPTADAS PRO TESTE
-- Diferença vs produção: aceitam p_caller_id como parâmetro extra
-- (em produção isso vem de auth.uid())
-- ============================================================================

-- 1) request_transfer
CREATE OR REPLACE FUNCTION zapp_test.request_transfer(
  p_caller_id            UUID,  -- simula auth.uid()
  p_contact_id           UUID,
  p_contact_phone        TEXT,
  p_to_department        TEXT,
  p_reason               TEXT,
  p_to_agent_id          UUID DEFAULT NULL,
  p_original_call_id     UUID DEFAULT NULL,
  p_context_summary      TEXT DEFAULT NULL,
  p_urgency              TEXT DEFAULT 'normal'
)
RETURNS zapp_test.call_transfers
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_transfer       zapp_test.call_transfers;
  v_from_agent_name TEXT;
  v_to_agent_name  TEXT;
BEGIN
  IF p_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  SELECT full_name INTO v_from_agent_name
  FROM zapp_test.fake_users WHERE id = p_caller_id;
  
  IF v_from_agent_name IS NULL THEN
    v_from_agent_name := 'Atendente';
  END IF;

  IF p_to_agent_id IS NOT NULL THEN
    SELECT full_name INTO v_to_agent_name
    FROM zapp_test.fake_users WHERE id = p_to_agent_id;
  END IF;

  IF p_to_agent_id = p_caller_id THEN
    RAISE EXCEPTION 'Voce nao pode transferir uma chamada pra si mesmo.';
  END IF;

  IF p_urgency NOT IN ('low', 'normal', 'high', 'critical') THEN
    RAISE EXCEPTION 'Urgencia invalida: %.', p_urgency;
  END IF;

  INSERT INTO zapp_test.call_transfers (
    original_call_id, contact_id, contact_phone,
    from_agent_id, from_agent_name,
    to_agent_id, to_agent_name, to_department,
    reason, context_summary, urgency, status, metadata
  )
  VALUES (
    p_original_call_id, p_contact_id, p_contact_phone,
    p_caller_id, v_from_agent_name,
    p_to_agent_id, v_to_agent_name, LOWER(TRIM(p_to_department)),
    TRIM(p_reason), p_context_summary, p_urgency, 'pending',
    jsonb_build_object('created_via', 'request_transfer_rpc')
  )
  RETURNING * INTO v_transfer;

  RETURN v_transfer;
END;
$fn$;

-- 2) accept_transfer
CREATE OR REPLACE FUNCTION zapp_test.accept_transfer(
  p_caller_id   UUID,
  p_transfer_id UUID
)
RETURNS zapp_test.call_transfers
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_transfer    zapp_test.call_transfers;
  v_agent_name  TEXT;
BEGIN
  IF p_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  SELECT * INTO v_transfer
  FROM zapp_test.call_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferencia % nao encontrada.', p_transfer_id;
  END IF;

  IF v_transfer.status <> 'pending' THEN
    RAISE EXCEPTION 'Transferencia ja foi processada (status: %).', v_transfer.status;
  END IF;

  SELECT full_name INTO v_agent_name
  FROM zapp_test.fake_users WHERE id = p_caller_id;

  UPDATE zapp_test.call_transfers
  SET status = 'accepted',
      accepted_by_agent_id = p_caller_id,
      accepted_by_agent_name = v_agent_name,
      accepted_at = NOW()
  WHERE id = p_transfer_id
  RETURNING * INTO v_transfer;

  RETURN v_transfer;
END;
$fn$;

-- 3) complete_transfer
CREATE OR REPLACE FUNCTION zapp_test.complete_transfer(
  p_caller_id        UUID,
  p_transfer_id      UUID,
  p_callback_call_id UUID DEFAULT NULL
)
RETURNS zapp_test.call_transfers
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_transfer zapp_test.call_transfers;
BEGIN
  IF p_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  SELECT * INTO v_transfer
  FROM zapp_test.call_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferencia nao encontrada.';
  END IF;

  IF v_transfer.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Transferencia ja foi finalizada (status: %).', v_transfer.status;
  END IF;

  IF v_transfer.accepted_by_agent_id IS DISTINCT FROM p_caller_id
     AND v_transfer.from_agent_id IS DISTINCT FROM p_caller_id THEN
    RAISE EXCEPTION 'Voce nao tem permissao pra finalizar esta transferencia.';
  END IF;

  UPDATE zapp_test.call_transfers
  SET status = 'completed',
      completed_at = NOW(),
      callback_call_id = COALESCE(p_callback_call_id, callback_call_id)
  WHERE id = p_transfer_id
  RETURNING * INTO v_transfer;

  RETURN v_transfer;
END;
$fn$;

-- 4) cancel_transfer
CREATE OR REPLACE FUNCTION zapp_test.cancel_transfer(
  p_caller_id   UUID,
  p_transfer_id UUID,
  p_reason      TEXT DEFAULT NULL
)
RETURNS zapp_test.call_transfers
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_transfer zapp_test.call_transfers;
BEGIN
  IF p_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  SELECT * INTO v_transfer
  FROM zapp_test.call_transfers
  WHERE id = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferencia nao encontrada.';
  END IF;

  IF v_transfer.status NOT IN ('pending', 'accepted') THEN
    RAISE EXCEPTION 'Transferencia ja foi finalizada e nao pode ser cancelada.';
  END IF;

  IF v_transfer.from_agent_id IS DISTINCT FROM p_caller_id
     AND v_transfer.to_agent_id IS DISTINCT FROM p_caller_id
     AND v_transfer.accepted_by_agent_id IS DISTINCT FROM p_caller_id THEN
    RAISE EXCEPTION 'Voce nao tem permissao pra cancelar esta transferencia.';
  END IF;

  UPDATE zapp_test.call_transfers
  SET status = 'cancelled',
      metadata = metadata || jsonb_build_object(
        'cancelled_by', p_caller_id,
        'cancelled_at', NOW(),
        'cancel_reason', COALESCE(p_reason, 'Sem motivo informado')
      )
  WHERE id = p_transfer_id
  RETURNING * INTO v_transfer;

  RETURN v_transfer;
END;
$fn$;

-- 5) expire_pending_transfers
CREATE OR REPLACE FUNCTION zapp_test.expire_pending_transfers(
  p_timeout_seconds INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE zapp_test.call_transfers
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < NOW() - (p_timeout_seconds || ' seconds')::INTERVAL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

-- 6) get_pending_transfers_for_agent
CREATE OR REPLACE FUNCTION zapp_test.get_pending_transfers_for_agent(
  p_agent_id    UUID,
  p_department  TEXT DEFAULT NULL
)
RETURNS SETOF zapp_test.call_transfers
LANGUAGE plpgsql
AS $fn$
BEGIN
  RETURN QUERY
  SELECT *
  FROM zapp_test.call_transfers
  WHERE status = 'pending'
    AND (
      to_agent_id = p_agent_id
      OR (
        to_agent_id IS NULL
        AND p_department IS NOT NULL
        AND to_department = LOWER(TRIM(p_department))
      )
    )
  ORDER BY
    CASE urgency
      WHEN 'critical' THEN 1
      WHEN 'high'     THEN 2
      WHEN 'normal'   THEN 3
      WHEN 'low'      THEN 4
    END,
    created_at ASC;
END;
$fn$;

-- 7) get_transfer_metrics
CREATE OR REPLACE FUNCTION zapp_test.get_transfer_metrics(
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date   DATE DEFAULT CURRENT_DATE,
  p_department TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_transfers      BIGINT,
  completed_count      BIGINT,
  failed_count         BIGINT,
  expired_count        BIGINT,
  cancelled_count      BIGINT,
  success_rate_pct     NUMERIC,
  avg_gap_seconds      NUMERIC,
  median_gap_seconds   NUMERIC,
  p95_gap_seconds      NUMERIC,
  most_common_dept     TEXT,
  most_active_agent    TEXT
)
LANGUAGE plpgsql
AS $fn$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT * FROM zapp_test.call_transfers
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
      AND (p_department IS NULL OR to_department = LOWER(TRIM(p_department)))
  ),
  agg AS (
    SELECT
      COUNT(*)::BIGINT AS total,
      COUNT(*) FILTER (WHERE status = 'completed')::BIGINT AS completed,
      COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed,
      COUNT(*) FILTER (WHERE status = 'expired')::BIGINT AS expired,
      COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS cancelled,
      AVG(gap_seconds) FILTER (WHERE status = 'completed')::NUMERIC AS avg_gap,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gap_seconds) FILTER (WHERE status = 'completed')::NUMERIC AS median_gap,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY gap_seconds) FILTER (WHERE status = 'completed')::NUMERIC AS p95_gap
    FROM base
  ),
  top_dept AS (
    SELECT to_department FROM base GROUP BY to_department ORDER BY COUNT(*) DESC LIMIT 1
  ),
  top_agent AS (
    SELECT from_agent_name FROM base GROUP BY from_agent_name ORDER BY COUNT(*) DESC LIMIT 1
  )
  SELECT
    agg.total, agg.completed, agg.failed, agg.expired, agg.cancelled,
    CASE WHEN agg.total > 0 THEN ROUND((agg.completed::NUMERIC / agg.total) * 100, 1) ELSE 0 END,
    ROUND(COALESCE(agg.avg_gap, 0), 1),
    ROUND(COALESCE(agg.median_gap, 0), 1),
    ROUND(COALESCE(agg.p95_gap, 0), 1),
    (SELECT to_department FROM top_dept),
    (SELECT from_agent_name FROM top_agent)
  FROM agg;
END;
$fn$;

SELECT 'Todas as 7 RPCs criadas' AS status;
