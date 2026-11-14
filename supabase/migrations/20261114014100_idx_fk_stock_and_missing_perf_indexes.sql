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
-- PERF-002 (20261101194200, idx_scan=0) apagou 7 índices de stock_snapshots. Esta migration recria a
-- cobertura de 3 deles (idx_ss_variant_id, idx_snapshots_product_captured, idx_snapshots_vss_captured)
-- de propósito: são FKs ON DELETE CASCADE e, sem índice, todo DELETE no pai varre a tabela inteira —
-- custo de escrita aceito (~5–8 MB por índice; aprovação do dono no chat, 2026-11-14).
-- Fora: idx_ss_supplier_id e idx_stock_snapshots_supplier_branch_id (cobriam FKs NO ACTION para
-- tabelas de 5 e 7 linhas, 4 e 7 valores distintos); captured_at* eram índices de leitura sem uso.
-- Fora: idx_workspace_notifications_undispatched (coluna dispatched_at não existe em produção).
-- idx_crm_callback_events_type: só event_type (a coluna created_at não existe na tabela).
-- CONCURRENTLY: não bloqueia escrita; por isso roda sem transação.
-- Rollback: supabase/rollbacks/20261114014100_rollback.sql
-- O db-apply-migration usa lock_timeout=1s e o CONCURRENTLY espera transações antigas: esta sessão
-- usa lock_timeout generoso. Se uma tentativa deixar algum índice INVÁLIDO, o IF NOT EXISTS o
-- esconderia na reaplicação — a guarda final falha alto (mesmo padrão de 20261113235000).
SET lock_timeout = '5min';

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

DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(n, ', ') INTO v_missing
  FROM unnest(ARRAY['idx_stock_snapshots_variant_supplier','idx_stock_snapshots_product_id','idx_stock_snapshots_variant_supplier_source_id','idx_stock_notes_created_by','idx_stock_notes_supplier_id','idx_token_revocations_jti','idx_token_revocations_expires','idx_workspace_notifications_category','idx_webhook_delivery_locks_claimed_at','idx_fit_expires_at','idx_crm_callback_events_type']) AS n
  WHERE NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.' || n) AND indisvalid);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'índices ausentes ou INVÁLIDOS após CREATE INDEX CONCURRENTLY: % — rode o rollback (DROP INDEX CONCURRENTLY) e reaplique', v_missing;
  END IF;
END $$;
