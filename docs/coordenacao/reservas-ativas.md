# Reservas Ativas (ledger vivo — protocolo multiagente §3)

> Arquivo vivo, sem sufixo de data. Regras em `../PROTOCOLO_MULTIAGENTE_2026-08-29.md`.
> TTL padrão: 48 h. Reserva expirada está liberada. Este ledger é informativo e não substitui
> CODEOWNERS nem autorizações.

| Arquivo/objeto | Agente | Branch/PR | Início (UTC) | TTL | Status |
|---|---|---|---|---|---|
| _(exemplo)_ `src/hooks/kit-builder/useKitBuilderPageState.ts` | claude-code | `claude/kit-save-016` | 2026-08-29T00:00:00Z | 48 h | exemplo |

## Ativas agora

| Arquivo/objeto | Agente | Branch/PR | Início (UTC) | TTL | Status |
|---|---|---|---|---|---|
| `src/hooks/quotes/{quoteTypes,quoteHelpers,useQuoteItems,useQuotes}.ts`, `src/services/quoteService.ts`, testes de contratos de variantes, plano/relatório e `docs/db/DECISAO_QUOTE_VARIANT_ROUNDTRIP_2026-09-22.md` | Codex | `codex/quote-variant-contract-20260922` | 2026-09-22T20:33:44Z | 48 h | correção de leitura/payload de orçamento e simulações; sem execução ou alteração de RPC no banco |
| `scripts/{extract-types-inventory,check-types-inventory-drift}.mjs`, `tests/scripts/check-types-inventory-drift.test.mjs`, plano e relatório de reconciliação de 22/09 | Codex | `codex/types-drift-fail-closed-20260922` | 2026-09-22T20:20:54Z | 48 h | simulações de falso verde e gate de contratos; sem escrita no banco, regeneração versionada de types ou mudança de workflows |
| `scripts/validate-migration-target.mjs`, `tests/scripts/validate-migration-target.test.mjs`, `.github/workflows/db-apply-migration.yml`, pacote signup e plano/relatório de reconciliação de 22/09 | Codex | `codex/e15-pooler-validation-20260922` | 2026-09-22T17:29:00Z | 48 h | correção de conexão e validação do E15; sem reserva/autorização de outros objetos de BD |
| `supabase/MIGRATIONS_SYNC_LOG.md` (somente recibo `20260922170000`) | Codex | `codex/signup-migration-receipt-20260922` | 2026-09-22T19:27:37Z | 48 h | recuperação documental autorizada pelo PO; sem SQL, permissões ou alterações de workflow |

## Histórico (liberadas/expiradas)

| Arquivo/objeto | Agente | Branch/PR | Início (UTC) | Liberação (UTC) | Motivo |
|---|---|---|---|---|---|
| `src/{pages/kit-builder,useKitBuilderQuote.ts,lib/kit-builder/{volume-calculator.ts,box-recommendations.ts},hooks/kit-builder/{useKitAutoSave.ts,useKitStockValidation.ts,useCustomKitPersistence.ts},components/kit-builder/{ItemCard.tsx,PersonalizationConfig.tsx}}`, testes e migrations Kit Maker | Codex | `codex/kit-maker-completion-20260912` | 2026-09-12T14:05:35Z | 2026-09-12T14:49:01Z | remediação F01–F18 concluída; migrations forward-only aplicadas e validadas no canônico |
| `src/pages/magazine/**`, `src/services/magazineService.ts`, testes Magazine, RPCs/triggers/policies `magazine_*`, health/sitemap/CSP e workflows relacionados | Codex | `codex/magazine-hardening-20260909` | 2026-09-09T21:27:01Z | 2026-09-09T22:15:04Z | implementação e validação local concluídas; rollout registrado no plano |
| `docs/{MAPA_ROTA_DADOS_TESTE,EXECUCAO_PLANO_50_ETAPAS,OWNERSHIP_DOMINIOS,READINESS_LIFECYCLE_FEATURES}_2026-08-29.md` | cline | `claude/audit-fixes-20260830` / PR #1808 | 2026-08-30T20:30:00Z | 2026-08-31T10:41:35Z | consolidada na reconciliação Codex; reserva liberada |
