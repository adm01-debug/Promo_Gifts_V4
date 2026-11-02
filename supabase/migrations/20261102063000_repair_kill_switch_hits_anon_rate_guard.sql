-- Repair: trigger trg_anon_rate_guard ausente em kill_switch_hits (Gate 1.13.2 / E049).
-- Detectado pelo Gate 1.13.2 no run Deploy Gates 41402296461 (2026-11-02).
-- A migration original 20261029160339 está no ledger mas o trigger foi removido do BD.
-- Rollback: DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.kill_switch_hits;

DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.kill_switch_hits;
CREATE TRIGGER trg_anon_rate_guard
  BEFORE INSERT ON public.kill_switch_hits
  FOR EACH ROW EXECUTE FUNCTION public.fn_anon_insert_rate_guard('120');
