# Regras de Negócio — Análise de PRs (Promo Gifts V4)

**Sessão:** session_012WyySbh2tj8vhRQLBf3mHo  
**Data:** 2026-10-27  
**Repositório:** adm01-debug/Promo_Gifts_V4

---

## 1. Critério de Merge

Para que uma PR seja mergeada autonomamente, TODAS as condições devem ser verdadeiras:

1. **Válida:** A mudança ainda é necessária (não foi implementada de outra forma)
2. **Não implementada:** Conteúdo não está em main (verificado via `git cherry`)
3. **Sem conflito:** `mergeable_state` ≠ `dirty` (sem conflitos de merge)
4. **Gate Final SUCCESS:** Último run do Gate Final nessa PR = `success`
5. **Zero nova falha:** Comparado ao baseline, nenhuma falha nova após merge
6. **Regra de negócio correta:** A mudança não viola REGRAS #1–#10 do CLAUDE.md
7. **Não-destrutiva:** Sem DROP, RENAME, ALTER TYPE, DELETE/UPDATE em massa, DISABLE RLS
8. **Alta confiança:** Evidência completa (SHA, run ID, diff lido)

---

## 2. Regras de Não-Merge (impedimentos absolutos)

### 2.1 Operações proibidas sem aprovação explícita do PO
- Migrations com DDL destrutivo (DROP TABLE/COLUMN, RENAME, ALTER TYPE, TRUNCATE)
- DISABLE ROW LEVEL SECURITY em qualquer tabela
- DELETE ou UPDATE em massa em produção
- Deploy de edge function fora de `.github/workflows/deploy-edge-functions.yml`
- Qualquer escrita no sistema SINGU (read-only para Claude)

### 2.2 Estados de PR que bloqueiam merge
- `state: "draft"` — nunca mergear DRAFT
- Body contém "NÃO MERGEAR" ou "AGUARDANDO APROVAÇÃO"
- `mergeable_state: "dirty"` — conflito presente
- Gate Final = `failure` ou `pending`
- 0 check runs (CI não rodou)

### 2.3 PRs de bots que requerem revisão humana
- `release-please[bot]` — PRs de release automático: NUNCA mergear autonomamente
- `dependabot[bot]` com major version bump: requer decisão do PO
- `github-actions[bot]` com SQL/DDL: requer revisão humana

---

## 3. Projetos Supabase

| Projeto | ID | Uso |
|---|---|---|
| **Gold/Produção (SSOT)** | `doufsxqlfjyuvxuezpln` | IMUTÁVEL — projeto canônico |
| **Proibido** | `pqpdolkaeqlyzpdpbizo` | Nunca referenciar em código executável |

Qualquer PR que altere `CURRENT_PROJECT_ID` ou remova a guarda SSOT em `src/integrations/supabase/client.ts` é **bloqueada** (REGRA #1).

---

## 4. Campos Críticos do Tipo `Product`

O tipo `Product` em `src/types/product-catalog.ts` DEVE conter (REGRA #2):
- `price: number`
- `sale_price?: number`
- `shortDescription: string`
- `category_id?: string`
- `category_name?: string`

PR que remove ou renomeia esses campos sem atualizar TODOS os usos: **bloqueada**.

---

## 5. Schema de Banco de Dados

### 5.1 Tabelas críticas (não podem desaparecer de types.ts)
- `personalization_techniques`
- `products`, `product_variants`
- `suppliers`, `supplier_products_raw`
- `magazines`, `magazine_items`, `magazine_templates`

### 5.2 Caminho único para migrations em produção
`.github/workflows/db-apply-migration.yml` com `workflow_dispatch(version)`.  
Nenhum outro caminho é aceito (REGRA #8/E15).

### 5.3 PR #2622 — ALERTA DE SEGURANÇA
Branch `claude_04/9-rollbacks-manifest` contém `supabase/rollbacks/20261027200000_rollback.sql` com **DISABLE RLS** em 17 tabelas `supplier_stricker.*`. Requer aprovação explícita do PO/Security antes de qualquer merge.

---

## 6. Inventário de PRs — Estado Final (2026-10-27)

### 6.1 PRs Mergeadas pelo Owner durante esta sessão
| PR | SHA Merge | Descrição |
|----|-----------|-----------|
| #2594 | `f2f8c3d6` | Bump actions/setup-node 4→7 |
| #2648 | `ed87db31` | PENDENCIAS.md + schema-snapshot docs |
| #2649 | `61a0cfa1` | fix: e2e admin-critical tests |
| #2650 | `f0689734` | fix(e2e): catalog + kit-builder testid updates |
| #2652 | `22ba938e` | docs(e15): recibo migration 20261027140000 |

### 6.2 PRs com Veredicto por Categoria

**CONFLITO_PENDENTE_REBASE** (Gate OK, só falta rebase):
- #2605 — Test quality fixes (5 arquivos de teste, gate run 40431155697)
- #2622 — 9 rollbacks + manifest (⚠️ ALERTA SEGURANÇA: DISABLE RLS)

**DRAFT** (não mergeável até o autor promover):
- #2580 — DRAFT rollback header E23/E058
- #2631 — DRAFT docs PENDENCIAS/RELATORIO_CI

**DECISAO_HUMANA** (major version bump — requer PO):
- #2587 — zustand 4.5.7 → 5.0.16 (Gate SUCCESS, `mergeable: true`, `behind`)
- #2588 — react-day-picker 8.10.2 → 10.0.2 (Gate FAILURE)

**AGUARDAR_APROVACAO** (requer humano):
- #2420 — Rollback retroativo (body "AGUARDANDO APROVAÇÃO", Gate FAILURE)
- #2645 — E15 receipt migration (substituída por #2652, já mergeada)

**NAO_MERGEAR**:
- #2579 — release-please 1.0.0 (bot automático, base stale)
- #2600 — DRAFT NÃO MERGEAR (89 commits, body "NÃO MERGEAR ESTA PR")

**FECHAR**:
- #2572 — docs sessão Claude anterior (62 arquivos obsoletos)

**CI_FALHOU**:
- #2646 — E058 compliance (Gate FAILURE run 40531570681 + conflito)

---

## 7. Baseline de CI (main SHA `f2f8c3d6` — medido nesta sessão)

| Métrica | Valor |
|---|---|
| Build | ✅ SUCCESS |
| TSC erros | 0 |
| Lint erros | 0 (parcial — ESLint OOM no full run) |
| Testes passando | 8.465 / 8.535 |
| Testes falhando | 3 (pré-existentes, fuso horário BRT vs UTC) |
| Testes pulados | 67 |

**Falhas pré-existentes (não são regressões):**
1. `formatDateTime returns dd/MM/yyyy HH:mm for ISO string (BRT)` — `tests/unit/date-utils.test.ts` (UTC vs BRT)
2. `formatTime returns HH:mm for ISO string` — `tests/unit/date-utils.test.ts`
3. `formatTime zero-pads hours and minutes` — `tests/unit/date-utils.test.ts`

---

## 8. Regra de Ouro — Merge Cross-Agente (REGRA #10/E189)

Seis agentes escrevem neste repo: Claude, Codex, Devin, Lovable, github-actions, cline.  
Merge direto entre branches de agentes diferentes **sem PR é proibido**.  
Branches `claude/*` nunca mergeiam diretamente em `codex/*` ou vice-versa.

---

*Gerado por session_012WyySbh2tj8vhRQLBf3mHo — 2026-10-27*
