-- ============================================================
-- PROPOSTA P09 — DRIFT-003: Reconciliação do ledger de migrations
-- Severidade: ALTO
-- Achado: DRIFT-003
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   446 arquivos em supabase/migrations/ com timestamp único não
--   encontrados no ledger supabase_migrations.schema_migrations.
--   Causa provável: DDL aplicada via MCP/execute_sql diretamente
--   (fora do workflow db-apply-migration.yml), sem registro no
--   ledger — padrão idêntico ao incidente de 2026-10-13.
--
-- EVIDÊNCIA (somente leitura, confirmada em 2026-10-22):
--   • supabase/migrations/*.sql: 2975 arquivos (ls | wc -l)
--   • schema_migrations com timestamp (14 dígitos): 2529 entradas
--   • Diferença: 446 sem registro
--   • Max versão DB: 20261019000000 — não há gap por timestamp futuro
--
-- SOLUÇÃO:
--   Para cada migration sem registro, verificar se o DDL já foi
--   aplicado em produção (comparar schema real via pg_catalog).
--   Se já aplicado → migration repair --status applied (registrar).
--   Se não aplicado → avaliar se deve ser aplicado via workflow.
--
-- ATENÇÃO: Este processo é investigativo e manual.
--   NÃO executar cegamente — 446 migrations podem incluir alterações
--   destrutivas, migrations de teste ou migrations já revertidas.
-- ============================================================

-- === PASSO 1 — IDENTIFICAR migrations sem registro no ledger ===
-- (Somente SELECT — nenhuma escrita)
-- NÃO APLICAR DIRETAMENTE

/*
-- Query para identificar quais versions estão no repo mas não no ledger:
-- (Executar localmente após clonar o repo)
SELECT v.version
FROM (VALUES
  -- Inserir aqui os 446 timestamps extraídos de ls supabase/migrations/*.sql
  -- ex: ('20260101120000'), ('20260202090000'), ...
) AS v(version)
LEFT JOIN supabase_migrations.schema_migrations sm ON sm.version = v.version
WHERE sm.version IS NULL
ORDER BY v.version;
*/

-- === PASSO 2 — Para cada migration identificada, verificar se DDL está aplicado ===
-- (Comparar pg_catalog com o DDL do arquivo .sql)
-- Esta verificação é manual, arquivo por arquivo.

-- === PASSO 3 — Registrar migrations já aplicadas no ledger ===
-- (Executar via workflow db-apply-migration.yml com mode=repair-only)
-- Ex para cada version confirmada como aplicada:
/*
-- supabase migration repair --status applied <version>
-- (NUNCA sem versão explícita — REGRA #8 CLAUDE.md)
*/

-- === ROLLBACK ===
-- Não aplicável — PASSO 3 é reversível com:
/*
supabase migration repair --status reverted <version>
-- (Usar com cautela — o CLI pode truncar o ledger se mal usado)
*/

-- === RISCO ===
-- ALTO se executado sem verificação prévia de cada migration
-- BAIXO se o processo investigativo for seguido (passo a passo)
--
-- === PRIORIDADE ===
-- Imediata — 446 migrations sem registro significa que o drift-check
-- do CI (ddl-out-of-band-detector.yml) pode estar mascarando DDL
-- aplicada diretamente em produção sem revisão.
