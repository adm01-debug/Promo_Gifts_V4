-- Backfill — arquivo-espelho para o ledger version 20260623_fix_google_provider_secret_name.
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E09)
--        docs/plans/PLANO_ENGENHARIA_SENIOR_50_ETAPAS_2026-09-17.md (E33)
-- Ver docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md achado #4 para a investigação completa.
--
-- O que é: o ledger vivo (supabase_migrations.schema_migrations) tem uma entrada real,
-- não-canônica ("20260623_fix_google_provider_secret_name") sem nenhum arquivo local
-- correspondente — foi aplicada via execute_sql/dashboard direto em 2026-06-23, não via
-- migration commitada. O efeito é real e já está em produção (reconfirmado ao vivo em
-- 2026-09-17: ai_providers.secret_name = 'GEMINI_API_KEY' para slug='google'). Este arquivo
-- é só o espelho textual — não é uma migration nova a aplicar, é a regularização de uma
-- que já rodou. Idempotente por natureza: o WHERE já não casa nenhuma linha hoje.
--
-- A entrada não-canônica original permanece no ledger sem alteração (não é renomeada nem
-- removida). Este arquivo, quando (e se) o PO aprovar, seria registrado no ledger via
-- `migration repair --status applied 20260916181609 --linked` — metadata-only, não roda
-- SQL de novo. [REQUER-PO] só a etapa de repair do ledger; o arquivo em si não é DDL.

UPDATE public.ai_providers SET secret_name = 'GEMINI_API_KEY', updated_at = now()
WHERE slug = 'google' AND secret_name = 'GOOGLE_API_KEY';
