-- Fila de otimização (/admin/telemetria, DevRoute): Enfileirar/Executar/Resetar falham com 42501.
-- Causa: T37d (20260513000005) e Onda 20 (20260515150000) classificaram enqueue/claim/complete
--   como "backend workers" e revogaram EXECUTE de authenticated. O único chamador real é a UI dev
--   (src/pages/admin/telemetry/useOptimizationQueue.ts); não há cron, trigger, view nem edge chamando
--   (db-snapshot: callers.cron=[], callers.db=[]). reset_optimization_queue virou INVOKER (T37b-2)
--   e também ficou só com service_role.
-- Segundo defeito: a guarda interna era has_role(uid,'admin') (papel legado), mas a tela é DevRoute
--   e a RLS da tabela é "Devs manage optimization queue" = is_dev(). Dev sem o papel literal 'admin'
--   receberia 'forbidden' mesmo com GRANT.
-- Correção (mesmo padrão de 20260611183100_p2_acl_01_restore_admin_rpcs_frontend): guarda interna
--   is_dev() + GRANT EXECUTE só para authenticated/service_role; PUBLIC/anon revogados.
--   Não-dev autenticado recebe exceção 'forbidden' da própria função — sem acesso a dado.
--   check_telemetry_regression() já está com authenticated (20261013170913) — não é tocada aqui.
-- Assinaturas, nomes de parâmetros, defaults e tipos de retorno idênticos aos de 20260424213841
--   (CREATE OR REPLACE não altera ACL nem dependências).
-- Rollback: supabase/rollbacks/20261112120500_rollback.sql (restaura guarda has_role 'admin' e
--   revoga EXECUTE de authenticated nas 4 funções).

-- ── enqueue_optimization ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enqueue_optimization(
  _title text,
  _description text DEFAULT NULL,
  _category text DEFAULT 'performance',
  _priority integer DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_dev((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.optimization_queue (title, description, category, priority, created_by)
  VALUES (_title, _description, COALESCE(_category, 'performance'), COALESCE(_priority, 100), (SELECT auth.uid()))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$

REVOKE EXECUTE ON FUNCTION public.enqueue_optimization(text, text, text, integer) FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.enqueue_optimization(text, text, text, integer) TO authenticated, service_role

-- ── claim_next_optimization ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_next_optimization()
RETURNS public.optimization_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  claimed public.optimization_queue;
BEGIN
  IF NOT public.is_dev((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Bloqueia se já existe um running
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
$$

REVOKE EXECUTE ON FUNCTION public.claim_next_optimization() FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.claim_next_optimization() TO authenticated, service_role

-- ── complete_optimization ────────────────────────────────────────────
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
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  updated public.optimization_queue;
  duration integer;
BEGIN
  IF NOT public.is_dev((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _status NOT IN ('done', 'failed', 'skipped', 'blocked') THEN
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
  VALUES (_id, _status, _notes, _guardrail_status, duration, (SELECT auth.uid()));

  RETURN updated;
END;
$$

REVOKE EXECUTE ON FUNCTION public.complete_optimization(uuid, text, text, text, jsonb, text) FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.complete_optimization(uuid, text, text, text, jsonb, text) TO authenticated, service_role

-- ── reset_optimization_queue ─────────────────────────────────────────
-- Mantém SECURITY INVOKER (decisão T37b-2): o UPDATE passa pela RLS
-- "Devs manage optimization queue" (is_dev) e pelo GRANT UPDATE de authenticated na tabela.
CREATE OR REPLACE FUNCTION public.reset_optimization_queue(_only_running boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  affected integer;
BEGIN
  IF NOT public.is_dev((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _only_running THEN
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL
     WHERE status = 'running';
  ELSE
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL, finished_at = NULL, error = NULL
     WHERE status IN ('running', 'failed', 'blocked');
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$

REVOKE EXECUTE ON FUNCTION public.reset_optimization_queue(boolean) FROM PUBLIC, anon

GRANT EXECUTE ON FUNCTION public.reset_optimization_queue(boolean) TO authenticated, service_role

COMMENT ON FUNCTION public.enqueue_optimization(text, text, text, integer) IS
  'Fila de otimização (UI dev /admin/telemetria). Guarda interna is_dev(); EXECUTE: authenticated, service_role. Ver 20261112120500.'

COMMENT ON FUNCTION public.claim_next_optimization() IS
  'Fila de otimização (UI dev /admin/telemetria). Guarda interna is_dev(); EXECUTE: authenticated, service_role. Ver 20261112120500.'

COMMENT ON FUNCTION public.complete_optimization(uuid, text, text, text, jsonb, text) IS
  'Fila de otimização (UI dev /admin/telemetria). Guarda interna is_dev(); EXECUTE: authenticated, service_role. Ver 20261112120500.'

COMMENT ON FUNCTION public.reset_optimization_queue(boolean) IS
  'Fila de otimização (UI dev /admin/telemetria). SECURITY INVOKER + RLS is_dev; guarda interna is_dev(). Ver 20261112120500.'
