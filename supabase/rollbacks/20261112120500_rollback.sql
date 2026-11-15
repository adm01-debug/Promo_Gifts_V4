-- Rollback: 20261112120500_fix_optimization_queue_rpcs_dev_access.sql
-- Restaura o estado anterior das 4 RPCs da fila de otimização:
--   - guarda interna has_role(auth.uid(), 'admin') (corpo de 20260424213841);
--   - EXECUTE revogado de authenticated (estado T37d/Onda 20), mantido para service_role.
-- Única diferença consciente: search_path fica "public, pg_temp" (antes "public") para não
-- reintroduzir SECURITY DEFINER sem pg_temp (E066). Comportamento funcional idêntico ao anterior.
-- Efeito: Enfileirar/Executar/Resetar em /admin/telemetria voltam a falhar com 42501.

CREATE OR REPLACE FUNCTION public.enqueue_optimization(
  _title text,
  _description text DEFAULT NULL,
  _category text DEFAULT 'performance',
  _priority integer DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.optimization_queue (title, description, category, priority, created_by)
  VALUES (_title, _description, COALESCE(_category,'performance'), COALESCE(_priority,100), auth.uid())
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_next_optimization()
RETURNS public.optimization_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claimed public.optimization_queue;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF EXISTS (SELECT 1 FROM public.optimization_queue WHERE status = 'running') THEN
    RETURN NULL;
  END IF;

  UPDATE public.optimization_queue
     SET status = 'running', started_at = now()
   WHERE id = (
     SELECT id FROM public.optimization_queue
      WHERE status = 'pending'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
   RETURNING * INTO claimed;

  RETURN claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_optimization(
  _id uuid,
  _status text,
  _notes text DEFAULT NULL,
  _guardrail_status text DEFAULT NULL,
  _result jsonb DEFAULT NULL,
  _error text DEFAULT NULL
)
RETURNS public.optimization_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  updated public.optimization_queue;
  duration int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _status NOT IN ('done','failed','skipped','blocked') THEN
    RAISE EXCEPTION 'invalid status: %', _status;
  END IF;

  UPDATE public.optimization_queue
     SET status = _status,
         finished_at = now(),
         result = COALESCE(_result, result),
         error = _error,
         guardrail_status = COALESCE(_guardrail_status, guardrail_status)
   WHERE id = _id
   RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'optimization not found';
  END IF;

  duration := EXTRACT(EPOCH FROM (updated.finished_at - COALESCE(updated.started_at, updated.finished_at))) * 1000;

  INSERT INTO public.optimization_queue_runs (queue_id, status, notes, guardrail_status, duration_ms, executed_by)
  VALUES (_id, _status, _notes, _guardrail_status, duration, auth.uid());

  RETURN updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_optimization_queue(_only_running boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _only_running THEN
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL
     WHERE status = 'running';
  ELSE
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL, finished_at = NULL, error = NULL
     WHERE status IN ('running','failed','blocked');
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_optimization(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_next_optimization() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_optimization(uuid, text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_optimization_queue(boolean) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_optimization(text, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_next_optimization() TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_optimization(uuid, text, text, text, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_optimization_queue(boolean) TO service_role;

COMMENT ON FUNCTION public.enqueue_optimization(text, text, text, integer) IS NULL;
COMMENT ON FUNCTION public.claim_next_optimization() IS NULL;
COMMENT ON FUNCTION public.complete_optimization(uuid, text, text, text, jsonb, text) IS NULL;
COMMENT ON FUNCTION public.reset_optimization_queue(boolean) IS NULL;
