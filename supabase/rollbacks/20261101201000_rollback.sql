-- Rollback: 20261101201000_fix_health_view_backup_check.sql
-- Reverte a view vw_system_health_quick para a checagem de 3 tabelas de backup.
-- Atenção: _backup_stock_daily_summary_20260618 foi apagada em 2026-11-01; com a definição antiga o item backup_tables_rls_locked volta a FAIL.
-- Definição anterior: ver pg_get_viewdef antes da migration (lista de 3 nomes e "= 3" no item backup_tables_rls_locked) em
-- supabase/baseline/ ou supabase/migrations-snapshot/SCHEMA_LIVE.sql.
SELECT 'sem reversão automática: recriar a view a partir do SCHEMA_LIVE.sql' AS aviso;
