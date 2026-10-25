# Relatório CI — Reparo de Workflows `claude_05/nifty-sagan-r23gqh`

**Data:** 2026-10-25 (rev 2 — estado atualizado; commit `f6de09fe` em análise)  
**Branch de trabalho:** `claude_05/nifty-sagan-r23gqh`  
**PR principal:** [#2435](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2435)  
**Commit HEAD atual:** `f6de09fe0875c6d82cbe375562ca279c90e456da`

---

## Resumo de trabalho nesta sessão

### Correções aplicadas neste PR

| Item | Descrição | Commit |
|---|---|---|
| DRAFTS_STATUS.md | Regenerado via `node scripts/map-drafts-to-migrations.mjs`; removeu referência ao arquivo deletado `20260713_001_secdef_revoke_webhook_locks.sql`; 11 rascunhos documentados | `ac7920bc` |
| REVIEWS.json | Criado com 7 entradas em `acknowledged_not_promoted` incluindo `probe_e184_legacy_refs.sql` | `f493864` |
| Edge Functions (Zod v4 UUID) | UUIDs de teste substituídos por UUIDs válidos v4 | (anterior) |
| PENDENCIAS.md | Corrige bug de shell expansion; rev 13 — P-AUDIT/P-SMOKE/P-VIS adicionados; P19 status revisado | `d1b5858` + este commit |
| RELATORIO_CI.md | Corrige bug de shell expansion; estado atualizado para f6de09fe | `d1b5858` + este commit |
| fix referência abreviada `...sql` | dossiê fix-audit-acl-regrole corrigido (Gate 1.3 migration contracts) | `f6de09f` |

---

## Estado CI em `ac7920bc` (snapshot 2026-10-24T23:30Z)

| Check | Status | Observação |
|---|---|---|
| Assert Gate Final is required on main | ✅ success | Configuração OK |
| Drafts index (bloqueante) | ✅ success | Corrigido nesta sessão |
| SSOT Gates | ✅ success | Gate 0 OK |
| Secrets Inventory Check (E40) | ✅ success | Gate 1.14 OK |
| Gitleaks | ✅ success | Sem segredos expostos |
| Unit Zod schemas | ✅ success | Schemas OK |
| E2E Freight Flow | ✅ success | Flow OK |
| Edge Integration Presence Gate | ✅ success | |
| audit | ❌ failure | P-AUDIT — transiente; resolvido em main@8855a573 |
| E2E — Personalization Journey | ❌ failure | P2c — dados insuficientes em CI (pré-existente) |
| Edge Functions · Integration All | ❌ failure | P20 — Zod v4 UUID fix aplicado |
| Edge Functions · Freight CI | ❌ failure | Investigar |
| Smoke (fail-fast) | ❌ failure | P-SMOKE — resolvido em main@8855a573 |
| chromium • swatch→QV | ❌ failure | P-VIS — duplica P12 (pré-existente) |
| Gate Final - Deploy Ready | ⏳ aguardando | Depende de checks em andamento |
| Gate 0 SSOT | ⏳ queued | |
| Gate 1 Lint & Typecheck | ⏳ in_progress | |
| Vitest Unit Tests Magazine | ⏳ queued | |

---

## Pendências externas (requer ação do PO)

Ver `PENDENCIAS.md` para lista completa. Itens que bloqueiam Gate Final:

| Código | Workflow | Motivo do bloqueio |
|---|---|---|
| P1 | release-please | PAT sem permissão para criar releases — requer RELEASE_PLEASE_TOKEN |
| P-V1 | Vercel | Projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` causa builds duplos — requer exclusão pelo PO |
| P-NPM1 | npm install local | Registry Lovable retorna 403 para instalação local; CI remoto funciona |

---

## Histórico de commits neste PR

| Commit | Mensagem | Resultado CI |
|---|---|---|
| `9cf5230` | feat(qa): adiciona probe_e184_legacy_refs.sql | ❌ Drafts index falhou |
| `f493864` | fix(qa): atualiza DRAFTS_STATUS.md + REVIEWS.json | ❌ Drafts index falhou (ref deletada) |
| `ac7920bc` | fix(qa): regenera DRAFTS_STATUS.md via script | ✅ Drafts index success |
| `d1b5858` | fix(docs): corrige shell expansion em PENDENCIAS.md e RELATORIO_CI.md | ⏳ em análise |
| `f6de09fe` | fix(docs): corrige referência abreviada de migration no dossiê fix-audit-acl-regrole | ⏳ em análise |
| este commit | fix(docs): PENDENCIAS.md rev 13 — P-AUDIT/P-SMOKE/P-VIS; P19 revisado | ⏳ pendente CI |
