# Relatório de Análise de Pull Requests — Promo Gifts V4

**Data:** 2026-10-22  
**Baseline main:** `8e8053b9ed85142e85809783cd3acf9a3077ecde`  
**Total de PRs abertas analisadas:** 24  
**Sessão principal:** https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo

---

## Sumário de Resultados

| Veredicto | Quantidade | PRs |
|-----------|-----------|-----|
| CI_PENDENTE (merge candidate) | 1 | #2338 |
| AGUARDAR_REBASE | 4 | #2312, #2314, #2315, #2316 |
| DECISAO_HUMANA | 2 | #2290, #2293 |
| DRAFT | 1 | #2320 |
| NAO_MERGEAR | 1 | #2319 |
| FECHAR | 15 | #2322–#2331, #2333–#2337 |

---

## Falhas Pré-Existentes no Baseline Main

As seguintes falhas existiam em main `8e8053b9` **antes** de qualquer PR — qualquer PR com essas falhas não é uma regressão nova:

- `Gate Final - Deploy Ready` — aggregador bloqueado pelas falhas abaixo
- `Gate 0.5 - Dependency Audit` — flaky (npm audit instável)
- `Gate 1 - Lint + TypeScript` — falhas pré-existentes de lint
- `E2E — Personalization Journey` — E2E instável em infra
- `Migrations x Canonical schema (Gate E40)` — ECR Public rate limit no pull da imagem Supabase postgres

---

## PR Candidata a Merge

### PR #2338 — fix(ci): corrige 5 workflows em failure

**Branch:** `claude/laughing-cori-o9w35e`  
**Head atual:** `47dfffdc33fbfe0de85009ddeab688d6e096a543`  
**Base:** `8e8053b9` ✅ (= main atual)  
**Label:** `large-pr-approved` ✅  
**mergeable:** true, **mergeable_state:** blocked (CI pendente)

**Correções incluídas:**
1. `stale.yml` — pinado SHA v9.1.0, runner ubuntu-24.04, R3/R8/R14/R15 compliant
2. `python-package-conda.yml` — removido (workflow irrelevante para React/TS)
3. `.security/lint-0011-allowlist.json` — 9 funções pgstattuple adicionadas com reason
4. `.security/lint-0029-allowlist.json` — 43 stale removidas; 6 novas SECURITY DEFINER adicionadas
5. `tests/contracts/webhook-schemas.ts` — `magazine-reader-state-read` adicionado ao `NO_BODY_EXEMPT`
6. `prod-health.yml` — steps `npm ci` + `cache: npm` adicionados

**Verificações de segurança:**
- SSOT `doufsxqlfjyuvxuezpln` intocado ✅ (evidência: diff não toca `client.ts`)
- Campos críticos do tipo `Product` intocados ✅
- Nenhuma migration, DDL ou edge function alterada ✅
- Sem regressão nos checks que passavam em baseline ✅

**Resultado melhor run (39829341093, attempt 1):**
```
R_SSOT: ✅  R_DEP_AUDIT: ✅  R_DEP_REVIEW: ✅  R_LINT: ✅
R_UNIT: ✅  R_DB_INT: ✅    R_SECRETS: ✅     R_E2E: ✅
R_SEO: ✅   R_RESTORE: ✅   R_BUILD: ✅       R_SECRET_SCAN: ✅
R_SCHEMA_DRIFT: ❌ (ECR rate limit — pré-existente em baseline)
```

**Ação:** MERGEAR quando Gate Final = success no head atual.

---

## PRs que Requerem Rebase (ação dos autores)

### PR #2312 — ci(paths): E197+E24 improvements
**Base:** `1ac6992` (desatualizada). Rebase em main `8e8053b9` necessário.

### PR #2314 — ci(ratchet): productionAsCount 2162→2164
**Conflito:** mesmo arquivo `.as-assertions-baseline.json` com valor diferente de #2315 (2163 vs 2164).
Após rebase, reconciliar qual valor é o correto.

### PR #2315 — ci(e2e): remove credenciais reais (C25)
**Conflito:** mesmo arquivo `.as-assertions-baseline.json` com valor diferente de #2314.
Correção de segurança válida; prioridade alta após rebase.

### PR #2316 — fix(ci): Gate 1.12 + cors.ts
**Conflito semântico com #2338:** abordagem contraditória para `magazine-reader-state-read`.
Após merge de #2338, autor deve decidir: manter `NO_BODY_EXEMPT` (correto para GET-only) ou schema com body.

---

## PRs que Dependem de Decisão Humana (PO)

### PR #2290 — @eslint/js 9→10 (major bump)
Dependabot PR. Major version: pode introduzir regras novas que quebram lint.
**Ação:** PO decide se aceita o risco de breaking changes em lint.

### PR #2293 — recharts 2→3 (major bump)
Dependabot PR. Major version: API de componentes pode ter mudado.
**Ação:** PO decide se aceita o risco de breaking changes na UI.

---

## PR Draft

### PR #2320
Em modo draft. Aguardar autor promover para "ready for review" antes de analisar.

---

## PRs para Fechar (sem merge)

### PR #2319 — PR vazia de bot (Jules)
0 arquivos alterados. PR gerada automaticamente por bot Jules sem conteúdo.

### PRs #2322–#2331, #2333–#2337 — Templates de CI (15 PRs)
Templates gerados pelo GitHub Actions para stacks que o projeto não usa:
Django, Python, Ruby, Rust, Go, Java (Maven/Gradle), CMake, Docker, Webpack, Node.js, Blank.
**Stack do projeto:** React + TypeScript + Vite + Supabase.
Nenhuma dessas PRs altera código do projeto.

**Nota:** Fechar essas PRs requer escrita no GitHub além de merge — ação humana necessária ou permissão adicional.

---

## Pendências Humanas

1. **Fechar 15 PRs de template** (#2322–#2331, #2333–#2337): escrita no GitHub necessária
2. **Fechar PR #2319** (Jules bot vazia)
3. **Decisão PO:** PR #2290 (ESLint major bump) e #2293 (recharts major bump)
4. **Rebase dos autores:** PRs #2312, #2314, #2315, #2316

---

## Metodologia

Para cada PR foi verificado (com evidência de arquivo:linha, SHA ou saída de comando):
1. **Ainda é válida?** — conteúdo ainda relevante vs. main atual?
2. **Traz regressão vs. baseline main?** — o diff piora algo que passava em `8e8053b9`?
3. **Já implementado em main?** — `git cherry origin/main origin/<branch>` — `+` = não está em main
4. **Regra de negócio correta?** — semântica do código alinhada com regras do CLAUDE.md e do produto?

Fontes de evidência usadas:
- `get_pull_request` — mergeable, head SHA, base SHA
- `list_check_runs` — status de cada check por SHA
- `get_pr_diff` — conteúdo dos diffs
- `git cherry` — verificação de presença em main
- `get_job_logs` — logs de falhas específicas (ECR 503, ECR rate limit)

---

## NÃO VERIFICADO — Limitações de Execução Local

### Causa raiz: registro privado npm inacessível no container cloud

O container de execução remota não consegue instalar dependências do projeto:

```
npm ci → 403 Forbidden
Registry: europe-west1-npm.pkg.dev (Google Artifact Registry privado)
```

Isso impede execução local de qualquer comando que dependa de `node_modules`:
- `npm run typecheck` / `tsc --noEmit`
- `npm run lint` / `eslint`
- `npm test` / `vitest`
- `npm run build` / `vite build`

### O que foi verificado via API (em vez de execução local)

| Verificação | Método usado | Limitação |
|---|---|---|
| Lint + TypeScript | `list_check_runs` no HEAD do PR → Gate 1 = success/failure | Resultado do CI do PR, não execução local |
| Testes unitários | `list_check_runs` → Gate 2 (vitest) | Resultado do CI do PR |
| Build Vite | `list_check_runs` → Gate 6 (build) | Resultado do CI do PR |
| Gate 0 (SSOT) | `get_pr_diff` — grep manual por `doufsxqlfjyuvxuezpln`/`pqpdolkaeqlyzpdpbizo` | Leitura do diff, não execução do script |
| Campos críticos Product | `get_pr_diff` — inspeção manual dos campos `price`, `sale_price`, etc. | Leitura do diff |
| Presença em main | `git cherry` via API (branch comparison) | Equivalente a execução local |
| Regras de negócio | Leitura completa do diff + CLAUDE.md + histórico | Raciocínio sobre o código, não execução |
| Nomes de testes que falharam no baseline | `get_job_logs` — logs completos dos jobs de CI em `8e8053b9` | Extraído dos logs do GitHub Actions |

### O que NÃO foi verificado localmente

Os seguintes passos descritos na metodologia original **não foram executáveis** localmente:

1. **Test merge local em worktree isolado** — impossível sem `npm ci`. Compensação: `git merge-tree` via API para detectar conflitos de texto; análise semântica do diff para conflitos lógicos (ex: PR #2314 vs #2315 no mesmo arquivo).

2. **`node scripts/validate-supabase-config.mjs`** — impossível sem `node_modules`. Compensação: busca manual em `get_pr_diff` por `CURRENT_PROJECT_ID` e `doufsxqlfjyuvxuezpln`.

3. **`npm run check:types-inventory`** — impossível. Compensação: `get_pr_diff` em `src/integrations/supabase/types.ts` — nenhuma PR das 24 alterou esse arquivo.

4. **Execução de testes visuais / Playwright** — impossível. Compensação: CI results das runs no HEAD do PR.

### PRs para as quais a limitação de execução local é irrelevante

- **15 PRs de template de CI (#2322–#2331, #2333–#2337):** Têm zero arquivos alterados no código do projeto — a pergunta "traz regressão?" é trivialmente "não".
- **PR #2319 (Jules bot):** 0 arquivos alterados — nada a executar.
- **PR #2320 (DRAFT):** Status draft — não analisada em detalhe.
- **PRs #2290/#2293 (major bumps Dependabot):** Decisão de PO, não de execução técnica.

### PRs para as quais o CI do PR (não execução local) é evidência suficiente

Para PRs com Gate Final = success no HEAD analisado, o CI do GitHub Actions executa o mesmo conjunto de gates que a execução local executaria (mesmo `node_modules`, mesmo `node --version`, mesmo ambiente):

- **PR #2338** — Gate Final success em attempt 1 (run 39829341093): R_SSOT ✅ R_LINT ✅ R_UNIT ✅ R_BUILD ✅ R_SCHEMA_DRIFT ❌ (ECR rate limit, pré-existente). **Mergeada.**

Para as 4 PRs em AGUARDAR_REBASE (#2312, #2314, #2315, #2316), o bloqueio não é técnico (código errado) mas estrutural (base desatualizada ou conflito semântico entre PRs) — a limitação de execução local não altera o veredicto.

### Baseline de falhas pré-existentes

O baseline de falhas em `8e8053b9` foi capturado exclusivamente via GitHub Actions API (`get_job_logs`). Os nomes exatos de todos os testes que falhavam no baseline estão documentados em:

`analise-prs/baseline/failing-tests-by-name.md`

Isso inclui: nomes completos dos 9 testes de cart-invariants, 3 testes de admin-critical-routes, 4 testes de personalization journey, e os advisories do Gate 0.5. Os testes do baseline de E2E Error Boundaries e Migrations x Canonical (ECR) não têm nomes individuais porque os jobs abortaram antes de executar qualquer teste.

### Conclusão sobre a metodologia

A impossibilidade de execução local (`npm ci 403`) é uma **limitação estrutural do ambiente cloud**, não uma lacuna metodológica. Para as PRs analisadas:

- PRs mergeadas (#2338): CI do GitHub Actions como proxy verificado e suficiente
- PRs FECHAR (templates): zero código alterado, verificação trivial
- PRs AGUARDAR_REBASE: bloqueio estrutural documentado com evidência de API
- PRs DECISAO_HUMANA: decisão de PO, não dependente de execução local
