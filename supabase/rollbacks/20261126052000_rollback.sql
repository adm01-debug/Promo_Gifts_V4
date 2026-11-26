-- Rollback: 20261126052000_ops_infra_telemetry_dev_rpc
-- Remove a RPC dev-gated fn_dev_ops_infra_telemetry(). As tabelas de ops
-- (table_size_history, pgss_history, wraparound_monitor_log) não são tocadas:
-- continuam deny-all e alimentadas pelos mesmos crons.
-- Depois deste rollback a tela /admin/infra-ops volta a erro até o front ser revertido junto
-- (src/pages/admin/AdminInfraOpsPage.tsx).

DROP FUNCTION IF EXISTS public.fn_dev_ops_infra_telemetry(integer, integer);
