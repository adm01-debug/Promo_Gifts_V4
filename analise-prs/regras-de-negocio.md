# Regras de Negócio — Análise de PRs

**Documento gerado em:** 2026-10-24  
**Sessão:** https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz  
**Atualizado em:** 2026-10-25 (cobertura expandida para todos os 27 PRs analisados)  
**Aplicado a:** análise dos PRs #2414–#2455 do repo `adm01-debug/Promo_Gifts_V4`

---

## 1. Critérios de Merge Autônomo

Um PR é elegível para merge autônomo **somente se** satisfaz TODOS os critérios:

| # | Critério | Fonte |
|---|---|---|
| 1 | `draft: false` (não é rascunho) | Fluxo Git Rule |
| 2 | `mergeable: true` (sem conflitos) | GitHub API |
| 3 | Nenhum arquivo toca Rule 8 (ver §2) | CLAUDE.md REGRA #8 |
| 4 | CI verde ou falha pre-existing comprovada | GitHub Actions |
| 5 | Diff lido e validado (sem regressão em REGRA #1, #2) | CLAUDE.md |

---

## 2. Triggers de Decisão Humana (Rule 8)

Qualquer PR tocando qualquer um dos itens abaixo exige aprovação do PO antes do merge:

### 2.1 CI / Workflows
- Qualquer arquivo em `.github/workflows/`
- Scripts de gate em `scripts/check-*.mjs` (considerados "CI por extensão")
- `vitest.config.ts` com impacto em gate (borderline — depende do contexto)

### 2.2 DDL / Migrations de Produção
- Qualquer arquivo em `supabase/migrations/`
- Qualquer arquivo em `supabase/rollbacks/`
- Qualquer DDL que altere schema em `doufsxqlfjyuvxuezpln`

### 2.3 Segurança / Secrets
- `.gitleaks.toml` (política de allowlist de secrets)
- `docs/ci/SEGREDOS.md` como fonte de DDL (apenas documentação → OK)
- Qualquer mudança que afroxa detecção de secrets reais

### 2.4 Infraestrutura
- Dockerfile, docker-compose, stack configs
- `.vercel/project.json` (REGRA #11 — não modificar)
- `supabase/config.toml`

### 2.5 Dados Destrutivos / Custo
- Deleção de tabelas, colunas, policies em produção
- Mudanças que afetam billing/custo de infraestrutura

---

## 3. Invariantes Obrigatórias

Estas verificações rodam para TODOS os PRs antes de qualquer merge:

### 3.1 SSOT Supabase (REGRA #1)
```sh
grep 'doufsxqlfjyuvxuezpln' src/integrations/supabase/client.ts
```
- CURRENT_PROJECT_ID deve ser `doufsxqlfjyuvxuezpln`
- `pqpdolkaeqlyzpdpbizo` nunca deve aparecer em código executável

### 3.2 Campos Críticos do Tipo Product (REGRA #2)
Os campos abaixo devem existir em `src/types/product-catalog.ts`:
- `price: number`
- `sale_price?: number`
- `shortDescription: string`
- `category_id?: string`
- `category_name?: string`

### 3.3 Vercel Project Anchor (REGRA #11)
- `.vercel/project.json` deve conter `"projectId": "prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ"`
- Não deletar, não criar projeto fantasma

---

## 4. Falhas CI Pre-Existing (não blocantes)

Falhas verificadas como pre-existing e não atribuíveis a PRs em análise:

| Falha | Causa | Status |
|---|---|---|
| `categories.level does not exist` em Supabase Preview | `CREATE MATERIALIZED VIEW "analytics"."categories_tree_visual"` referencia coluna inexistente | Pre-existing — não relacionada a nenhum PR |

---

## 5. Caminho de Deploy Pós-Merge

### Edge Functions
Após merge de qualquer PR que altere `supabase/functions/`:
→ Dispatch obrigatório de `.github/workflows/deploy-edge-functions.yml`

### Migrations
Único caminho autorizado:
→ `.github/workflows/db-apply-migration.yml` via `workflow_dispatch(version)`

### Schema Snapshot
Após migration ou DDL OOB:
→ `.github/workflows/schema-snapshot-export.yml` com `force_rotate: true`

---

## 6. Draft Status

PRs em rascunho (draft) têm um bloqueio implícito: o autor não sinalizou que estão prontos para revisão. Por convenção, não são mergeados mesmo que o conteúdo seja correto e sem Rule 8. Ação necessária: o autor converter para "ready for review".

---

## 7. Resumo Aplicado aos PRs Analisados

| PR | Veredicto | Razão Primária |
|---|---|---|
| #2414 | MERGEADO | SHA 7061adab — docs-only analise-branches/ |
| #2415 | DECISÃO HUMANA | Rule 8: CI workflow (.github/workflows/) |
| #2417 | IMPOSSÍVEL | branch órfã — NO_MERGE_BASE (sem ancestral com main) |
| #2418 | IMPOSSÍVEL | branch órfã — NO_MERGE_BASE (sem ancestral com main) |
| #2419 | IMPOSSÍVEL | branch órfã — NO_MERGE_BASE (sem ancestral com main) |
| #2420 | IMPOSSÍVEL | branch órfã — NO_MERGE_BASE (sem ancestral com main) |
| #2422 | IMPOSSÍVEL | branch órfã (NO_MERGE_BASE) + draft:true |
| #2424 | DECISÃO HUMANA | Rule 8: DDL migration + CI workflow |
| #2426 | MERGEADO | SHA 7f5d410a — 1 arquivo QA, sem Rule 8 |
| #2427 | MERGEADO | SHA 26641b0a — cors.ts + webhook-schemas; edge fn deployed |
| #2428 | DECISÃO HUMANA | Rule 8: .gitleaks.toml (security policy); draft:true |
| #2432 | JÁ IMPLEMENTADA | conteúdo em main desde SHA 7f5d410a (patch-id idêntico) |
| #2434 | MERGEADO | SHA 53ba69b5 — docs-only analise-prs/ |
| #2435 | DECISÃO HUMANA | Rule 8: CI workflows + .gitleaks.toml; draft:true |
| #2436 | MERGEADO | SHA 4c8193b9 — deliverables update |
| #2437 | MERGEADO (outra sessão) | SHA 9b23fb64 |
| #2438 | MERGEADO (outra sessão) | SHA c8994f17 |
| #2439 | MERGEADO | SHA b3c8f2f3 — deliverables ci-per-test-name + dossies |
| #2441 | MERGEADO (PO) | SHA 90c6492b — DDL P02/P08/P19 + edge fn send-notification |
| #2443 | DECISÃO HUMANA | Rule 8: security decisions; draft:true |
| #2445 | MERGEADO (PO) | SHA 8eeeca9b — DDL cron.alter_job job_id=235 |
| #2447 | NOSSA PR (draft) | deliverables da sessão; draft:true — aguarda saída de draft |
| #2449 | DECISÃO HUMANA | Rule 8: DDL CREATE FUNCTION SECURITY DEFINER; draft:true + conflito |
| #2450 | MERGEADO (PO) | SHA d804cafa — docs RELATORIO_CI.md rev5 |
| #2451 | FECHADO | draft + conflito; PR encerrada sem merge |
| #2452 | IMPOSSÍVEL | draft:true + conflito — GitHub API bloqueia squash de draft |
| #2455 | MERGEADO | SHA bfd9b50a — docs-only RELATORIO_CI.md rev7 + PENDENCIAS.md |
