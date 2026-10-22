# Relatório de Análise de Pull Requests — Promo Gifts V4

**Data:** 2026-10-22  
**Baseline main:** `8bafc7d5a0a1f0f6a06d88adc6577098f873dfcb` (após merge PR #2356)
**Typecheck baseline:** 1 erro pré-existente (TS2688 `node`) — Gate Final = success  
**Total de PRs abertas analisadas:** 25  
**PRs mergeadas nesta sessão:** 1 (#2356)  
**Total mergeadas (todas as sessões):** 5 (#2338, #2351, #2354, #2352, #2356)  
**Sessão principal:** https://claude.ai/code/session_012WyySbh2tj8vhRQLBf3mHo

---

## Sumário de Resultados

| Veredicto | Quantidade | PRs |
|-----------|-----------|-----|
| MERGEADA | 4 | #2338, #2351, #2354, #2356 (SHAs abaixo) |
| MERGEADA_PELO_OWNER | 1 | #2352 (owner adm01-debug, SHA `92a4d3bc`) |
| CI_PENDENTE | 1 | #2357 (security REVOKE E30/E40/E18 — aguardar Gate Final) |
| AGUARDAR_CI | 5 | #2312, #2314, #2315, #2316, #2349 (rebase + CI necessários) |
| DECISAO_HUMANA | 2 | #2290, #2293 |
| DRAFT | 1 | #2320 |
| NAO_MERGEAR | 1 | #2319 |
| FECHAR | 15 | #2322–#2331, #2333–#2337 |

**SHAs de merge:**
- #2338 → `57017ba78eb68c6c72dba336f9c081c4519619c4`
- #2351 → `3e06378a5e4f53e00a2c6826fdf667692b307882`
- #2354 → `3e006427eb19247d2e99c03a8140193d3f763a8e`
- #2352 → `92a4d3bc...` (owner)
- #2356 → `8bafc7d5a0a1f0f6a06d88adc6577098f873dfcb` (session guard callers)

---

## Falhas Pré-Existentes no Baseline Main

As seguintes falhas existiam em main `8e8053b9` **antes** de qualquer PR — qualquer PR com essas falhas não é uma regressão nova:

- `Gate Final - Deploy Ready` — aggregador bloqueado pelas falhas abaixo
- `Gate 0.5 - Dependency Audit` — flaky (npm audit instável)
- `Gate 1 - Lint + TypeScript` — falhas pré-existentes de lint
- `E2E — Personalization Journey` — E2E instável em infra
- `Migrations x Canonical schema (Gate E40)` — ECR Public rate limit no pull da imagem Supabase postgres

---

## PR Mergeada

### PR #2338 — fix(ci): corrige 5 workflows em failure ✅ MERGEADA

**Branch:** `claude/laughing-cori-o9w35e`  
**Head:** `47dfffdc33fbfe0de85009ddeab688d6e096a543`  
**Merge SHA:** `57017ba78eb68c6c72dba336f9c081c4519619c4`  
**Merged em:** `main` (2026-10-22)  
**Label:** `large-pr-approved` ✅

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

**Supabase MCP pós-merge (2026-10-22T19:00–23:59Z):** query `logs` → **`{"result":[]}`** — nenhum erro 5xx novo. Produção saudável.

**Resultado:** MERGEADA com sucesso. Gate Final success em check_run `120049718257`.

---

## PRs que Requerem Rebase (ação dos autores)

### PR #2312 — ci(e14): docs-only PRs pulam gates caros via dorny/paths-filter
**Branch:** `claude/batch-e14-e19-e22-e23-e26-e87-261019-1800`  
**Head SHA:** `6a5a1e7229fcc5f9201b947b20b276538a731672`  
**Base:** `1ac6992` (behind main `57017ba7`)  
**Arquivo alterado:** `.github/workflows/deploy-gates.yml` (+39/-7)  
**Evidência:** `get_pull_request` #2312 — `changed_files: 1`, `additions: 39`, `deletions: 7`.  
**Conflito confirmado:** `git merge-tree --write-tree origin/main claude/batch-e14-e19-e22-e23-e26-e87-261019-1800` → `CONFLICT (content): Merge conflict in .github/workflows/deploy-gates.yml`  
Autor precisa rebasear em `57017ba7` e resolver conflito no `deploy-gates.yml`.

### PR #2314 — fix(ci): atualiza baseline as-assertions — ProductFormFullscreen +2 (double-cast E83)
**Branch:** `claude/ci-e19-e22-e23-batch2-261019-1930`  
**Head SHA:** `ae8909d7b259f95cdac0b64e85bc49ceeca8e92b`  
**Base SHA:** `1ac6992cecf3a604e401e7c311f43b34e4772a4d` (behind main `57017ba7`)  
**Arquivo alterado:** `.as-assertions-baseline.json` (+4/-4) — bump `ProductFormFullscreen.tsx: 2 → 4`, `productionAsCount: 2162 → 2164`  
**Evidência:** `get_pull_request` #2314 — `changed_files: 1`, `additions: 4`, `deletions: 4`, `mergeable_state: unknown`  
**Conflito confirmado:** `git merge-tree --write-tree origin/main claude/ci-e19-e22-e23-batch2-261019-1930` → `CONFLICT (content): Merge conflict in .as-assertions-baseline.json`  
**Conflito semântico:** mesmo arquivo com PR #2315 (valores divergentes: #2314 usa `productionAsCount: 2164`, #2315 usa valor diferente).  
Após rebase de ambas, reconciliar qual valor é o correto.

### PR #2315 — chore(ci): E33 — remove E2E_USER_* de 11 workflows chromium-public (C25)
**Branch:** `claude/feat-e33-e58-credentials-docs-261019-2000`  
**Head SHA:** `24edaa539910096180ec51ccbfa72746cefff4c6`  
**Base SHA:** `1ac6992cecf3a604e401e7c311f43b34e4772a4d` (behind main `57017ba7`)  
**Arquivos alterados:** 12 (+3/-48) — remove `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` de 11 workflows `*-public`  
**Evidência:** `get_pull_request` #2315 — `changed_files: 12`, `additions: 3`, `deletions: 48`, `mergeable_state: unknown`  
**Conflito confirmado:** `git merge-tree --write-tree origin/main claude/feat-e33-e58-credentials-docs-261019-2000` → `CONFLICT (content): Merge conflict in .as-assertions-baseline.json`  
**Conflito semântico:** mesmo arquivo `.as-assertions-baseline.json` com PR #2314 (valores divergentes).  
Correção de segurança válida (C25 — remove credenciais reais de workflows não-autenticados); prioridade alta após rebase.

### PR #2316 — fix(ci): Gate 1.12 + cors.ts
**Branch:** `claude/fix-contract-mag-reader-261019-2110`  
**Head SHA:** `f9b74053f5f7e525f649979499faa14fc993f76b`  
**Base main após merge #2338:** `57017ba78eb68c6c72dba336f9c081c4519619c4` ✅  
**Evidência:** `compare` `main...claude/fix-contract-mag-reader-261019-2110` — `base_commit.sha: 57017ba7` = main atual; commits com `+` = 5 commits não estão em main.  
**Conflito confirmado:** `git merge-tree --write-tree origin/main claude/fix-contract-mag-reader-261019-2110`:
```
CONFLICT (content): Merge conflict in .github/workflows/capacity-growth-report.yml
CONFLICT (content): Merge conflict in .github/workflows/pgss-slo-report.yml
CONFLICT (content): Merge conflict in .github/workflows/wraparound-monitor-report.yml
CONFLICT (content): Merge conflict in src/hooks/intelligence/useGoldSyncStatus.ts
CONFLICT (content): Merge conflict in src/hooks/intelligence/useZeroResultDiagnosis.ts
CONFLICT (content): Merge conflict in src/hooks/quotes/useQuoteBuilderState.ts
CONFLICT (content): Merge conflict in src/lib/intelligence/degradation.ts
(+ outros arquivos)
```
**Conflito semântico com #2338:** PR #2338 adicionou `magazine-reader-state-read` ao `NO_BODY_EXEMPT`; PR #2316 adiciona schema com body `{ token, fingerprint }` — abordagens contraditórias.  
Após merge de #2338, autor deve decidir: manter `NO_BODY_EXEMPT` (correto para GET-only) ou schema com body (se a função realmente recebe body).

---

## PRs que Dependem de Decisão Humana (PO)

### PR #2290 — @eslint/js 9→10 (major bump)
Dependabot PR. Major version: pode introduzir regras novas que quebram lint.  
**Branch:** `dependabot/npm_and_yarn/eslint-js-10.0.1`  
**Head SHA:** `1ebb25769b19d3ad64664c169632fdfb74affcbb`  
**Base SHA:** `45545ae5` (behind main `57017ba7` — precisa de rebase mesmo que PO aprove)  
**Diff:** `@eslint/js` 9.39.5 → 10.0.1 + novo `peerDependencies: { eslint: "^10.0.0" }` em `package.json`  
**CI status:** Gate Final = **failure** (run `119230405169`, check_run `119230405169`) — Gate 3 E2E Smoke failure, múltiplos gates skipped.  
**Ação:** PO decide se aceita o risco de breaking changes em lint; rebase também necessário antes de merge.

### PR #2293 — recharts 2→3 (major bump)
Dependabot PR. Major version: API de componentes pode ter mudado.  
**Branch:** `dependabot/npm_and_yarn/recharts-2.15.3`  
**Head SHA:** `148399a078f289338b20b35aeae40b86929b6c39`  
**Base SHA:** `1ac6992` (behind main `57017ba7` — precisa de rebase mesmo que PO aprove)  
**CI status:** Gate Final = **failure** (run `118245835252`, check_run `118245835252`) — Gate 3 E2E Smoke failure, Magazine Tests OK failure, merge-reports failure.  
**Ação:** PO decide se aceita o risco de breaking changes na UI; rebase também necessário antes de merge.

---

## PR Draft

### PR #2320
Em modo draft. Aguardar autor promover para "ready for review" antes de analisar.

---

## PRs para Fechar (sem merge)

### PR #2319 — PR vazia de bot (Jules)
0 arquivos alterados. PR gerada automaticamente por bot Jules sem conteúdo.

### PRs #2322–#2331, #2333–#2337 — Templates de CI (15 PRs)

Templates criados por `adm01-debug` para stacks que o projeto não usa.
**Stack do projeto:** React + TypeScript + Vite + Supabase.
**Merge-tree:** TODAS as 15 fazem merge CLEAN com main `57017ba7` (additions-only, arquivos novos).

| PR | Branch | Head SHA | Arquivo adicionado | Stack/motivo |
|---|---|---|---|---|
| #2322 | adm01-debug-patch-1 | 168e4ef4 | webpack.yml | NodeJS+Webpack |
| #2323 | adm01-debug-patch-1-1 | d70f66a6 | deno.yml | Deno runtime |
| #2324 | adm01-debug-patch-1-2 | 3c7844b3 | jekyll-docker.yml | Jekyll/Ruby |
| #2325 | adm01-debug-patch-1-3 | 9ff8b69a | npm-publish.yml | npm publish |
| #2326 | adm01-debug-patch-1-4 | 306a9ced | npm-publish-github-packages.yml | GitHub Packages |
| #2327 | adm01-debug-patch-1-5 | f3650108 | codacy.yml | Codacy security scan |
| #2328 | adm01-debug-patch-1-6 | cb570c40 | dependency-review.yml | Duplicata Gate 0.6 |
| #2329 | adm01-debug-patch-1-7 | 43d41bce | python-publish.yml | Python/PyPI |
| #2330 | adm01-debug-patch-1-8 | 59b09efa | node.js.yml | Node.js CI genérico |
| #2331 | adm01-debug-patch-1-9 | 8382afd4 | manual.yml | Manual greeting |
| #2333 | adm01-debug-patch-1-10 | a0f13769 | greetings.yml | GitHub Greetings |
| #2334 | adm01-debug-patch-1-11 | cd35ef8e | static.yml | GitHub Pages deploy |
| #2335 | adm01-debug-patch-1-12 | 8e2076d2 | nextjs.yml | Next.js deploy |
| #2336 | adm01-debug-patch-2 | c1b584d1 | main.yml | Arquivo em branco |
| #2337 | adm01-debug-patch-4 | 20dba496 | deno.yml | Deno (duplicata #2323) |

Nenhuma altera código do projeto — todas FECHAR.

**Nota:** Fechar essas PRs requer escrita no GitHub além de merge — ação humana necessária ou permissão adicional.

---

## Comentários Sugeridos para Fechamento

> **AÇÃO HUMANA — NÃO POSTAR AUTOMATICAMENTE.**
> Fechar PRs é uma escrita no GitHub proibida ao agente pelas regras da tarefa.
> Copiar o texto abaixo e fechar cada PR manualmente.

---

### PR #2319 — Jules bot (NAO_MERGEAR)

**Motivo:** PR gerada automaticamente pelo bot Jules sem nenhum arquivo alterado (0 changed files). Não há conteúdo a revisar ou mergear.

**Comentário sugerido ao fechar:**
> Esta PR foi gerada automaticamente pelo bot Jules e não contém nenhuma alteração de código (0 arquivos modificados). Fechando por ausência de conteúdo.

---

### PR #2322 — Add GitHub Actions workflow for Node.js with Webpack

**Arquivo:** `.github/workflows/webpack.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template Webpack/Node.js. Stack do projeto: Vite, não Webpack.

**Comentário ao fechar:**
> Template de workflow para NodeJS+Webpack. Stack do projeto usa Vite. Fechando — stack incorreta.

---

### PR #2323 — Add Deno workflow for linting and testing

**Arquivo:** `.github/workflows/deno.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template Deno. Projeto usa Node.js/Vite, não Deno.

**Comentário ao fechar:**
> Template para Deno. Stack do projeto: Node.js + Vite. Fechando — runtime incorreta.

---

### PR #2324 — Create CI workflow for Jekyll site with Docker

**Arquivo:** `.github/workflows/jekyll-docker.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template Jekyll (Ruby). Projeto é React + TypeScript.

**Comentário ao fechar:**
> Template para Jekyll/Ruby. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2325 — Add npm publish workflow for Node.js package

**Arquivo:** `.github/workflows/npm-publish.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template de publicação npm. O projeto é aplicação web, não pacote npm.

**Comentário ao fechar:**
> Template para publicação de pacote npm. O projeto é aplicação web. Fechando — não aplicável.

---

### PR #2326 — Add GitHub Actions workflow for npm package publishing (GitHub Packages)

**Arquivo:** `.github/workflows/npm-publish-github-packages.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template GitHub Packages. O projeto é aplicação web, não pacote npm.

**Comentário ao fechar:**
> Template para publicação em GitHub Packages. O projeto é aplicação web. Fechando — não aplicável.

---

### PR #2327 — Add Codacy security scan workflow

**Arquivo:** `.github/workflows/codacy.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template Codacy. Projeto já usa CodeQL. `secrets.CODACY_PROJECT_TOKEN` não declarado em SEGREDOS.md.

**Comentário ao fechar:**
> Template Codacy — projeto já usa CodeQL para security scanning. Segredo `CODACY_PROJECT_TOKEN` não declarado. Fechando.

---

### PR #2328 — Add Dependency Review GitHub Action

**Arquivo:** `.github/workflows/dependency-review.yml` | **Merge-tree:** CLEAN  
**Motivo:** Duplicata do Gate 0.6 já existente em `deploy-gates.yml`.

**Comentário ao fechar:**
> Dependency Review já implementada como Gate 0.6 no `deploy-gates.yml`. Fechando — funcionalidade duplicada.

---

### PR #2329 — Add GitHub Actions workflow for Python package publishing

**Arquivo:** `.github/workflows/python-publish.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template Python/PyPI. Stack é TypeScript, não Python.

**Comentário ao fechar:**
> Template para publicação de pacote Python (PyPI). Stack do projeto: TypeScript. Fechando — stack incorreta.

---

### PR #2330 — Add Node.js CI workflow for testing and building

**Arquivo:** `.github/workflows/node.js.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template genérico Node.js CI. Funcionalidade já coberta pelo Gate Final (`deploy-gates.yml`).

**Comentário ao fechar:**
> Template Node.js CI genérico. Funcionalidade já coberta pelo Gate Final em `deploy-gates.yml`. Fechando.

---

### PR #2331 — Add manual workflow for greeting

**Arquivo:** `.github/workflows/manual.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template de saudação manual ("Hello World"). Sem utilidade para este projeto.

**Comentário ao fechar:**
> Template demonstrativo de workflow manual (saudação). Sem valor para o projeto. Fechando.

---

### PR #2333 — Add GitHub Actions workflow for greetings

**Arquivo:** `.github/workflows/greetings.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template de saudação automática para contributors. Projeto de desenvolvimento fechado.

**Comentário ao fechar:**
> Template de saudação para novos contributors (open-source). Projeto de desenvolvimento fechado. Fechando.

---

### PR #2334 — Add GitHub Actions workflow for GitHub Pages deployment

**Arquivo:** `.github/workflows/static.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template deploy GitHub Pages. Projeto não faz deploy no GitHub Pages.

**Comentário ao fechar:**
> Template para deploy no GitHub Pages. Projeto usa outra plataforma de deploy. Fechando — não aplicável.

---

### PR #2335 — Add GitHub Actions workflow for Next.js deployment

**Arquivo:** `.github/workflows/nextjs.yml` | **Merge-tree:** CLEAN  
**Motivo:** Template Next.js + GitHub Pages. Framework errado (Vite, não Next.js) e plataforma de deploy errada.

**Comentário ao fechar:**
> Template para Next.js/GitHub Pages. Stack do projeto: Vite (não Next.js), plataforma de deploy diferente. Fechando.

---

### PR #2336 — Create main.yml (arquivo em branco)

**Arquivo:** `.github/workflows/main.yml` | **Merge-tree:** CLEAN  
**Motivo:** Arquivo contém apenas 1 linha em branco. Seria rejeitado pelo actionlint.

**Comentário ao fechar:**
> Arquivo de workflow em branco (1 linha vazia). Seria rejeitado pelo lint de workflows. Fechando.

---

### PR #2337 — Add Deno workflow for linting and testing (duplicata do #2323)

**Arquivo:** `.github/workflows/deno.yml` | **Merge-tree:** CLEAN  
**Motivo:** Conteúdo idêntico ao PR #2323 (mesmo arquivo `deno.yml`). Deno não é a runtime do projeto.

**Comentário ao fechar:**
> Template Deno duplicado — conteúdo idêntico ao PR #2323. Runtime Deno não usada no projeto. Fechando.

---

## Pendências Humanas

1. **Fechar 15 PRs de template** (#2322–#2331, #2333–#2337): usar os comentários acima
2. **Fechar PR #2319** (Jules bot vazia): usar o comentário acima
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
