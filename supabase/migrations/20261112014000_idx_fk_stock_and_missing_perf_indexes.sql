-- transaction: none
-- approved-by: @adm01-debug (Joaquim, aprovado no chat em 2026-11-11)
--
-- Índices que faltam em produção (verificado em pg_catalog em 2026-11-12):
--   • 7 chaves estrangeiras sem índice em stock_snapshots (778 MB) e stock_notes —
--     deletes/joins na tabela pai fazem varredura completa.
--   • 6 índices de desempenho criados em migrations antigas que nunca chegaram a produção
--     (ver supabase/MIGRATIONS_SYNC_LOG.md, seção 2026-11-12).
-- Fora: idx_workspace_notifications_undispatched (coluna dispatched_at não existe em produção).
-- idx_crm_callback_events_type: só event_type (a coluna created_at não existe na tabela).
-- CONCURRENTLY: não bloqueia escrita; por isso roda sem transação.
-- Rollback: supabase/rollbacks/20261112014000_rollback.sql

-- stock_snapshots: (variant_id, supplier_id) cobre a FK de variant_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_snapshots_variant_supplier
  ON public.stock_snapshots (variant_id, supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_snapshots_product_id
  ON public.stock_snapshots (product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_snapshots_supplier_id
  ON public.stock_snapshots (supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_snapshots_supplier_branch_id
  ON public.stock_snapshots (supplier_branch_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_snapshots_variant_supplier_source_id
  ON public.stock_snapshots (variant_supplier_source_id);

-- stock_notes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_notes_created_by
  ON public.stock_notes (created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_notes_supplier_id
  ON public.stock_notes (supplier_id);

-- desempenho (migrations antigas não aplicadas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_revocations_jti
  ON public.user_token_revocations (token_jti) WHERE token_jti IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_revocations_expires
  ON public.user_token_revocations (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_notifications_category
  ON public.workspace_notifications (category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_delivery_locks_claimed_at
  ON public.webhook_delivery_locks (claimed_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fit_expires_at
  ON public.favorite_items_trash (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_callback_events_type
  ON public.crm_callback_events (event_type);
