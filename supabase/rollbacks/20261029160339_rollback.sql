-- Rollback: 20261029160339_add_kill_switch_hits_anon_rate_guard.sql
-- Remove o rate guard anônimo de public.kill_switch_hits.

DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.kill_switch_hits;
