-- SB-0009: DROP TABLE _backup_stock_daily_summary_20260618
-- Severidade: BAIXO | Tipo: INTEGRIDADE
-- Evidência: tabela com prefixo _backup_, ~42MB, criada em 2026-06-18,
--            não referenciada por migration ativa nem por código do repo.
-- Impacto: 42MB de dado histórico de backup em produção sem propósito ativo.
-- Risco de regressão: nenhum — tabela órfã, zero dependências.
-- PRÉ-CONDIÇÃO: confirmar que backup foi exportado antes de aplicar.
-- Verificação pré-apply:
--   SELECT pg_size_pretty(pg_total_relation_size('public._backup_stock_daily_summary_20260618'));
--   → ~42 MB
-- Verificação pós-apply:
--   SELECT to_regclass('public._backup_stock_daily_summary_20260618'); → NULL

DROP TABLE IF EXISTS public._backup_stock_daily_summary_20260618;

-- ROLLBACK:
-- Não há rollback automático. Restore do backup exportado antes da aplicação.
