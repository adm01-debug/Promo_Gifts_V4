-- Add the same per-IP limit already used by the other anonymous telemetry tables.
-- Rollback: DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.kill_switch_hits;

DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.kill_switch_hits;
CREATE TRIGGER trg_anon_rate_guard
  BEFORE INSERT ON public.kill_switch_hits
  FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('120');
