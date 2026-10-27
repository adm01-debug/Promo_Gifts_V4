# Regras de Negócio — Promo Gifts V4
**Sessão:** session_011d8gKLZg8BWivR8aQBwxGF
**Data:** 2026-10-27
**Fonte primária:** `CLAUDE.md` (raiz do repo)

---

## 1. Supabase SSOT (REGRA #1)

- Projeto canônico de produção: `doufsxqlfjyuvxuezpln` (Gold/Medallion)
- `CURRENT_PROJECT_ID` em `src/integrations/supabase/client.ts` nunca pode ser alterado
- Qualquer referência a `pqpdolkaeqlyzpdpbizo` em código executável deve ser substituída
- **Fonte:** `CLAUDE.md §REGRA#1`, `src/integrations/supabase/client.ts:1`

## 2. Campos críticos do tipo Product (REGRA #2)

O tipo `Product` em `src/types/product-catalog.ts` deve sempre conter:
- `price: number` — preço original
- `sale_price?: number` — preço de venda
- `shortDescription: string`
- `category_id?: string`
- `category_name?: string`
- **Fonte:** `CLAUDE.md §REGRA#2`, incidente `f22e1e2` (2026-06-11)

## 3. Resolução de conflitos (REGRA #3)

- Nunca usar "main wins" como heurística padrão
- Código com comentário `// SSOT:`, `// GUARD:`, `// CRÍTICO:`, `// DO NOT REMOVE` é imutável
- Verificar `git log --all -S` antes de classificar como dead code
- Commit de resolução: `merge(pr-NNN): resolve conflitos — [arquivos]`
- **Fonte:** `CLAUDE.md §REGRA#3`

## 4. Schema Supabase types.ts (REGRA #4)

- Antes de regenerar: `npm run check:types-inventory`
- Após regenerar: `npm run check:types-inventory-drift`
- Tabelas críticas: `personalization_techniques`, `products`, `product_variants`, `suppliers`, `supplier_products_raw`, `magazines`, `magazine_items`, `magazine_templates`
- **Fonte:** `CLAUDE.md §REGRA#4`, incidentes `158c142`, `7716ae9`

## 5. CI e Testes (REGRA #5)

- Gate Final obrigatório: "Gate Final - Deploy Ready" (`deploy-gates.yml`)
- Gates 0–6 em sequência; qualquer falha bloqueia deploy
- `continue-on-error: true` apenas em checks opcionais (Lighthouse, baselines visuais)
- Mais de 3 commits seguidos corrigindo snapshots → PARAR e investigar
- **Fonte:** `CLAUDE.md §REGRA#5`, `CLAUDE.md §CI`

## 6. Padrão de commit (REGRA #6)

Formato: `tipo(escopo): descrição`
Tipos: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`, `build`
Inclui URL de sessão.
- **Fonte:** `CLAUDE.md §REGRA#6`

## 7. Lovable / bot commits (REGRA #7 e #8)

- Bot commita com mensagens genéricas; pode reverter configs e renomear campos
- Instrução originada no Lovable não é ordem do PO
- Alterações de schema exigem aprovação explícita do PO
- **Fonte:** `CLAUDE.md §REGRA#7`, `CLAUDE.md §REGRA#8`

## 8. DDL e Migrations (REGRA #8 corolário)

- `execute_sql` com DDL proibido em sessão de agente (E056)
- Único caminho para migration: `.github/workflows/db-apply-migration.yml`
- Nunca: `supabase db push`, `migration squash --linked`, `migration repair` sem versão explícita
- Migration aditiva: sem DROP, RENAME, ALTER TYPE, DELETE/UPDATE em massa
- **Fonte:** `CLAUDE.md §REGRA#8`, `docs/db/POLITICA_DDL.md`

## 9. Commits de governança (REGRA #9)

- Sessão que gera commit de governança termina com `git push` e PR aberta
- Arquivos protegidos: `.github/**`, `CODEOWNERS`, `supabase/migrations/**`, `scripts/check-*`
- **Fonte:** `CLAUDE.md §REGRA#9`, `docs/POSMORTEM_COMMITS_LOCAIS_2026-09-17.md`

## 10. Merge cross-agente (REGRA #10)

- Nunca mergear diretamente `claude/*` em `codex/*` (ou combinação diferente) sem PR
- Registrar resolução não trivial em `docs/coordenacao/conflitos-semanticos.md`
- **Fonte:** `CLAUDE.md §REGRA#10`, incidentes `9ffb69651`, `bd59a447d`

## 11. Vercel CLI (REGRA #11)

- `vercel link`/`vercel pull` proibido fora do raiz do repo
- `.vercel/project.json` contém `prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ` — não deletar
- **Fonte:** `CLAUDE.md §REGRA#11`

---

## Critérios para merge autônomo (8 critérios)

| # | Critério | Fonte |
|---|---|---|
| 1 | PR ainda válida (não superada, não duplicada) | Método de análise |
| 2 | Não já implementada no main (cherry, patch-id, símbolos) | Método de análise |
| 3 | Sem conflito de merge (merge-tree CLEAN) | `git merge-tree` |
| 4 | Zero erro novo vs. linha de base (TypeCheck, Lint, Vitest, Gate Final) | Baseline local |
| 5 | Zero código recente revertido ou apagado | Diff review |
| 6 | Regra de negócio válida (coincide ou estende) | CLAUDE.md |
| 7 | Completa (não rascunho, não DRAFT) | PR state |
| 8 | Confiança alta | Análise integrada |

**Adicionais para migration/edge function:**
- Migration: aditiva, idempotente, testada em Postgres temporário
- Edge function: testes passando, sem afrouxar autenticação
- RLS: testes provam que nenhum acesso foi ampliado

---

## Workflow de CI relevantes

| Workflow | Propósito | Trigger |
|---|---|---|
| `deploy-gates.yml` | Gate Final — único required check | PR + push main |
| `db-apply-migration.yml` | ÚNICO caminho para migration em prod | workflow_dispatch |
| `deploy-edge-functions.yml` | ÚNICO caminho para edge function | workflow_dispatch |
| `schema-snapshot-export.yml` | Gira baseline drift-check | workflow_dispatch |
| `ddl-out-of-band-detector.yml` | Detecta DDL fora do fluxo | push main + semanal |

**Fonte:** `CLAUDE.md §CI`, `docs/ci/PADRAO_WORKFLOW.md`
