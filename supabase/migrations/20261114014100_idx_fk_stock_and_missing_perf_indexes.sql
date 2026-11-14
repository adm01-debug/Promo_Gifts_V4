-- transaction: none
-- approved-by: adm01-debug (dono; aprovação explícita no chat da sessão Claude 2026-11-14)
--
-- Supersede da PR #3412 (versão original 20261112014000, nunca aplicada; nova versão pelo gate E15).
-- Índices que faltam em produção (verificado em pg_indexes em 2026-11-14 — nenhum dos 11 existe):
--   • stock_snapshots: 3 FKs ON DELETE CASCADE (product_variants, products, variant_supplier_sources).
--     Sem índice, cada linha apagada na tabela pai (ex.: limpeza de zumbis em
--     fn_asia_site_promote_to_gold) faz varredura completa de stock_snapshots (657 MB de heap).
--     Índices novos, sem inchaço: ~5–8 MB cada (157.746 linhas).
--   • stock_notes: 2 FKs (created_by → auth.users CASCADE; supplier_id SET NULL).
--   • 6 índices de desempenho de migrations antigas que nunca chegaram a produção.
-- Fora (PERF-002, 20261101194200, apagou por idx_scan=0): idx_stock_snapshots_supplier_id e
-- idx_stock_snapshots_supplier_branch_id — FKs NO ACTION para tabelas de 5 e 7 linhas, 4 e 7 valores distintos.
-- Fora: idx_workspace_notifications_undispatched (coluna dispatched_at não existe em produção).
-- idx_crm_callback_events_type: só event_type (a coluna created_at não existe na tabela).
-- CONCURRENTLY: não bloqueia escrita; por isso roda sem transação.
-- Rollback: supabase/rollbacks/20261114014100_rollback.sql

-- stock_snapshots: (variant_id, supplier_id) cobre a FK de variant_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_snapshots_variant_supplier
  ON public.stock_snapshots (variant_id, supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_snapshots_product_id
  ON public.stock_snapshots (product_id);
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
