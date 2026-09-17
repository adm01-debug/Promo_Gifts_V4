-- Arquivo-espelho para a entrada de ledger não-canônica
-- `20260623_fix_google_provider_secret_name`.
-- Origem: E09 do plano DBA — docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md, achado #4.
-- Plano: docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md (E09)
--
-- A entrada `20260623_fix_google_provider_secret_name` no ledger
-- (supabase_migrations.schema_migrations) é real e já aplicada em produção
-- em 2026-06-23 (UPDATE efetivo em ai_providers, confirmado ao vivo:
-- ai_providers.secret_name = 'GEMINI_API_KEY' para slug='google'), mas
-- nunca teve um arquivo correspondente em supabase/migrations/ — só um ID
-- não-canônico direto no ledger, sem versão de 14 dígitos.
--
-- Este arquivo é só um espelho textual do efeito já aplicado, para o
-- histórico do repositório ficar completo — NÃO é uma nova aplicação.
-- A entrada não-canônica original permanece no ledger sem alteração (não é
-- renomeada nem removida), só passa a ter um arquivo-espelho canônico
-- documentando o mesmo efeito.
--
-- Idempotente: o WHERE já não casa nenhuma linha hoje (efeito real ocorreu
-- em 2026-06-23) — reconfirmado ao vivo antes de escrever este arquivo.
--
-- [REQUER-PO] apenas para o passo de ledger (registrar esta versão como
-- applied via `migration repair`, ver docs/PACOTE_APROVACAO_1_2026-09-16.md
-- Ação 3b/3c) — o UPDATE abaixo, se rodado, é no-op comprovado.

UPDATE ai_providers SET secret_name = 'GEMINI_API_KEY', updated_at = now()
WHERE slug = 'google' AND secret_name = 'GOOGLE_API_KEY';
