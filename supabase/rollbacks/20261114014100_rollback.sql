-- transaction: none
-- approved-by: adm01-debug (dono; aprovação explícita no chat da sessão Claude 2026-11-14)
-- Rollback: 20261114014100 — remove os índices criados.

DROP INDEX CONCURRENTLY IF EXISTS public.idx_stock_snapshots_variant_supplier;
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_stock_snapshots_product_id;  -- já existia em produção antes desta migration (pg_indexes 2026-11-14): o rollback não pode apagá-lo
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_stock_snapshots_variant_supplier_source_id;  -- já existia em produção antes desta migration (pg_indexes 2026-11-14): o rollback não pode apagá-lo
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_stock_notes_created_by;  -- já existia em produção antes desta migration (pg_indexes 2026-11-14): o rollback não pode apagá-lo
-- DROP INDEX CONCURRENTLY IF EXISTS public.idx_stock_notes_supplier_id;  -- já existia em produção antes desta migration (pg_indexes 2026-11-14): o rollback não pode apagá-lo
DROP INDEX CONCURRENTLY IF EXISTS public.idx_token_revocations_jti;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_token_revocations_expires;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_workspace_notifications_category;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_webhook_delivery_locks_claimed_at;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_fit_expires_at;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_crm_callback_events_type;
