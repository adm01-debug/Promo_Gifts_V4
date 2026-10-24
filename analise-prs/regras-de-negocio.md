# Regras de Negócio — Análise de PRs

**Documento gerado em:** 2026-10-24  
**Sessão:** https://claude.ai/code/session_01Ss1tXZ4cAbxBvdmu95uNPz  
**Aplicado a:** análise dos PRs #2414–#2428 do repo `adm01-debug/Promo_Gifts_V4`

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
| #2414 | BLOQUEADA | dirty (conflitos) |
| #2415 | DECISÃO HUMANA | Rule 8: CI workflow |
| #2417 | DECISÃO HUMANA | Rule 8: CI + edge fn + dirty |
| #2418 | DECISÃO HUMANA | Rule 8: deploy-gates.yml + dirty |
| #2419 | DECISÃO HUMANA | Rule 8: security gate + dirty |
| #2420 | DECISÃO HUMANA | Rule 8: migrations + dirty |
| #2422 | DRAFT (elegível) | sem Rule 8; só falta sair de draft |
| #2424 | DECISÃO HUMANA | Rule 8: DDL + CI workflow |
| #2426 | DRAFT (elegível) | sem Rule 8; só falta sair de draft |
| #2427 | DRAFT (elegível) | sem Rule 8 p/ merge; deploy manual pós-merge |
| #2428 | DECISÃO HUMANA | Rule 8: security policy |
