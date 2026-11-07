# CI — gates, workflows e testes (referência longa do `AGENTS.md`)

Ler ao tocar `.github/workflows/`, gates, `playwright.config.ts` ou ao investigar CI vermelha. Os títulos
`REGRA #N` vêm da ficha técnica antiga (`CLAUDE.md`) e continuam citados por scripts, workflows e testes.
Se algo aqui divergir da realidade, corrija ESTE arquivo no mesmo PR do fix.

## Gates obrigatórios (required checks em `main`)

Checks required no branch protection de `main` — lista oficial em `.github/required-checks.json` (hoje 5):
**"Gate Final - Deploy Ready"** (`deploy-gates.yml`, agrega todos os gates abaixo), "Compare GitHub × Canonical"
(`edge-functions-drift-check.yml`), "Analyze (javascript-typescript)" (`codeql.yml`), "Gate E23 - Secret Scan
(gitleaks)" (`deploy-gates.yml`) e "Assert Gate Final is required on main". PR que altere um `name:` de job
desses workflows atualiza o JSON junto, senão o Branch Protection Sentinel alerta.

Tipo `job` = job independente no Actions (procure pelo `name:` do job); `step` = passo dentro de um job
agregador (`static-gates`, `drift-gates`, `security-gates` ou `build`; procure pelo `- name:` do step).
`scripts/check-gates-table.mjs` exige que todo step `Gate X.Y` de `deploy-gates.yml` tenha linha nesta tabela.

| Gate | Descrição | Tipo | Bloqueante |
|---|---|---|---|
| Gate 0 | SSOT — ID canônico `doufsxqlfjyuvxuezpln` (`validate-supabase-config.mjs`) | job | sim |
| Gate 0.5 | `npm audit --audit-level high` — sem dependências com CVE high/critical | job | sim |
| Gate 0.6 | Dependency Review — deps com CVE severity ≥ high bloqueiam o PR (E97, PR-only) | job | sim (PR-only) |
| Gate 1 | Lint (ESLint) + TypeScript sem erros — job `static-gates` | job | sim |
| Gate 1.1 | Campos críticos do tipo `Product` presentes (REGRA #2) | step | sim |
| Gate 1.2 | Drift estrutural de `types.ts` (nenhuma tabela/view/function/enum sumiu sem allowlist) | step | sim |
| Gate 1.3 | Contratos de migration (preflight — E15) | step | sim |
| Gate 1.4 | Visual baselines commitados | step | sim |
| Gate 1.5 | Sem "Salvar Alterações" em fluxos de rascunho | step | sim |
| Gate 1.6 | Bundle size dentro dos limites — step dentro do job `build` | step | sim |
| Gate 1.7 | TSC ratchet file guard — baseline não aumenta sem label `ratchet-override` (E41, PR-only) | step | sim (PR-only) |
| Gate 1.8 | Detect accidentally base64-encoded files — texto encodado em base64 acidentalmente | step | sim |
| Gate 1.9 | Dívida técnica — ratchets TODO/FIXME/`as any`/file-size não aumentam | step | sim |
| Gate 1.9.1 | `console.*` baseline — número de chamadas não aumenta sem justificativa | step | sim |
| Gate 1.9.2 | Boundary cross-domain — sem import novo entre `src/pages/*` de domínios diferentes | step | sim |
| Gate 1.10 | indexed-access ratchet — `object[key]` não aumenta (E15: promovido de advisory para bloqueante) | step | sim |
| Gate 1.11 | Workflow contracts `check-workflow-contracts --gate` (C10–C26) | step | sim |
| Gate 1.12 | Contract coverage + soft-delete policy commitada | step | sim |
| Gate 1.13 | RLS policies baseline vs pg_policies live (bloqueante com credenciais) | step | sim |
| Gate 1.13.1 | Tabelas com RLS habilitada e zero policies (deny-all silencioso) — `check-rls-no-policy-drift.mjs --gate` (E045) | step | sim |
| Gate 1.13.2 | Anon-insert rate guard manifest (E049) — 7 tabelas com INSERT anônimo têm trigger de rate guard | step | sim |
| Gate 1.13.3 | Migration receipts (E055) — migrations sem recibo há >24h | step | sim |
| Gate 1.14 | Secrets inventory `check-secrets-inventory --gate` — todos `secrets.*`/`vars.*` documentados em SEGREDOS.md (E40/E98) | step | sim |
| Gate 1.15 | `overflow-x-clip` em MainLayout — regressão visual de layout horizontal | step | sim |
| Gate 1.16 | Quotes list invariants — integridade da listagem de orçamentos | step | sim |
| Gate 1.17 | CODEOWNERS coverage de gate files (E72) | step | sim |
| Gate 1.18 | Ledger de conflitos semânticos (E188) — PRs de agentes diferentes bloqueados sem aprovação | step | sim |
| Gate E23 | Sinalizador `has_e2e` — informa se Gate 3 pode executar testes autenticados | job | não (Gate 3 falhará se for pulado em push ou PR confiável) |
| Gate 2 | Testes unitários (`vitest`) — job `unit-tests` | job | sim |
| Gate 2.5 | Integridade transacional PostgreSQL — job `database-integrity` | job | sim |
| Gate 3 | E2E Smoke (Playwright, chromium) — job `e2e-smoke` | job | sim |
| Gate 4 | Lighthouse CI (performance/acessibilidade) — job `lighthouse` | job | opcional |
| Gate 5 | SEO sanity check — job `seo-sanity` | job | sim |
| Gate 5.5 | RPC `restore_seller_cart` presente no canônico — job `restore-cart-rpc-gate` | job | sim |
| Gate 6 | Build Vite sem erro + SBOM SPDX-JSON + build provenance attestation (E99, push-only) — job `build` | job | sim |

## Quem roda o quê

| Trigger | Workflows principais | Propósito |
|---|---|---|
| **PR** | `deploy-gates.yml` (Gate Final) | Todos os gates obrigatórios — `paths-ignore: docs/**` (E197: PRs só-de-docs ignorados; `AGENTS.md`/`CLAUDE.md` na raiz continuam disparando) |
| **PR** | `workflow-lint.yml` | actionlint + shellcheck |
| **PR** | `required-checks-guard.yml` | Checks fantasmas + divergência required-checks.json |
| **push: main** | `deploy-gates.yml` + `codeql.yml` | Gate Final + scan de segurança |
| **push: main** | `ddl-out-of-band-detector.yml` | Detecta DDL fora do fluxo |
| **schedule (diário)** | `required-checks-guard.yml` | Auditoria de checks |
| **schedule (semanal)** | `codeql.yml` | Scan completo seg 09:33 UTC |
| **schedule (semanal)** | `ddl-out-of-band-detector.yml` | Drift do ledger |
| **schedule (30 min)** | `uptime-monitor.yml` | Health check externo |
| **schedule (10 min) + push: main** | `contexto.yml` | Contexto vivo para agentes na branch `contexto` (código, banco read-only, regras) |
| **workflow_dispatch** | `db-apply-migration.yml` | ÚNICO caminho para migration em prod |
| **workflow_dispatch** | `deploy-edge-functions.yml` | ÚNICO caminho para deploy de edge function |
| **workflow_dispatch** | `schema-snapshot-export.yml` | Gira baseline do drift-check |

## Actions de terceiros permitidas (Settings → Actions, conferido 2026-11-02)

`allowed_actions: selected` — liberadas as do GitHub (`actions/*`, `github/*`) e só estas 8 de terceiros:
`dorny/paths-filter`, `anchore/sbom-action`, `supabase/setup-cli`, `gitleaks/gitleaks-action`,
`denoland/setup-deno`, `oven-sh/setup-bun`, `googleapis/release-please-action`,
`crazy-max/ghaction-github-labeler`. Workflow que usar uma action de terceiro fora dessa lista **nem inicia**
(`startup_failure`, sem log). Foi o que parou o Deploy Gates e 3 dos 5 checks required em 2026-11-02, quando
a lista ficou vazia. Action nova de terceiro = incluir aqui e em Settings → Actions no mesmo PR.

## Regras de workflow (cobradas por `check-workflow-contracts --gate`, Gate 1.11)

Texto completo em `docs/ci/PADRAO_WORKFLOW.md`. Resumo:

- **R1** `permissions:` explícito no topo (`contents: read` mínimo).
- **R2/R17** `concurrency:` com `cancel-in-progress: true` em PR; `false` em push/schedule; em triggers
  mistos: `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- **R3** `timeout-minutes:` em todo job. Classes: estático/lint ≤ 5, unitário ≤ 10, E2E shard ≤ 20,
  E2E full/nightly ≤ 60, cron pesado ≤ 60. `unit-tests` usa 45 (classe "Full job").
- **R4** `node-version-file: .nvmrc` (nunca literal).
- **R5** segredos via `env:` no step, nunca como argumento de CLI.
- **R6/R20** todo `upload-artifact` declara `retention-days:` — 14 padrão, 30 relatórios semanais, 90
  auditoria (com comentário `# E88`).
- **R7** sem `master`/`develop` nos triggers.
- **R8** ID de job em kebab-case e estável (mudar o ID quebra required checks).
- **R9** `persist-credentials: false` em `actions/checkout` com token de escrita.
- **R10** `defaults.run.shell: bash` em workflows com `run:`.
- **R11** `permissions.contents: write` proibido em workflow com trigger `pull_request`; nenhum segredo de
  escrita em job de PR.
- **R12** workflow com `paths:` inclui o próprio `.github/workflows/<self>.yml`.
- **R13** `test-results/` nunca como único path de upload.
- **R14** runner fixo `ubuntu-24.04` (nunca `ubuntu-latest`).
- **R15** actions externas pinadas por SHA de 40 caracteres.
- **R16** `continue-on-error: true` proibido a nível de job em gate bloqueante.
- **R18** `db push` do CLI do Supabase proibido em `run:`.
- **R19** nenhum workflow referencia o ID proibido (legado) `pqpdolkaeqlyzpdpbizo`.

Lint de workflows: `actionlint` + `shellcheck` em `.github/workflows/workflow-lint.yml`. Local:
`npx --yes actionlint .github/workflows/<arquivo>.yml`.

## Inventário de segredos

`docs/ci/SEGREDOS.md` lista todo `secrets.*` e `vars.*` usado nos workflows (Gate 1.14). Segredo novo em
workflow = linha nova nesse arquivo com dono, escopo e rotação.

## REGRA #5 — CI e testes

- `continue-on-error: true` só em checks opcionais (Lighthouse, visual baselines). Gates bloqueantes nunca
  — cobrado pelo contrato C17 de `check-workflow-contracts` (Gate 1.11).
- Projetos Playwright existentes em `playwright.config.ts`: `setup`, `chromium-public`, `firefox-public`,
  `webkit-public`, `chromium-authed`, `firefox-authed`, `webkit-authed`, `mobile-chrome`, `mobile-safari`,
  `chromium-smoke`. Confira a lista atual com `grep "name:" playwright.config.ts` antes de referenciar um
  projeto em workflow.
- Leia o arquivo inteiro de `playwright.config.ts` ou do workflow antes de modificá-lo.

## REGRA #6 — Formato de commit (enforced)

- Hook `.husky/commit-msg` roda `commitlint` (`commitlint.config.js`, base `@commitlint/config-conventional`):
  `tipo(escopo opcional): descrição`.
- Tipos aceitos: `feat`, `fix`, `test`, `refactor`, `chore`, `docs`, `ci`, `build`, `perf`, `style`,
  `hotfix`, `revert`, `merge`.
