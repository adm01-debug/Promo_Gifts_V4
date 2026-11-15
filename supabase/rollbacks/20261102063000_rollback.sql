-- Rollback: 20261102063000_repair_kill_switch_hits_anon_rate_guard.sql
-- Remove o trigger recriado pelo reparo. Volta ao estado detectado pelo Gate 1.13.2 em 2026-11-02
-- (kill_switch_hits sem rate guard de INSERT anônimo). Nenhum dado é alterado; fn_anon_insert_rate_guard fica.
DROP TRIGGER IF EXISTS trg_anon_rate_guard ON public.kill_switch_hits;
