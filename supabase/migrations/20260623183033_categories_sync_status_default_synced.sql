-- APLICADO: 2026-06-23
-- GAP-3 PARTE 2: Adicionar DEFAULT 'synced' para sync_status.
-- Backfill (477 rows NULL → 'synced') já executado via execute_sql.
-- Novas categorias inseridas pelo sistema já nascem como 'synced'
-- (elas existem no sistema canônico por definição).
-- Status muda para 'pending' quando um processo de re-sync for trigado,
-- e para 'error' se o sync falhar.

ALTER TABLE public.categories
  ALTER COLUMN sync_status SET DEFAULT 'synced';

COMMENT ON COLUMN public.categories.sync_status IS
  'Status de sincronização da categoria com sistemas externos. '
  'Valores: synced (OK), pending (aguardando sync), error (falhou). '
  'DEFAULT synced adicionado em 2026-06-23 — backfill de 477 NULLs para synced realizado.';;
