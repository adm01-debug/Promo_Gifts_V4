# Pendências de CI — Sessão 2026-11-01

Workflows com última execução em `main` = **failure** que requerem ação do PO ou investigação adicional.  
Atualizado por: sessão `https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj`

---

## 1. E2E (Playwright) — Header sticky quebrado

**Workflow:** `E2E (Playwright)` · Run [#41344698154](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41344698154)  
**Erro:** `O Header global deixou de ser sticky em alguma rota/viewport.`  
**Job:** `e2e-gates` · Step: `🛑 Fail-fast se header sticky falhou`  
**Spec:** `e2e/flows/22-header-sticky.spec.ts`  
**Causa raiz típica:** `overflow`/`transform`/`filter` em ancestral do `<header>` em `src/components/layout/MainLayout.tsx` criando scroll container ou stacking context indevido  
**O que preciso fazer:** investigar mudanças recentes em `MainLayout.tsx` e corrigir o CSS que quebrou o `position: sticky` do header  
**Bloqueio:** requer análise de componente React + confirmação visual

---

## 2. E2E — Critical Flows & Error Boundaries — Sidebar Tooltips

**Workflow:** `E2E — Critical Flows & Error Boundaries` · Run [#41344698218](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41344698218)  
**Erro:** Falha no step `Run Sidebar Tooltips E2E — desktop (chromium-authed)`  
**Job:** `E2E — Full User Flows (authed)` (requer credenciais `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`)  
**Bloqueio:** falha autenticada — requer análise do relatório Playwright (artifact `e2e-full-flows-report-41344698218`)

---

## 3. E2E • ColorSwatch 2 linhas (Grid)

**Workflow:** `E2E • ColorSwatch 2 linhas (Grid)` · Run [#41348720790](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41348720790)  
**Erro:** Falha no step `Run ColorSwatch grid suite`  
**Job:** `ColorSwatch grid (2 linhas + clipping + +N)`  
**Artifact:** `color-swatch-grid-report` (209MB de screenshots Playwright)  
**O que preciso fazer:** baixar o artifact e analisar quais assertions visuais falharam; ajustar o componente ou atualizar os baselines visuais

---

## 4. CI - Replenishment Module Quality Gate — E2E visual parity

**Workflow:** `CI - Replenishment Module Quality Gate` · Run [#41346340463](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41346340463)  
**Erro:** Falha no step `E2E — Paridade visual /novidades vs /reposicao`  
**Artifact:** `parity-report` (209MB de capturas Playwright)  
**O que preciso fazer:** baixar artifact `parity-report` e ver qual diferença visual foi detectada entre as rotas `/novidades` e `/reposicao`

---

## 5. Magazine typed queries — dry-run — TypeScript typecheck

**Workflow:** `Magazine typed queries — dry-run` · Run [#41348995057](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41348995057)  
**Erro:** Falha no step `Typecheck (aplicação)` — aplica patch em cópia e valida  
**Job:** `Aplica patch em cópia e valida`  
**O que preciso fazer:** ver o relatório artifact do dry-run para identificar qual tipagem TypeScript está incorreta no patch gerado pelo workflow  
**Bloqueio:** o workflow aplica um patch automaticamente e valida — requer análise do output completo

---

## 6. schema-snapshot-export — ledger manifest ausente + drift parity

**Workflow:** `schema-snapshot-export` · Run [#41348311003](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41348311003)  
**Erros:**
- Job `Weekly live drift check`: arquivo `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json` não encontrado — checagem inconclusa (exit 2)
- Job `Drift gate antes de girar o baseline`: ledger parity failure entre repo e canônico  
**Causa:** `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json` foi excluído do repo. O arquivo é o baseline do check de drift (E46), gerado pelo processo manual E06 (hashes calculados dentro do banco via MCP `execute_sql`)  
**O que preciso fazer:** regenerar `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json` executando o processo E06 descrito em `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md` com acesso ao banco canônico. **REGRA #8 se aplica** — requer aprovação do PO antes de qualquer escrita no ledger  
**Bloqueio:** requer acesso com `SUPABASE_ACCESS_TOKEN` + `execute_sql` para gerar hashes; proibido para agentes por E056

---

## 7. Supabase Linter Gate — Security Advisors / live catalog gates

**Workflow:** `Supabase Linter Gate` · Run [#41346340197](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41346340197)  
**Erro:** Falha no step `Check Security Advisors and live catalog gates` (exit 1)  
**Job:** `linter`  
**O que preciso fazer:** verificar o artifact `supabase-linter-allowlist-5393` para ver quais advisors de segurança (unindexed FKs, leaked password, etc.) foram detectados no projeto `doufsxqlfjyuvxuezpln`. Se forem novos findings, adicionar justificativas na allowlist ou corrigir o schema  
**Bloqueio:** log insuficiente (40 linhas de tail não capturaram a mensagem de erro específica)

---

## 8. DB — Aplicação controlada de migration única (E15) — PRONTO PARA APPLY

**Workflow:** `DB — Aplicação controlada de migration única (E15)` · Run [#41349162122](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41349162122)  
**Erro anterior:** migration `20261101202000_drop_revoke_agent_created_functions.sql` sem `-- Rollback:` header e sem rollback file  
**Status após esta PR:** ✅ artifacts corrigidos — `-- Rollback:` adicionado ao header + `supabase/rollbacks/20261101202000_rollback.sql` criado  
**O que o PO precisa fazer:** após merge desta PR, disparar `workflow_dispatch` em `.github/workflows/db-apply-migration.yml` com `version: 20261101202000`  
**Efeito:** DROP da função `perf002_drop_unused_snapshot_indexes()` + REVOKE EXECUTE em `cleanup_expired_auth_sessions()` de authenticated/anon/PUBLIC  
**⚠️ REGRA #8 — requer sua aprovação antes do apply** (DDL em produção)
