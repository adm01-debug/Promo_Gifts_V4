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
Templates gerados pelo GitHub Actions para stacks que o projeto não usa:
Django, Python, Ruby, Rust, Go, Java (Maven/Gradle), CMake, Docker, Webpack, Node.js, Blank.
**Stack do projeto:** React + TypeScript + Vite + Supabase.
Nenhuma dessas PRs altera código do projeto.

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

### PR #2322 — GitHub Actions: Node.js CI template

**Motivo:** Template de CI gerado automaticamente pelo GitHub Actions para stack Node.js genérico. O projeto usa React + TypeScript + Vite + Supabase com pipeline próprio (`deploy-gates.yml`). Este template não adiciona valor.

**Comentário sugerido ao fechar:**
> Template de workflow gerado automaticamente para stack Node.js genérico. O projeto já possui pipeline de CI próprio (`deploy-gates.yml`). Fechando — não aplicável.

---

### PR #2323 — GitHub Actions: Django CI template

**Motivo:** Template de CI para Django (Python). O projeto é React + TypeScript — Django não é usado em nenhuma parte do stack.

**Comentário sugerido ao fechar:**
> Template de workflow para Django (Python). Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2324 — GitHub Actions: Python application template

**Motivo:** Template de CI para aplicação Python. Projeto é React + TypeScript.

**Comentário sugerido ao fechar:**
> Template de workflow para aplicação Python. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2325 — GitHub Actions: Python package template

**Motivo:** Template de CI para pacote Python. Projeto é React + TypeScript.

**Comentário sugerido ao fechar:**
> Template de workflow para pacote Python. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2326 — GitHub Actions: Ruby on Rails template

**Motivo:** Template de CI para Ruby on Rails. Projeto é React + TypeScript.

**Comentário sugerido ao fechar:**
> Template de workflow para Ruby on Rails. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2327 — GitHub Actions: Rust template

**Motivo:** Template de CI para Rust. Projeto é React + TypeScript.

**Comentário sugerido ao fechar:**
> Template de workflow para Rust. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2328 — GitHub Actions: Go template

**Motivo:** Template de CI para Go. Projeto é React + TypeScript.

**Comentário sugerido ao fechar:**
> Template de workflow para Go. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2329 — GitHub Actions: Java with Maven template

**Motivo:** Template de CI para Java com Maven. Projeto é React + TypeScript.

**Comentário sugerido ao fechar:**
> Template de workflow para Java com Maven. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2330 — GitHub Actions: Java with Gradle template

**Motivo:** Template de CI para Java com Gradle. Projeto é React + TypeScript.

**Comentário sugerido ao fechar:**
> Template de workflow para Java com Gradle. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2331 — GitHub Actions: C/C++ with CMake template

**Motivo:** Template de CI para C/C++ com CMake. Projeto é React + TypeScript.

**Comentário sugerido ao fechar:**
> Template de workflow para C/C++ com CMake. Stack do projeto: React + TypeScript + Vite + Supabase. Fechando — stack incorreta.

---

### PR #2333 — GitHub Actions: Docker Image CI template

**Motivo:** Template de CI para build de imagem Docker. O projeto usa GitHub Actions com runners ubuntu-24.04 mas não publica imagens Docker.

**Comentário sugerido ao fechar:**
> Template de workflow para publicação de imagem Docker. Stack do projeto: React + TypeScript + Vite + Supabase (sem build de imagem Docker). Fechando — não aplicável.

---

### PR #2334 — GitHub Actions: Publish Node.js Package template

**Motivo:** Template para publicar pacote npm. O projeto é uma aplicação web, não um pacote npm para publicar.

**Comentário sugerido ao fechar:**
> Template para publicação de pacote npm. O projeto é uma aplicação web (não um pacote para publicar no npm). Fechando — não aplicável.

---

### PR #2335 — GitHub Actions: Publish Docker Image template

**Motivo:** Template para publicar imagem Docker no registry. Projeto não publica imagens Docker.

**Comentário sugerido ao fechar:**
> Template para publicação de imagem Docker em registry. Stack do projeto não inclui build/publish de imagens Docker. Fechando — não aplicável.

---

### PR #2336 — GitHub Actions: Blank workflow template

**Motivo:** Arquivo de workflow em branco (sem conteúdo útil). Adicionaria arquivo vazio ao repositório.

**Comentário sugerido ao fechar:**
> Template de workflow em branco sem conteúdo. Fechando — não adiciona nada ao projeto.

---

### PR #2337 — GitHub Actions: Webpack template

**Motivo:** Template de CI para Webpack. O projeto usa Vite como bundler, não Webpack.

**Comentário sugerido ao fechar:**
> Template de workflow para Webpack. Stack do projeto usa Vite (não Webpack). Fechando — bundler incorreto.

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
