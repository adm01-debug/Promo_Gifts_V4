# GitHub Actions — Auditoria exaustiva dos 117 workflows e plano de correções em 100 etapas

Data: 26/09/2026. Base: `main` @ `3c18fa9`. Projeto canônico: `doufsxqlfjyuvxuezpln`. Repo: `adm01-debug/Promo_Gifts_V4` (**público**).

Origem: leitura integral dos 117 arquivos de `.github/workflows/` (16.057 linhas) por 5 auditores em paralelo, cruzada com `playwright.config.ts`, `package.json`, `e2e/fixtures/auth.setup.ts`, `.github/required-checks.json`, `.github/CODEOWNERS`, `.github/dependabot.yml`, scripts referenciados, e com dados vivos da API do GitHub: ruleset de `main`, permissões do Actions, os 14 segredos existentes, 9 environments, 600 runs mais recentes (24/09 22:06 → 26/09 21:06), histórico dos workflows de baixa frequência, alertas de CodeQL/Dependabot/secret scanning, logs de falha dos runs vermelhos. `actionlint 1.7.12` rodou nos 117 arquivos (0 erros de sintaxe — o problema não é sintaxe, é semântica).

Este plano **só planeja**. Nenhum arquivo além deste foi alterado.

---

## 0. Sumário executivo (para decisão de negócio)

1. **A esteira parece verde, mas boa parte dela não testa nada.** Não existe nenhum segredo `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`/`E2E_ADMIN_*` no repositório (14 segredos cadastrados, nenhum deles de E2E). O fixture de login (`e2e/fixtures/auth.setup.ts:41-48`) grava um estado vazio e **passa**; `loginAs`/`requireAuth` fazem `test.skip`. Resultado medido: 35 workflows sem credenciais E2E de 54 totais; desses, **11–15 executam specs que exigem autenticação** e terminam verdes com 0 testes executados (os restantes rodam specs puramente públicos/visuais e são legítimos). É o achado número 1 e atravessa os 5 grupos.
2. **Só 1 check é obrigatório para mergear em `main`** (`Gate Final - Deploy Ready`). Tudo que os outros 116 workflows chamam de "gate" ou "bloqueia merge" é opinativo. O ruleset exige 0 aprovações e o admin tem bypass permanente.
3. **Cinco workflows estão vermelhos ou travados agora**, todos com causa raiz identificada: (a) `Deploy Edge Functions` e `db-apply-migration` falham ao abrir o PR de recibo porque a configuração do repositório proíbe o Actions de criar PRs; (b) por consequência o `db-schema-drift-check` falha diariamente (ledger sem recibo); (c) `SECURITY DEFINER ACL — Multi-Env` e `restore_seller_cart RPC` ficam "pending" todo dia esperando aprovação humana no environment `Production` e são cancelados no dia seguinte; (d) `Kit Coverage — Integration` falha por drift de schema (`capacity_ml` não existe, `permission denied` na view); (e) `CI/CD Pipeline` ficou vermelho em 7 de 11 runs no dia 25–26/09 porque as 2 vulnerabilidades HIGH do `image-size` (via `pptxgenjs`) estão **aceitas em allowlist** dentro do próprio script de auditoria e o npm renumerou os avisos; a PR #1904 atualizou a allowlist e o gate voltou a passar — com as vulnerabilidades ainda presentes (Dependabot #56/#57 abertos).
4. **Segurança:** chave `service_role` do projeto legado vazada em maio (alerta #1 de secret scanning, `publicly_leaked: true`, nunca rotacionada); 62 alertas CodeQL abertos (**38 HIGH** — versão original do plano dizia 35 por erro aritmético: subcategorias somavam 36 e 2 regras foram omitidas: `js/tainted-format-string` e `js/user-controlled-bypass`); 2 Dependabot HIGH; 11 pontos onde bots fazem `git push` em branches (inclusive `main`) com `[skip ci]`, driblando o Gate Final; `lovable-autoheal.yml` comita direto em `main` assinando como o dono do repo.
5. **Custo/ruído:** 29–30 workflows disparam por PR e 36–38 por push em `main`; ~3.100 minutos de cron em 2 dias (dois runs "pending" contam 1.440 min cada); `Uptime Monitor` sozinho é 28 % de todos os runs; `playwright install --with-deps` aparece em 49 workflows; 27 workflows rodam em todo PR sem filtro de caminho.
6. **Dependabot de versões nunca rodou** (config de 10/09; 28 runs, todos de segurança). Ações estão em majors com aviso de depreciação Node 20 em todo job.

O plano abaixo estanca primeiro o que está quebrado hoje (E01–E10), depois torna os gates honestos (E11–E42), depois reduz risco de escrita automática e custo (E43–E93), e fecha com segurança/governança contínua (E94–E100).

---

## 1. Estado medido (26/09)

| Métrica | Valor | Fonte |
| --- | --- | --- |
| Workflows em `.github/workflows/` | 117 (16.057 linhas) + 6 dinâmicos no GitHub | `ls`, `list_workflows` |
| Checks obrigatórios em `main` | 1 (`Gate Final - Deploy Ready`) | ruleset 16764622 |
| Aprovações exigidas / bypass | 0 / RepositoryRole admin `always` | ruleset 16764622 |
| Ruleset `release/*` declarado em `required-checks.json` | **não existe** no GitHub | `list_rulesets` |
| Segredos do repo | 14 (0 de E2E; 0 em environments) | `list_actions_secrets` |
| Segredos referenciados mas inexistentes | 23 nomes em 40+ workflows (E2E_USER_* em 20, E2E_ADMIN_* em 9, VERCEL_TOKEN, CRM_CALLBACK_API_KEY, PGPORT, SENTINEL_SLACK_WEBHOOK, LHCI_GITHUB_APP_TOKEN, …) | scan × API |
| Actions: `can_approve_pull_request_reviews` | `false` → bots não abrem PR | `get_workflow_permissions` |
| Actions: `sha_pinning_required` | `false`; `allowed_actions: all` | `get_actions_permissions` |
| Runs em 2 dias | 600 (schedule 206, push 185, PR 176) | `list_workflow_runs` |
| Workflows por PR / por push em `main` | 29–30 / 36–38 | agrupamento por SHA |
| Minutos em 2 dias | schedule ≈ 3.117 · push 597 · PR 599 | soma de durações |
| Workflows sem run nos últimos 2 dias | 60 de 117 | cruzamento |
| Jobs sem `timeout-minutes` | 44 em 28 arquivos | scan |
| Workflows sem `concurrency` | 59 | scan |
| Workflows com job sem `permissions` | 51 | scan |
| `continue-on-error` em passo de teste/gate real | 27 ocorrências em 26 arquivos | scan |
| Inputs de `workflow_dispatch` interpolados em `run:` | 16 arquivos | scan |
| Triggers em `master`/`develop` (branches mortas) | 26 workflows | scan (`master` parado desde 21/08) |
| Nomes de job duplicados entre arquivos | 9 (`quality-gate`, `test`, `check`, `e2e`, `update` ×3, `update-snapshots` ×4, …) | scan |
| Alertas abertos | CodeQL 62 (HIGH 38) · Dependabot 2 HIGH · Secret scanning 1 | API |
| Cache do Actions | 49 caches, 3,05 GB | API |
| Specs com `toHaveScreenshot` / pastas de baseline commitadas | 81 / 10 | grep + git |
| Ações compostas / `workflow_call` no repo | 0 / 0 | `ls .github/actions` |

---

## 2. Achados que sustentam o plano (com evidência)

### 2.1 Quebrado ou travado agora
- **PR de recibo proibido** — `deploy-edge-functions.yml:268-288` e `db-apply-migration.yml:169-211` fazem `gh pr create` com `GITHUB_TOKEN`; log dos runs 36205266158 e 35857184284: `GitHub Actions is not permitted to create or approve pull requests`. A migration E15 de 23/09 **foi aplicada** (jobs 1–3 ok) e ficou sem recibo → `db-schema-drift-check` (run 36233279910) falha em "Ledger parity" todo dia às 09:30. Mesma causa em `regenerate-supabase-types.yml:152-169` e `schema-snapshot-export.yml:210-241`.
- **Environment `Production` com reviewer obrigatório usado por cron** — `restore-seller-cart-rpc.yml:47` e `security-definer-acl-multi-env.yml:86` (`environment: ${{ matrix.env_name }}`); runs 36232733155/36231645894 com 0 jobs, `pending`; cancelados pelo `concurrency` do dia seguinte desde 23/09. `db-apply-migration.yml:49-62` exige esse reviewer. Os dois desenhos são incompatíveis.
- **`ci.yml` vermelho 7/11 em 25–26/09** por `check:dependency-audit`: as 2 HIGH do `image-size` (CVE-2025-71329/71330, via `pptxgenjs`) estão aceitas em `scripts/check-dependency-audit.mjs:11-14` (`ALLOWED_IMAGE_SIZE_ADVISORIES`) e o npm renumerou os `source` IDs; #1904 atualizou a allowlist e o gate passou de novo (verde na PR #1906). A vulnerabilidade continua (Dependabot #56/#57 abertos); a mitigação é o gate `check-pptx-image-parser-exposure.mjs`. Não é required de qualquer forma.
- **`kit-coverage-integration.yml`** falha diário: `column product_kit_components.capacity_ml does not exist` + `permission denied for view v_kit_component_complete` (run 36213477244).
- **`e2e-crm-callback-approved.yml`** falha diário no guard `CRM_CALLBACK_API_KEY` (segredo nunca criado) e, mesmo com segredo, `:79` usa `--project=chromium-smoke` cujo `testMatch` é `/smoke\.spec\.ts/` → "No tests found".
- **Permanentemente vermelhos e invisíveis** (filtro de caminho estreito, sem cron): `e2e-quote-freight-block` (21/21 runs nunca passou, cancelado no timeout de 15 min), `e2e-quote-item-editor-sheet` (desde 16/07), `e2e-quote-view-no-presentation-mode` (20/07), `e2e-quote-view-sticky` (07/09), `e2e-quotes-responsive` (20/07; `:67-69` grep `\[mobile\]` nunca casa com título `[mobile/…]` → exit 1 sempre), `e2e-pdf-print-cross-browser` (5/6), `stock-module-quality` benchmark (baseline exige `push`, workflow não tem `push` → inerte desde a criação).

### 2.2 "Verde sem fazer nada" (o padrão dominante)
- Raiz: `e2e/fixtures/auth.setup.ts:41-48` grava storageState vazio e passa; `e2e/helpers/auth.ts:88-90` e `e2e/fixtures/test-base.ts:182-186` fazem `test.skip`. Nenhum segredo E2E existe.
- Sem creds mapeadas (0 testes garantido): `cart-invariants-smoke:109-113`, `cart-quality:159-223` (43 specs), `stock-module-quality:158-170`, `stock-future-stock-e2e:70-106`, `stock-dashboard-stress:50-63` (repeat-each=200 de nada), `supplier-comparison:25-31`, `full-ci:124-137`, `playwright.yml:38`, `update-quote-reset-snapshots:33-61`, `ci-quotes-wizard` (5 jobs), `quote-summary-*`, `e2e-pdf-dialog`, `global-search-gate:67-74` (3 navegadores em 23 s).
- Creds mapeadas mas sem guard: `e2e-cart-delete-popover`, `e2e-carts-undo-rpc-atomic`, `stock-rupture-horizon-e2e`, `e2e-color-swatch-grid`, `e2e-swatch-quickview`, `e2e-thumb-quickview`, `e2e-personalization`, `e2e-quote-row-menu-width`, `e2e-quotes-tooltips`, `e2e-discount-approval`.
- Guard que pula em vez de falhar: `e2e.yml:357`, `e2e-flows.yml:90-92` (usa `vars.` enquanto lê `secrets.`), `delivery-quality:34`, `e2e-magazine-header:94-99`, `e2e-quotes-undo:69-77`, `replenishment-quality:63-66` (env em nível de step → `if` sempre falso → gate estrito nunca roda).
- Nomes errados: `ci-freight-quality.yml:116-120` define `E2E_EMAIL`/`E2E_PASSWORD`/`PLAYWRIGHT_BASE_URL` — nenhum é lido por ninguém.
- Só 3 workflows falham alto sem segredo: `e2e-crm-callback-approved:52-65`, `e2e-customization-collapse:46-60`, `e2e-magazine-header:100-108` (único que verifica que existe token `sb-*-auth-token` real).
- Monitores inconclusivos desde a criação: `pgss-slo-report`, `wraparound-monitor-report`, `capacity-growth-report` leem `ops.*` cujas migrations (E40/E33/E30) não têm recibo → verdes, sem dado, desde 16–17/09. `ddl-out-of-band-detector:71-88` colapsa exit 1 e exit 2 em `continue-on-error`.

### 2.3 Gates que não podem falhar
- `freight-quality-gates.yml:286-321` Gate 6 compara `$LINES < 0`; `:96-105` Gate 2 thresholds 0; `:62-64` e `:235-244` `continue-on-error` em lint estrito e E2E.
- `full-ci.yml:58-68` `# exit 1` comentado; `test:ci-core:coverage` com thresholds 0 e 2 arquivos.
- `global-search-gate.yml:32` thresholds 0; `:75-77` lista de quarentena só vira artefato.
- `optimized-image-e2e.yml:41` e `stock-future-stock-e2e.yml:115-120` `--update-snapshots` incondicional → `toHaveScreenshot` nunca falha; `quote-summary-sticky-header-visual.spec.ts:122-135` engole "snapshot doesn't exist" em `try/catch`.
- `lint-untyped-from.yml:39` `continue-on-error` cujo TODO já foi cumprido (script sai 0 hoje); allowlist de 33 tabelas obsoleta.
- `e2e-flows.yml:248` `--project=routes-mobile` não existe + `continue-on-error:254` → job "Mobile Critical Routes" nunca rodou um teste. `:75,158,170` idem sem passo de falha.
- `visual-tests.yml:27` `continue-on-error` em nível de job; `contract-tests.yml:48-57` smoke "advisory ~2 sprints" sem data; `quality-gate.yml:183` drift de types com `continue-on-error`; `e2e-pdf-dialog.yml:181-202` gate de drift sai 0 sem amostra.
- `detect-base64-content.yml:116` `exit $FOUND` (módulo 256).
- `supabase-security-gate.yml:72-76` CHECK 2 chama RPC com a chave **anon** (`SUPABASE_SERVICE_KEY: VITE_SUPABASE_PUBLISHABLE_KEY`) enquanto CHECK 4 afirma que anon não pode → ou falha sempre ou passa sem evidência. `magazine-unit-tests.yml:148-152` e `freight-quality-gates.yml:397-398` aceitam `STATIC_PASS` sem `--require-live`.

### 2.4 Bots escrevendo em branches
- `lovable-autoheal.yml:154,163` — `eslint --fix` comitado **direto em `main`** com `[skip ci]`, autor `adm01-debug` (`:146-147`), para qualquer push de qualquer autor (`:34-38`), lintando só o último commit (`:45,66,75`).
- `e2e.yml:156-304` — resto do T14: em todo push em `main` faz `curl PUT` na Contents API para gravar `docs/redeploy/auto-debug/*` (pasta inexistente) com `contents: write`.
- `visual-tests.yml:54-115` — sem `--project` gera baseline para 9 projetos e comita no head do PR ou em `main` com `[skip ci]` (HEAD sem checks → `Gate Final` nunca reporta).
- 4 updaters de diálogo/ring (`e2e-update-*-snapshots.yml:7-10`) — `push` com `paths` e **sem `branches`** → rodam em qualquer branch, `--update-snapshots` incondicional, `git push` `[skip ci]`.
- `e2e-update-calendar-snapshots.yml:101-112`, `e2e-visual-preview-button.yml:91-137` (tag na mensagem de commit), `e2e-customization-collapse.yml:125-134`, `pdf-visual-regression.yml:59-72` — push em `main`/ref escolhida.
- `update-quote-reset-snapshots.yml:77` — `git commit -m "${{ inputs.commit_message }}"`: texto livre em shell com `contents: write`.
- `e2e-update-quote-conditions-snapshots.yml:102` — `git add e2e/ui/__screenshots__/... || true`: pasta não existe → verde sem nunca comitar (mesmo caminho errado em `e2e-quote-conditions-pr-check.yml:10` e `README.md:245`).

### 2.5 Proteção de branch e checks obrigatórios
- Ruleset `Protect main`: 0 aprovações; `require_code_owner_review` inócuo sem aprovação; bypass admin `always`.
- `required-checks.json` declara ruleset `release` (3 checks) que não existe; os 3 workflows (`ssot-supabase`, `stock-rupture-fuzz`, `magazine-unit-tests`) são `paths`-filtrados → deadlock no primeiro PR para `release/*` que não toque esses caminhos.
- `deploy-gates.yml` Gates 2.5/5.5 exigem segredos → PRs do Dependabot e de forks **sempre** falham o Gate Final; não há guard `dependabot[bot]`.
- Guardas de CLAUDE.md fora do Gate Final: REGRA #2 (`check-product-type-fields`) só em `quality-gate.yml:78-79` e `prod-health`; REGRA #4 (`check:types-inventory-drift`) só em `regenerate-supabase-types.yml`, nunca em PR; `quality-gate.yml:161-183` instala CLI `@latest` não pinado e o passo de drift tem `continue-on-error` (o job passa sempre).
- `required-checks-guard.yml:29` hardcoda `REQUIRED=`; `branch-protection-sentinel.yml:229-256` consulta a flag clássica `protected` (404 hoje) → avisa "NÃO protegida" em todo push; `BRANCH_PROTECTION_SETUP.md:46-48,132` recomenda checks push-only como required e cita job inexistente.

### 2.6 Banco e edge functions
- `db-apply-migration.yml:127-136` `psql -1` (transação única) mas 38 migrations usam `CONCURRENTLY` e 55 têm `BEGIN;/COMMIT;` de topo; preflight não checa; sem `timeout-minutes`, sem `lock_timeout`; `migration repair` (`:143-151`) fora da transação.
- `db-schema-drift-check.yml:40-43,95-116` em PR de migration é vermelho por construção (E15 aplica pós-merge); `:118-124` `db diff --linked` sabidamente não completa (docs E02).
- `delete-orphan-edges.yml:32-36,42-46,50-52` aceita qualquer slug, sem `environment`, com injection.
- `redeploy-rate-limiter-consumers.yml` é um segundo caminho de deploy (viola corolário da REGRA #8) e concorre com `deploy-edge-functions.yml` no mesmo push; nenhum dos dois tem `concurrency`; `deploy-edge-functions.yml:101-104` ignora mudança em `supabase/functions/deno.json`; `:33,237` `vars.SUPABASE_PROJECT_REF` pode redirecionar deploy de produção.
- Produção tocada a partir de PR: `schema-snapshot-export.yml:56-106` (dump completo do schema como artefato público 14 d em todo PR — repo é público), `migration-dry-run.yml:42-46` (DDL de rascunho em prod com `ACCESS EXCLUSIVE`, sem `lock_timeout`), `edge-integration-all.yml:119-153` (fuzz com `service_role` em prod), `ci-freight-quality.yml:129-146` (5.000 requisições em edge functions de prod por PR se `vars.SUPABASE_URL` existir), `freight-quality-gates.yml:27-28,191-198,356-364` (scripts caem em `VITE_SUPABASE_URL` = prod).

### 2.7 Custo, duplicação e higiene
- `npm run build` em 9 workflows, `tsc` em 5, `validate-supabase-config` em 4, `chromium-smoke` em 3, `playwright install --with-deps` em 49; `build-typecheck.yml` e `credentials-audit.yml` são cópias integrais.
- 12 workflows de orçamentos = 31 jobs, cada um com checkout + `npm ci` + install; `e2e-quote-items-table-header` sozinho gerou ~4.100 jobs; 5 deles fazem `npm run build` que ninguém usa (webServer roda `npm run dev`).
- Specs de carrinho rodam até 4× por PR (`cart-invariants-smoke` + `cart-quality` ×3); freight roda 2× (Gates 2/3 vs 9/10).
- `e2e.yml:356-374` regressão = 567 specs × 10 projetos, `workers: 1`, `retries: 5`, timeout 45 → estruturalmente não termina.
- `playwright.config.ts:31` `retries: 5` em CI mascara flakiness em tudo que não passa `--retries`.
- Cron: 06:00 UTC ×5–7, 09:00 ×3–5, 03:00 ×2 (4 jobs de 90 min), tudo com o mesmo PAT do Supabase.
- Node: `'22.22.1'` literal ×61, `.nvmrc` ×68, `'22'`, `'20'` (`ts-unused-ratchet`, abaixo do `engines`), 3 workflows sem `setup-node`; bun sem `setup-node` em 6; `setup-bun@v1/@v2`, `setup-deno@v1/@v2` misturados; `bun-version: latest`.
- Pinagem: `actions/*@v4` (tag) ×300+, SHA só em `github-script`, `gitleaks`, `paths-filter`, `gh-pages`, `labeler`, `download-artifact`. Todo job avisa "Node.js 20 is deprecated … checkout@v4, setup-node@v4, upload-artifact@v4".
- `labels.yml` gerencia 8 labels; automações usam outras 10 não declaradas. `dependabot.yml` nunca produziu run de versão.

### 2.8 O que está bom e deve ser preservado
`deploy-gates.yml` (Gate 0 via `needs`, agregador `if: always()` + `join(needs.*.result)` tratando skipped/cancelled como falha, timeouts em todos os jobs, ref hardcoded); as camadas do E15 (regex → sonda de reviewer → guard de host/pooler → probe READ ONLY → `psql -X -w -1 -v ON_ERROR_STOP=1` → repair → post-check → recibo via PR, CLI 2.101.0); Management API read-only + `pg_catalog` em todas as auditorias desde E12; E41 (`check:types-inventory-drift` sem `continue-on-error`); E42 (hash de bundle + allowlist `verify_jwt`); `drafts:target:check` rejeitando `pqp`; guards duros de `e2e-crm-callback-approved`, `e2e-customization-collapse`, `e2e-magazine-header` (`persist-credentials: false`, verificação de token real, `PLAYWRIGHT_JSON_OUTPUT_NAME`); esqueleto safe-mode (dry-run → classificar → abortar) de `e2e-update-calendar-snapshots:61-99`; passagem de `head_commit.message` por `env:` em `e2e-visual-preview-button:93-94`; desenho do smoke em `e2e.yml` (`PWTEST_FORBID_ONLY`, `--max-failures=1`, passo explícito de falha, `e2e-smoke-coverage-doc.mjs --check`); job mock-auth de `e2e-quotes-undo:144-194` (`E2E_MOCK_AUTH`); `--retries=0` + `--last-failed` (tooltips/undo/discount); cache por versão do Playwright em `pdf-quality:45-65`; dedupe de comentário em `bundle-size-report:50-109`; matriz `include` projeto→navegador em `e2e-pdf-print-cross-browser:37-46`; contêiner `postgres:17.6` hermético em `magazine-unit-tests` e `security-definer-acl-multi-env`; pisos reais de cobertura (stock-future 95/85, supplier 90/85, magazine 58/51/48/56, ci-freight 75); `sentinel-check.sh` com 33 fixtures; template de advisories (github-script SHA-pinado, dedupe por label+prefixo, 90 d); `check-result-contract.mjs` (passed/failed/inconclusive/static-pass).

---

## 3. Como ler e executar

Cada etapa traz **Objetivo · Onde · Como · Aceite · Prova · Depende de · Esforço · Classe**.
- Esforço: `P` ≤ ~100 linhas / 1 sessão; `M` 1–2 sessões; `G` > 2 sessões ou toca serviço externo.
- Classe: **A** = escopo comum (workflow/script/doc) → squash-merge autônomo com CI verde; **B** = CI/segredos/ruleset/environment/prod/custo → PR aberta e PO chamado (regra 8 do fluxo Git); **PO** = decisão de negócio antes de codar.
- Invariantes: uma etapa por PR, diff mínimo, prova = comando + resultado no corpo do PR, nunca `deploy_edge_function`/`apply_migration` por MCP (REGRA #8), nunca remover guarda `// SSOT:` (REGRA #1/#3), nada de `[skip ci]` em commit automático.
- Toda etapa que cria/altera workflow inclui: `permissions:` mínimo no topo, `concurrency:` por ref, `timeout-minutes` em todo job, `node-version-file: .nvmrc`, sem `master`/`develop`, inputs só via `env:`. Isso é o "padrão de higiene" referido abaixo (definido em E12).

### Bloqueios na entrada

| ID | Bloqueio | Estado | Destrava |
| --- | --- | --- | --- |
| B1 | Actions não pode criar PR (`can_approve_pull_request_reviews: false`) | aberto | E01 |
| B2 | Usuário de teste E2E (`E2E_USER_*`, `E2E_ADMIN_*`) não existe em lugar nenhum | aberto | E22 (PO cria usuário; segredo em environment) |
| B3 | Environment `Production` com reviewer ⇄ crons diários no mesmo environment | aberto | E03 |
| B4 | Repo é público com histórico contendo chave `service_role` vazada | aberto | E94, E95 (PO) |
| B5 | Token/App para PRs automáticos (GitHub App ou PAT fine-grained) | aberto | E02 |

---

## Fase 1 — Estancar o que está quebrado hoje (E01–E10)

### E01 — Permitir que o Actions abra PRs (destrava recibos E15/E66)
- Objetivo: `Deploy Edge Functions`, `db-apply-migration`, `regenerate-supabase-types` e `schema-snapshot-export` falham em `gh pr create` ("GitHub Actions is not permitted to create or approve pull requests").
- Onde: Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" (`PUT /repos/.../actions/permissions/workflow`, `can_approve_pull_request_reviews: true`).
- Como: ligar a permissão; manter `default_workflow_permissions: read`.
- Aceite: `workflow_dispatch` de `deploy-edge-functions.yml` com `dry_run` + job de recibo abre o PR.
- Prova: run citado com job "Registrar recibo do deploy (E66)" verde e link do PR.
- Depende de: —. Esforço: P. Classe: **B** (configuração do repositório).

### E02 — Token de App para PRs automáticos (para que os PRs de bot recebam CI)
- Objetivo: PRs criados com `GITHUB_TOKEN` não disparam `pull_request` → `Gate Final` nunca reporta → PR de recibo fica inmergeável. `regenerate-supabase-types.yml:100-115,152-164` ainda tenta editar workflow (exige `workflows: write`, impossível com `GITHUB_TOKEN`).
- Onde: GitHub App própria (permissões `contents: write`, `pull_requests: write`, `workflows: write`) + segredos `APP_ID`/`APP_PRIVATE_KEY`; `actions/create-github-app-token` (SHA-pinado) nos 4 workflows acima.
- Como: trocar `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` pelo token da App só no passo `gh pr create`/`git push` de recibo.
- Aceite: PR de recibo aparece com `Gate Final - Deploy Ready` executado.
- Prova: PR de recibo mergeada sem bypass de admin.
- Depende de: E01. Esforço: M. Classe: **B** (segredo novo).

### E03 — Environment `production-readonly` para crons de leitura
- Objetivo: `restore-seller-cart-rpc.yml:47` e `security-definer-acl-multi-env.yml:86` ficam `pending` todo dia esperando reviewer (runs 36232733155/36231645894, 0 jobs) e são cancelados no dia seguinte; `db-apply-migration.yml:49-62` precisa do reviewer em `production`.
- Onde: novo environment `production-readonly` (mesmos segredos de leitura, sem reviewer); os 2 workflows passam a usar `environment: ${{ matrix.env_name == 'production' && 'production-readonly' || matrix.env_name }}` ou matriz com o nome novo.
- Como: criar environment via API; mover segredos de leitura; atualizar as matrizes; manter `production` exclusivo para escrita (E15, deploys).
- Aceite: os 2 crons completam no mesmo dia com jobs executados.
- Prova: 2 runs de `schedule` com `conclusion: success` e passos reais (não `skipped`).
- Depende de: —. Esforço: M. Classe: **B** (environment/segredos).

### E04 — Recibo retroativo da migration 20260923114500 e fim do "Ledger parity" vermelho
- Objetivo: `db-schema-drift-check` falha diário (run 36233279910) porque a E15 de 23/09 aplicou e não gravou recibo (run 35857184284, job 4).
- Onde: `supabase/MIGRATIONS_SYNC_LOG.md`; `scripts/append-migration-receipt.mjs`.
- Como: PR manual com a linha de recibo (run, versão, data) exatamente como o script geraria; verificar com `npm run check:migrations-sync-log` (ou o gate equivalente) local.
- Aceite: `db-schema-drift-check` (job "Migrations x Canonical schema") verde no próximo cron.
- Prova: run verde citado.
- Depende de: —. Esforço: P. Classe: A.

### E05 — Fechar as 2 vulnerabilidades HIGH do `image-size` em vez de aceitá-las por allowlist
- Objetivo: `scripts/check-dependency-audit.mjs:11-14` aceita explicitamente GHSA-5p2g/GHSA-w3rx (`image-size ≤2.0.2`, transitiva de `pptxgenjs`); toda renumeração do npm (como em 26/09) derruba o `CI/CD Pipeline` e a allowlist é reajustada à mão (#1904), enquanto Dependabot #56/#57 seguem abertos. A allowlist não tem data de expiração nem dono.
- Onde: `package.json`/`package-lock.json` (`overrides` para `image-size@>=2.0.3`, verificando compatibilidade com o `pptxgenjs` 4.x; se incompatível, avaliar bump do `pptxgenjs`); `scripts/check-dependency-audit.mjs` (remover a entrada ou dar `expiresAt` + `owner`); `tests/scripts/check-dependency-audit.test.mjs`.
- Como: `npm audit` local → override → `npm run check:dependency-audit` (sem a allowlist) → `npm run check:pptx-image-parser-exposure` → `npm run build` e `npm run test:ci-core`; se o override for inviável, manter a aceitação mas com expiração de 90 dias que faz o gate falhar quando vencer.
- Aceite: `npm audit --audit-level=high` sem findings **ou** aceitação datada com dono; alertas #56/#57 fechados ou dispensados com justificativa.
- Prova: run verde + link dos alertas fechados.
- Depende de: —. Esforço: P. Classe: A.

### E06 — `kit-coverage-integration.yml`: alinhar teste com schema/grants reais
- Objetivo: falha diária `column product_kit_components.capacity_ml does not exist` e `permission denied for view v_kit_component_complete` (run 36213477244).
- Onde: `src/lib/external-db/kit-coverage.integration.test.ts`; diagnóstico via `pg_catalog` (REGRA #8): colunas de `product_kit_components`, `has_table_privilege` da view para o papel usado.
- Como: primeiro ler o estado real (query read-only via Management API); se a coluna foi renomeada/removida por migration aprovada → ajustar o teste; se a view perdeu GRANT → migration nova via E15 (Classe B). Não "consertar" o teste sem saber qual lado está certo.
- Aceite: cron verde 2 dias seguidos.
- Prova: query `pg_catalog` no PR + run verde.
- Depende de: —. Esforço: M. Classe: A (teste) / **B** (se precisar DDL).

### E07 — `e2e-crm-callback-approved.yml`: projeto certo + decisão sobre o segredo
- Objetivo: falha diária no guard `CRM_CALLBACK_API_KEY` (segredo nunca criado) e `:79` `--project=chromium-smoke` (testMatch `/smoke\.spec\.ts/` → "No tests found").
- Onde: `.github/workflows/e2e-crm-callback-approved.yml:52-65,79`; guard também deve exigir `V4_CALLBACK_URL` (spec cai na função de produção sem ele).
- Como: `--project=chromium-public`; PO decide: (a) criar `CRM_CALLBACK_API_KEY` + `V4_CALLBACK_URL` em `production-readonly`, ou (b) desligar o `schedule` e manter só `workflow_dispatch` até existir. Nunca "skip verde".
- Aceite: cron verde com testes executados **ou** cron removido com nota no header.
- Prova: run citado com contagem de testes > 0.
- Depende de: E03. Esforço: P. Classe: **PO** (segredo do CRM).

### E08 — Retirar o resto do T14 de `e2e.yml` (escrita em `main` a cada push)
- Objetivo: `e2e.yml:156-304` faz `curl PUT` na Contents API para `docs/redeploy/auto-debug/*` (pasta inexistente) em todo push em `main`, com `contents: write` (`:21-22`).
- Onde: `.github/workflows/e2e.yml:21-22,156-304`; referências a `docs/redeploy/T14-*`.
- Como: remover o bloco e a permissão `contents: write` (o único outro escritor é o publish em gh-pages → ver E91); manter smoke/header-sticky intactos.
- Aceite: nenhum passo de `e2e.yml` escreve no repositório; `permissions` só `contents: read` (+ `pages` se mantido).
- Prova: diff + run verde de push em `main`.
- Depende de: —. Esforço: P. Classe: A.

### E09 — `lovable-autoheal.yml` deixa de comitar em `main`
- Objetivo: `:154,163` comita `eslint --fix` direto em `main` com `[skip ci]`, autor humano (`:146-147`), para qualquer push (`:34-38`), lintando só `HEAD~1` (`:45,66,75`) → bypass do Gate Final, SSOT, sentinel e gitleaks.
- Onde: `.github/workflows/lovable-autoheal.yml`.
- Como: (1) gate no autor `gpt-engineer-app[bot]`; (2) usar `github.event.before` como o sentinel; (3) criar branch `autoheal/<sha>` + PR via token da App (E02), identidade `github-actions[bot]`, sem `[skip ci]`; (4) restringir `eslint --fix` às 3 regras do header com `--rule`.
- Aceite: push do Lovable com erro de lint gera PR, não commit em `main`.
- Prova: PR gerada em ambiente de teste (`workflow_dispatch` com `target_sha`).
- Depende de: E02. Esforço: M. Classe: A.

### E10 — Cron de segurança para workflows vermelhos invisíveis
- Objetivo: `e2e-quote-freight-block`, `e2e-quote-item-editor-sheet`, `e2e-quote-view-no-presentation-mode`, `e2e-quote-view-sticky`, `e2e-quotes-responsive`, `e2e-pdf-print-cross-browser` estão vermelhos há 2+ meses sem ninguém ver (filtro de caminho estreito, sem cron).
- Onde: um workflow novo `nightly-focused-e2e.yml` (`schedule` semanal, `workflow_dispatch`) que chama por `workflow_call`/`gh workflow run` os workflows focados, ou (preferido, ver E85) o `e2e-focused.yml` consolidado com `schedule`.
- Como: até a consolidação, adicionar `schedule: '23 4 * * 1'` nesses 6 e abrir issue deduplicada (template dos advisories) em falha.
- Aceite: os 6 aparecem na lista de runs toda semana; falha gera 1 issue, não 6.
- Prova: primeiro run semanal citado.
- Depende de: —. Esforço: P. Classe: A.

---

## Fase 2 — Fundação: padrão de higiene, ações reutilizáveis, lint de workflow (E11–E20)

### E11 — `actionlint` + `shellcheck` como gate em PR que toque `.github/**`
- Objetivo: nada valida workflows hoje (0 achados de sintaxe, mas `routes-mobile`, `config-path` inválido, `secrets.SUPABASE_PROJECT_ID` único, `with:` inexistente passariam por um lint semântico + `--list` do Playwright).
- Onde: novo `.github/workflows/workflow-lint.yml` (paths `.github/**`, `playwright.config.ts`); `scripts/check-workflow-contracts.mjs` novo.
- Como: `rhysd/actionlint` (SHA-pinado, com shellcheck); script Node que valida: todo `--project=` existe em `playwright.config.ts`; todo `node scripts/x` / `npm run x` / spec citado existe; nenhum nome de job duplicado entre arquivos; nenhum `${{ inputs.* | github.event.inputs.* | github.head_ref | github.event.*.title/body }}` dentro de `run:`; todo job tem `timeout-minutes`; todo arquivo tem `permissions` e `concurrency`; nenhum trigger em `master`/`develop`. Começa em modo relatório com allowlist datada e vira gate em E20.
- Aceite: PR que introduz `--project=inexistente` fica vermelho.
- Prova: teste mutante em `tests/scripts/check-workflow-contracts.test.mjs`.
- Depende de: —. Esforço: M. Classe: A.

### E12 — Documento "padrão de higiene de workflow" + template
- Objetivo: 51 arquivos sem `permissions`, 59 sem `concurrency`, 44 jobs sem timeout, 61 literais de Node, 26 triggers em branches mortas — não há referência única.
- Onde: `docs/ci/PADRAO_WORKFLOW.md` (novo) + `.github/workflows/_template.yml` comentado.
- Como: documentar as 8 regras (permissions read no topo; concurrency `${{ github.workflow }}-${{ github.ref }}` com `cancel-in-progress` só em PR; timeout em todo job; `node-version-file: .nvmrc`; inputs via `env:`; `retention-days` ≤ 14 salvo evidência; sem `master`/`develop`; nome de job único e estável). Vincular ao E11.
- Aceite: doc mergeado e citado no CLAUDE.md (seção CI).
- Prova: link.
- Depende de: —. Esforço: P. Classe: A.

### E13 — Ação composta `.github/actions/setup-node-ci`
- Objetivo: checkout+setup-node+`npm ci` copiado ~100×; `node_modules` cacheado com `restore-keys` parcial em `freight-quality-gates:44-54` (risco de tree obsoleta); `full-ci` cacheia 2×.
- Onde: `.github/actions/setup-node-ci/action.yml` (inputs `install: true|false`, `ignore-scripts`).
- Como: `setup-node` com `node-version-file: .nvmrc` + `cache: npm`; `node scripts/check-lockfile-sync.mjs`; `npm ci --no-audit --no-fund`. Migrar primeiro `deploy-gates.yml`, `ci.yml`, `quality-gate.yml`.
- Aceite: os 3 workflows usam a ação; tempo de setup igual ou menor.
- Prova: comparação de duração antes/depois no PR.
- Depende de: E12. Esforço: M. Classe: A.

### E14 — Ação composta `.github/actions/e2e-setup`
- Objetivo: `playwright install --with-deps` em 49 workflows, 10 de 24 sem cache, 2 formatos de chave de cache, 9 "start Vite + curl" manuais, install de 3 engines em jobs de 1 navegador.
- Onde: `.github/actions/e2e-setup/action.yml` (inputs `browsers`, `start-vite`, `require-auth`, `mock-auth`).
- Como: usa E13; cache `~/.cache/ms-playwright` por versão do Playwright (padrão de `pdf-quality:45-65`); instala só `browsers`; `npm run e2e:generate-fixtures`; opcional Vite em background com wait; `require-auth: true` → falha se `E2E_USER_*` vazio e roda `--project=setup`; `mock-auth: true` → `scripts/e2e-mock-auth-setup.mjs`.
- Aceite: 5 workflows migrados (`e2e.yml`, `e2e-flows.yml`, `e2e-personalization.yml`, `e2e-thumb-quickview.yml`, `e2e-swatch-quickview.yml`) sem mudança de resultado.
- Prova: runs verdes citados + diff de linhas removidas.
- Depende de: E13. Esforço: M. Classe: A.

### E15 — Bump das ações para majors atuais e pinagem por SHA
- Objetivo: todo job avisa depreciação Node 20 (`checkout@v4`, `setup-node@v4`, `upload-artifact@v4`); pinagem mista (tag vs SHA); `sha_pinning_required: false`.
- Onde: todos os 117 arquivos; Settings → Actions (`sha_pinning_required`).
- Como: um PR mecânico (script `sed` revisado) para `actions/checkout`, `setup-node`, `upload-artifact`, `download-artifact`, `cache`, `github/codeql-action`, `supabase/setup-cli`, `oven-sh/setup-bun` (unificar v2), `denoland/setup-deno` (unificar v2) → SHA + comentário `# vX.Y.Z`; depois ligar `sha_pinning_required` no repo; deixar Dependabot `github-actions` manter (E97).
- Aceite: 0 avisos de Node 20 nos logs; `actionlint` verde; `sha_pinning_required: true`.
- Prova: run de `deploy-gates.yml` sem `##[warning] Node.js 20`.
- Depende de: E11. Esforço: M. Classe: **B** (configuração do repositório para o flag; PR em si é A).

### E16 — Remover `master`/`develop` dos triggers e decidir o destino de `master`
- Objetivo: 26 workflows disparam em `master` (parado em 21/08, 57 commits atrás) e `develop` (inexistente).
- Onde: os 26 arquivos; branch `master`.
- Como: PR mecânico removendo os dois nomes; PO decide apagar `master` (recomendado) ou renomear para `archive/master-20260821`.
- Aceite: `grep -l "master\|develop" .github/workflows` = 0; branch tratada.
- Prova: grep no PR.
- Depende de: —. Esforço: P. Classe: A (workflows) / **PO** (branch).

### E17 — `permissions`, `concurrency` e `timeout-minutes` em todos os arquivos
- Objetivo: 51/59/44 lacunas medidas; `deploy-gates.yml` (o required) sem `concurrency`.
- Onde: todos os arquivos sem os campos; `deploy-gates.yml` com `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- Como: PR mecânico por grupo (core, db, e2e, quotes, cart/stock); timeouts realistas (2–5 min em jobs estáticos; ≤ 30 em E2E; ≤ 15 em E15 `apply`); `concurrency` **não cancelável** em escritas (deploy, migration, receipts).
- Aceite: script de E11 reporta 0 lacunas.
- Prova: saída do script.
- Depende de: E11. Esforço: M. Classe: A.

### E18 — `.nvmrc` como única fonte de versão de Node
- Objetivo: `'22.22.1'` ×61, `'22'`, `'20'` (`ts-unused-ratchet.yml:23`, abaixo de `engines`), `NODE_VERSION` ×10, 3 workflows sem `setup-node` (`edge-functions-drift-check:281`, `auth-fuzz-weekly:23`, `replenishment-quality`), 6 bun sem Node.
- Onde: todos; `.npmrc` com `engine-strict=true`.
- Como: `node-version-file: .nvmrc` em todo `setup-node`; adicionar `setup-node` onde `node` roda sem ele; `engine-strict` para falhar cedo.
- Aceite: `grep -c "node-version: '" .github/workflows/*` = 0.
- Prova: grep.
- Depende de: E13. Esforço: P. Classe: A.

### E19 — Espalhar os crons (jitter) e concentrar o PAT
- Objetivo: 06:00 UTC ×5–7, 09:00 ×3–5, 03:00 ×2 (4 jobs de 90 min), Monday 09:00 ×5; todos usam o mesmo `SUPABASE_ACCESS_TOKEN` (rate limit da Management API).
- Onde: `daily-flows-simulation`, `gitleaks-history-audit`, `magazine-flakiness`, `supabase-linter-gate`, `e2e-crm-callback`, `log-login-fuzz`, `schema-snapshot-export`, `required-checks-guard`, `edge-functions-drift-check`, `security-definer-acl-multi-env`, `codeql`, `capacity-growth-report`, `stock-dashboard-stress`, `kit-coverage-integration`.
- Como: tabela de horários em `docs/ci/PADRAO_WORKFLOW.md` (minuto = hash do nome mod 50 + 5; nunca :00/:30); crons de Supabase separados por ≥ 10 min.
- Aceite: nenhum minuto com > 1 cron que use `SUPABASE_ACCESS_TOKEN`.
- Prova: tabela gerada por script no PR.
- Depende de: E12. Esforço: P. Classe: A.

### E20 — `workflow-lint.yml` vira gate (allowlist zerada)
- Objetivo: fechar E11 depois que E13–E19 limparem o backlog.
- Onde: `.github/workflows/workflow-lint.yml`; `deploy-gates.yml` Gate 1 chama `node scripts/check-workflow-contracts.mjs` quando `.github/**` mudou.
- Como: remover allowlist; incluir no Gate Final (barato, sem rede).
- Aceite: PR com violação fica vermelho no `Gate Final`.
- Prova: PR de teste.
- Depende de: E11, E13–E19. Esforço: P. Classe: A.

---

## Fase 3 — Acabar com o "verde sem fazer nada" (E21–E32)

### E21 — `auth.setup.ts` em modo estrito no CI
- Objetivo: `e2e/fixtures/auth.setup.ts:41-48` grava storageState vazio e passa; `loginAs`/`requireAuth` fazem `test.skip`. É a raiz de ≥ 30 gates vazios.
- Onde: `e2e/fixtures/auth.setup.ts`, `e2e/helpers/auth.ts:88-90`, `e2e/fixtures/test-base.ts:182-186`.
- Como: se `CI=true` e `E2E_MOCK_AUTH` não estiver ligado e `E2E_USER_*` faltar → `throw` no setup (falha, não skip); manter caminho brando só fora do CI. Verificar token `sb-*-auth-token` real após login (padrão de `e2e-magazine-header:100-108`).
- Aceite: rodar `--project=chromium-authed` no CI sem segredo falha em < 30 s com mensagem clara.
- Prova: run de teste vermelho citado + teste unitário do fixture.
- Depende de: —. Esforço: P. Classe: A.

### E22 — Criar o usuário E2E e os segredos em environment
- Objetivo: nenhum `E2E_USER_*`/`E2E_ADMIN_*` existe; 20 + 9 workflows os referenciam.
- Onde: Supabase Auth do projeto canônico (usuário dedicado `e2e.user@…`, papel mínimo; `e2e.admin@…` se os specs admin forem mantidos); segredos em `production-readonly` (E03) e como Dependabot secrets se necessário (E59).
- Como: PO cria o usuário (ou aprova criação via Auth Admin API); segredos gravados via API; nenhum workflow lê `secrets.E2E_*` sem `environment`.
- Aceite: `e2e-magazine-header.yml` (verificação de token real) verde com testes executados.
- Prova: run com contagem `expected > 0` no JSON do Playwright.
- Depende de: E03, E21. Esforço: M. Classe: **PO** (usuário em produção) + **B** (segredos).

### E23 — Job reutilizável `secrets-check` + gate de "mínimo de testes executados"
- Objetivo: mesmo com E21, workflows sem creds mapeadas passam por não rodar nada; PR de fork nunca terá segredos.
- Onde: `.github/workflows/_secrets-check.yml` (`workflow_call`, outputs `has_e2e`, `has_admin`); passo pós-Playwright `node scripts/check-playwright-min-executed.mjs test-results/results.json --min 1` (falha se `stats.expected == 0`).
- Como: jobs autenticados usam `if: needs.secrets.outputs.has_e2e == 'true'` (aparecem como **skipped**, nunca verdes vazios); em `push: main` o skip vira falha.
- Aceite: sem segredo o job aparece "skipped"; com segredo e 0 testes o job falha.
- Prova: 2 runs citados.
- Depende de: E21. Esforço: M. Classe: A.

### E24 — Mock-auth como padrão de PR para os fluxos mockáveis
- Objetivo: só `e2e-quotes-undo.yml:144-194` usa `E2E_MOCK_AUTH`; PRs de fork/Dependabot nunca executam E2E autenticado.
- Onde: `e2e/helpers/mock-auth.ts`, `scripts/e2e-mock-auth-setup.mjs`; specs de carrinho (`mockSellerCartsAPI` já existe), orçamentos, estoque.
- Como: mapear por spec o que aceita mock (rota interceptada) vs o que precisa de dado real; PR = mock; `push: main` + nightly = credencial real.
- Aceite: ≥ 20 specs autenticadas rodam em PR de fork com `E2E_MOCK_AUTH=1`.
- Prova: run de PR sem segredo com `expected ≥ 20`.
- Depende de: E14, E23. Esforço: G. Classe: A.

### E25 — Corrigir nomes de variáveis e `--project` errados
- Objetivo: `ci-freight-quality.yml:116-120` (`E2E_EMAIL`/`E2E_PASSWORD`/`PLAYWRIGHT_BASE_URL` não lidos por ninguém); `e2e-flows.yml:90-92` lê `vars.E2E_USER_EMAIL` e passa `secrets.`; `e2e-flows.yml:248` `--project=routes-mobile`; sem `--project` em `e2e-cnpj:45`, `ci-freight-quality:114`, `delivery-quality:35`, `supplier-comparison:31`, `stock-dashboard-stress:60`, `replenishment-quality:45`, `e2e-quotes-responsive:62-63`, `visual-tests:54`.
- Onde: os 10 arquivos.
- Como: `E2E_USER_*`/`E2E_BASE_URL`; `--project=chromium-public|chromium-authed|mobile-chrome` conforme spec; E11 passa a detectar.
- Aceite: `check-workflow-contracts` sem achado de projeto; jobs afetados executam testes (> 0).
- Prova: runs citados.
- Depende de: E11. Esforço: P. Classe: A.

### E26 — `replenishment-quality.yml`: env em nível de job e gate estrito real
- Objetivo: `:63-66,189-191` `if: env.E2E_USER_EMAIL != ''` com env definido só no step → sempre falso → "gate estrito 4px" nunca rodou; `:42-56,175-181` `continue-on-error` + `--pass-with-no-tests`; sem `setup-node`; `setup-bun@v1`; lint = tsc baseline 2×; integração consulta prod em todo PR (`:32-37`).
- Onde: `.github/workflows/replenishment-quality.yml`.
- Como: usar E14 (`require-auth`), env no job, remover `continue-on-error`/`--pass-with-no-tests` dos passos de teste, timeouts nos jobs `audit` e `card-parity-matrix`, integração live só em `push: main`.
- Aceite: gate estrito aparece executado no log; sem creds → skipped.
- Prova: run citado.
- Depende de: E14, E23. Esforço: M. Classe: A.

### E27 — `cart-invariants-smoke` e `cart-quality`: um dono para as specs de carrinho
- Objetivo: 6 specs rodam até 4× por PR sem creds (0 testes); `cart-quality:159-223` 43 specs verdes vazias; `cart-header-quality-gate` fuzz 2× e `rls-integration` "skip-graceful"; `push` com paths menor que PR.
- Onde: os 3 workflows.
- Como: `cart-invariants-smoke` mantém só invariantes (mock-auth em PR); `cart-quality` mantém unit/fuzz + `required-checks-drift`, remove a execução E2E duplicada; `cart-header-quality-gate` emite `::warning` + summary quando RLS pula e exige `TEST_SELLER_*_JWT` em `push: main`.
- Aceite: cada spec de `e2e/carrinhos` roda exatamente 1× por PR.
- Prova: contagem no run.
- Depende de: E23, E24. Esforço: M. Classe: A.

### E28 — Stock: `stock-module-quality`, `stock-future-stock-e2e`, `stock-dashboard-stress`, `supplier-comparison`
- Objetivo: benchmark sem baseline desde a criação (`stock-module-quality:104-137` exige `push`, workflow não tem; `:21` filtra `scripts/stock-benchmark.mjs` inexistente); `stock-future-stock-e2e:115-120` `--update-snapshots`; `:100-101` `contents: write` sem uso; `stock-dashboard-stress` repeat-each=200 de skips; `supplier-comparison` 0 testes visuais.
- Onde: os 4 arquivos.
- Como: `push: main` para publicar baseline; corrigir path; remover `--update-snapshots` e `contents: write`; creds via E14; `--project` correto; timeout/permissions/concurrency em `supplier-comparison`.
- Aceite: benchmark reporta `baseline: present`; specs visuais comparam contra baseline commitada (E43).
- Prova: runs citados.
- Depende de: E14, E43. Esforço: M. Classe: A.

### E29 — Quotes: `ci-quotes-wizard` e os 11 focados executam de verdade
- Objetivo: 5 jobs de `ci-quotes-wizard` + `quote-summary-*`, `e2e-pdf-dialog`, `e2e-quote-conditions-pr-check`, `e2e-quote-row-menu-width`, `e2e-quotes-tooltips`, `e2e-discount-approval`, `global-search-gate` verdes em 5–9 s; `ci-quotes-wizard:328` `npm install -D pdf-parse || true` em CI; `e2e-quotes-responsive:67-69` grep impossível; `e2e-discount-approval:65` prefixo `04c` inclui `04ck` (roda 4×).
- Onde: os 12 arquivos (até a consolidação de E85 absorvê-los).
- Como: E14 + E23 em cada um; `pdf-parse` em `devDependencies`; grep `\[mobile/`; `--grep-invert 04ck`; remover `npm run build` não usado (5 arquivos).
- Aceite: cada job reporta `expected > 0` ou aparece `skipped`.
- Prova: tabela de runs no PR.
- Depende de: E14, E23. Esforço: M. Classe: A.

### E30 — `edge-integration-all`, `contract-tests`, `cart-header-quality-gate` (Deno): visibilidade de skip
- Objetivo: `edge-integration-all:68-79` "cobertura LIVE" prova que arquivos existem, não que rodaram (`describe.skip` sem segredo); `contract-tests:48-57` smoke `continue-on-error` de job "advisory ~2 sprints" sem data; `[ -f tests/contracts ]` sempre falso (`:43`); Deno `ignore: shouldSkip`.
- Onde: os 3 arquivos.
- Como: contar skips e falhar em `push: main` quando > 0 por falta de segredo; datar/remover o advisory do smoke; `-d`; guard em `workflow_dispatch` (`:56`).
- Aceite: summary mostra `executed/skipped`; `push: main` com segredo faltando fica vermelho.
- Prova: run citado.
- Depende de: E03. Esforço: P. Classe: A.

### E31 — Monitores inconclusivos viram visíveis (E30/E33/E40, DDL out-of-band)
- Objetivo: `pgss-slo-report`, `wraparound-monitor-report`, `capacity-growth-report` verdes sem dado desde 16–17/09 (migrations sem recibo); `ddl-out-of-band-detector:71-88` colapsa inconclusivo em verde.
- Onde: os 4 workflows; `scripts/check-result-contract.mjs` já tem o tri-estado.
- Como: `status == inconclusive` → abrir/atualizar issue `ci-inconclusive` deduplicada e marcar o job como falha em `schedule`; até as migrations E30/E33/E40 serem aplicadas via E15 (**PO**), desligar os 3 schedules com nota no header.
- Aceite: nenhum cron verde com relatório `inconclusive`.
- Prova: run citado com issue aberta.
- Depende de: E04. Esforço: P. Classe: A (workflow) / **PO** (aplicar as 3 migrations).

### E32 — `retries` do Playwright: padrão 1 no CI, flake probes explícitos
- Objetivo: `playwright.config.ts:31` `retries: CI ? 5 : 1` mascara flakiness e multiplica tempo ×6 em falha real (é o que estoura o timeout de `e2e-quote-freight-block`); `chromium-smoke` perdeu `grep: /@smoke/` que `check-smoke-tags.mjs` e `e2e.yml:93-95` ainda afirmam.
- Onde: `playwright.config.ts:31,129-137`; `playwright.yml:31` (`--retries=2` sobre smoke `retries:0`).
- Como: `retries: CI ? 1 : 0`; restaurar `grep: /@smoke/` no projeto smoke (ou apagar o gate de tags); padrão `--retries=0` + `--last-failed` (tooltips/undo) documentado em E12; `--repeat-each=3 --retries=0` como probe declarado.
- Aceite: `check-smoke-tags` e config coerentes; nenhum workflow depende de 5 retries.
- Prova: `npx playwright test --list --project=chromium-smoke` mostra só `@smoke`.
- Depende de: —. Esforço: P. Classe: A.

---

## Fase 4 — Gates decorativos viram gates (E33–E42)

### E33 — `freight-quality-gates.yml`: thresholds reais, sem `continue-on-error` em "Gate", sem duplicação
- Objetivo: Gate 6 `$LINES < 0` (`:286-321`); Gate 2 thresholds 0 (`:96-105`); Gate 1 lint estrito e Gate 5 E2E `continue-on-error` (`:62-64,235-244`); Gates 3/9 e 2/10 rodam os mesmos testes; `push` em `claude/**|feat/**|fix/**` + PR = 2× (`:4-15`); `node_modules` com `restore-keys` (`:44-54`); "dry-run" só funciona por ausência de segredo (`:27-28,191-198,356-364`).
- Onde: o arquivo (529 linhas).
- Como: thresholds = cobertura atual − 2 pp; jobs advisory renomeados `advisory-*`; remover duplicatas; só `pull_request` + `push: main`; `DRY_RUN=1` explícito nos scripts de carga (`scripts/fuzz-testing.mjs:29`, `stress-burst.mjs:34-35`, `freight-quest-load-test.mjs:43-44`, `fuzz-edge-uploads.mjs:18`) em vez de depender de URL vazia.
- Aceite: Gate 6 falha com cobertura abaixo do piso (teste mutante); duração do workflow cai ≥ 40 %.
- Prova: 2 runs (antes/depois) + mutante.
- Depende de: E12. Esforço: M. Classe: A.

### E34 — `full-ci.yml` e `global-search-gate.yml`: cobertura que pode falhar
- Objetivo: `full-ci:58-68` `# exit 1` comentado; `test:ci-core:coverage` thresholds 0 em 2 arquivos; `full-ci:117-122` stress roda nos 2 shards; `global-search-gate:32` thresholds 0; `:75-77` quarentena só em artefato.
- Onde: os 2 workflows; `package.json` (`test:ci-core:coverage`).
- Como: pisos reais por módulo; stress fora da matriz; quarentena vira PR (E51) ou some a alegação.
- Aceite: mutante (baixar cobertura) deixa o job vermelho.
- Prova: run mutante.
- Depende de: —. Esforço: P. Classe: A.

### E35 — `lint-untyped-from.yml`: remover `continue-on-error` e podar allowlist
- Objetivo: `:39` TODO já cumprido (script sai 0, 48 tabelas existem); `scripts/lint-untyped-from.sh:36-70` allowlist de 33 tabelas obsoleta (amostra: `audit_log`, `categories`, `personalization_techniques`, `product_images` existem em `types.ts`).
- Onde: workflow + script.
- Como: remover a linha; allowlist só com tabelas que **não** estão em `types.ts` hoje (gerar por script); `push: main` com os mesmos `paths` do PR.
- Aceite: adicionar `untypedFrom('tabela_inexistente')` deixa o job vermelho.
- Prova: PR mutante.
- Depende de: —. Esforço: P. Classe: A.

### E36 — Visual sem `--update-snapshots` incondicional
- Objetivo: `optimized-image-e2e.yml:41`, `stock-future-stock-e2e.yml:115-120`, `visual-tests.yml:54` (`=missing` para 9 projetos) e o `try/catch` de `quote-summary-sticky-header-visual.spec.ts:122-135` impedem `toHaveScreenshot` de falhar.
- Onde: os 3 workflows + a spec.
- Como: remover a flag; remover o `catch` (ou reduzir a `test.fail` explícito com issue); baselines commitadas em E43.
- Aceite: alterar 1 px em fixture deixa o job vermelho.
- Prova: PR mutante.
- Depende de: E43. Esforço: P. Classe: A.

### E37 — `continue-on-error` em passos de teste: `e2e-flows`, `visual-tests`, `ci-freight-quality`, `stock-rupture-horizon`, `pdf-quality`, `quality-gate`, `edge-functions-drift-check`
- Objetivo: 27 ocorrências; as que escondem teste real: `e2e-flows:75,158,170,254`, `visual-tests:27`, `ci-freight-quality:102,120,133`, `stock-rupture-horizon:66` (tem passo final de falha — manter esse padrão), `pdf-quality:93-99`, `quality-gate:183`, `edge-functions-drift-check:281`.
- Onde: os arquivos.
- Como: padrão único = `set +e` + captura de exit code + passo final "Falhar se…" (como `stock-rupture-horizon:160-162` e `e2e.yml:308-312`); `continue-on-error` só em passo de diagnóstico ou upload.
- Aceite: `check-workflow-contracts` lista `continue-on-error` apenas em passos de artefato/diagnóstico (allowlist explícita).
- Prova: saída do script.
- Depende de: E11. Esforço: M. Classe: A.

### E38 — `detect-base64-content.yml`, `--pass-with-no-tests`, `git add || true`
- Objetivo: `exit $FOUND` (mod 256, `:116`); `--pass-with-no-tests` em `e2e-flows` ×7, `e2e-personalization:77`, `e2e-customization-collapse:119`, `replenishment` ×3; `git add … || true` em updaters, `regenerate-supabase-types:161`, `deploy-edge-functions:88,90` (`git diff || true` → "0 mudanças" silencioso).
- Onde: os arquivos.
- Como: `exit $(( FOUND > 0 ))`; remover `--pass-with-no-tests` em invocações de arquivo único; remover `|| true` sob `set -euo pipefail`.
- Aceite: renomear uma spec citada deixa o job vermelho.
- Prova: PR mutante.
- Depende de: —. Esforço: P. Classe: A.

### E39 — `supabase-security-gate.yml`: CHECK 2 com evidência real, ref canônico fixo
- Objetivo: `:72-76` RPC com chave anon; `:52,112` ref vem de `secrets.VITE_SUPABASE_PROJECT_ID` sem guarda REGRA #1; `:56-64` `db lint --linked` do schema inteiro (PR-independente); sem `permissions`/timeout/`concurrency`; "Gate 5" não é required.
- Onde: o arquivo; `scripts/check-security-definer-audit.mjs`.
- Como: reimplementar CHECK 2 via Management API read-only sobre `pg_proc.proconfig` (padrão E22 `check-anon-write-grants.mjs`); hardcodar `doufsxqlfjyuvxuezpln` ou `assert ref == canônico`; `db lint` só em `push: main`/cron com issue deduplicada.
- Aceite: CHECK 2 lista funções auditadas (> 0) no summary.
- Prova: run citado.
- Depende de: —. Esforço: M. Classe: A.

### E40 — `--require-live` nos gates de segurança em `release/*` e `push: main`
- Objetivo: `magazine-unit-tests:148-152` e `freight-quality-gates:397-398` aceitam `STATIC_PASS` sem segredo (`check-security-definer-acl.mjs:88-96`).
- Onde: os 2 workflows.
- Como: `--require-live` quando `github.event_name != 'pull_request' || head.repo == repository`; PR de fork → `skipped` com summary.
- Aceite: sem segredo em `push: main` o gate fica vermelho/inconclusivo, nunca verde.
- Prova: run citado.
- Depende de: E23. Esforço: P. Classe: A.

### E41 — Ratchets com dono: `.tsc-ratchet-baseline`, `bundle-size-baseline.json`, `.a11y/*`, `.security/*`
- Objetivo: baselines commitadas podem subir no mesmo PR que regride (`ts-unused-ratchet` nunca auto-abaixa; bundle comparado a arquivo, não a `main`).
- Onde: `scripts/tsc-unused-ratchet.sh`, `scripts/check-bundle-size.mjs`, CODEOWNERS.
- Como: falhar se o baseline **aumentar** em PR sem label `ratchet-override`; cron semanal abre PR abaixando baselines quando o `main` melhorou; regra CODEOWNERS para os arquivos de baseline.
- Aceite: PR que aumenta `.tsc-ratchet-baseline` sem label fica vermelho.
- Prova: PR mutante.
- Depende de: —. Esforço: M. Classe: A.

### E42 — `quality-gate.yml`: job "Supabase Types Sync" trocado pelo gate E41
- Objetivo: `:161-162` `npm install -g supabase@latest` (o pacote npm desaconselha install global; o job passa hoje — verificado no run da PR #1906 — mas usa CLI `latest` não pinado, contra o 2.101.0 do resto do repo); `:164-183` `secrets.SUPABASE_PROJECT_ID` único no repo (inexistente) + `continue-on-error` + `diff -q` contrariando REGRA #4 → o drift nunca bloqueia.
- Onde: `.github/workflows/quality-gate.yml`.
- Como: substituir o job por `npm run check:types-inventory-drift -- --base origin/main` (sem rede) e, em `push: main`, `--live`; remover o segredo órfão.
- Aceite: remover uma tabela de `types.ts` em PR deixa o job vermelho (teste já existe em `tests/scripts/check-types-inventory-drift.test.mjs`).
- Prova: PR mutante.
- Depende de: —. Esforço: P. Classe: A.

---

## Fase 5 — Baselines visuais e bots que escrevem em branch (E43–E52)

### E43 — Gerar e commitar as baselines visuais que faltam (uma PR por suíte)
- Objetivo: 81 specs com `toHaveScreenshot`, 10 pastas commitadas; 10+ pastas referenciadas nunca existiram (calendar, quote-conditions, quote-freight, no-presentation-mode, summary-sticky-header, view-sticky, global-search, pdf-dialog, missing-fields-popover, pdf-header, quote-list-responsive, collapse-reflow). Checks correspondentes são vermelhos por construção.
- Onde: as pastas `*.spec.ts-snapshots/`; workflows de update (após E45).
- Como: rodar o updater (safe-mode) por suíte via `workflow_dispatch` → PR com PNGs (`chromium-public`/`chromium-authed` apenas; nada de firefox/webkit/mobile sem decisão); revisar visualmente; mergear.
- Aceite: `check-visual-baselines.mjs` (E44) reporta 0 specs sem baseline no projeto exigido.
- Prova: lista de PRs.
- Depende de: E22 (para specs autenticadas), E45. Esforço: G. Classe: A.

### E44 — Guard: toda spec com `toHaveScreenshot` tem baseline commitada
- Objetivo: nada impede uma spec visual de entrar sem baseline (é assim que 10 suítes ficaram vermelhas).
- Onde: `scripts/check-visual-baselines.mjs` (novo) + Gate 1 de `deploy-gates.yml`; `check-collapse-baselines.mjs` vira caso particular.
- Como: parse de specs (`toHaveScreenshot`) × `git ls-files '*-snapshots/*'` × projeto usado nos workflows.
- Aceite: adicionar `toHaveScreenshot` sem PNG deixa o Gate Final vermelho.
- Prova: teste mutante do script.
- Depende de: E43. Esforço: P. Classe: A.

### E45 — Um único `_update-snapshots.yml` (`workflow_call`) que abre PR e nunca faz push
- Objetivo: 8 updaters quase idênticos; 4 rodam em qualquer branch sem `branches:`; todos fazem `git push` com `[skip ci]` (HEAD sem checks); `e2e-update-quote-conditions:102` caminho `__screenshots__` errado; `update-quote-reset-snapshots:77` injeção de `commit_message`; e-mail do bot sem `41898282+` em 4.
- Onde: novo `.github/workflows/_update-snapshots.yml` (inputs `spec`, `project`, `snapshot_dir`, `safe_mode`, `needs_auth`) + `update-snapshots.yml` (`workflow_dispatch` com `choice`); apagar os 8.
- Como: esqueleto safe-mode do calendar (dry-run → classificar → abortar em falha real); artefato de diff; `git push` para branch `snapshots/<suite>-<run>` + `gh pr create` com token da App (E02); nunca `[skip ci]`; inputs só via `env:`.
- Aceite: 0 workflows com `git push` de baseline; PR de baseline recebe `Gate Final`.
- Prova: PR gerada por dispatch.
- Depende de: E02, E14. Esforço: M. Classe: A.

### E46 — `visual-tests.yml`: de bot de commit a check noturno com PR
- Objetivo: `:27` `continue-on-error` de job; `:54` 20 specs × 9 projetos; `:58-115` auto-commit em PR head ou `main`; 2 shards × 60 min × 3 engines em todo PR; `contents/pull-requests/issues: write`.
- Onde: o arquivo.
- Como: PR = comparação `chromium-public` contra baseline commitada, falha em diff, artefato + comentário; `schedule` semanal chama E45 para regenerar via PR; `permissions: contents: read`.
- Aceite: `visual-tests` nunca escreve em branch; roda ≤ 10 min por PR.
- Prova: run citado.
- Depende de: E45, E43. Esforço: M. Classe: A.

### E47 — `e2e-visual-preview-button`, `e2e-customization-collapse`, `pdf-visual-regression`: sem push automático em `main`
- Objetivo: tag `[update-visual-baselines]` em mensagem de commit rescreve baseline em `main` (`e2e-visual-preview-button:91-137`); dispatch em `main` faz `git push` (`e2e-customization-collapse:125-134`, `pdf-visual-regression:59-72`); `pdf-visual-regression:24-26` `contents: write` até em `pull_request`.
- Onde: os 3 arquivos.
- Como: modo update → chamar E45; `contents: write` só no job de dispatch; PR paths de `e2e-visual-preview-button` incluem o próprio workflow e o script de guarda (`:14-31`).
- Aceite: `grep -l "git push" .github/workflows` = só `_update-snapshots.yml`, `lovable-autoheal.yml` (branch própria) e workflows de recibo.
- Prova: grep.
- Depende de: E45. Esforço: P. Classe: A.

### E48 — `e2e.yml`: regressão escopada e shardada, relatório com poda
- Objetivo: `:356-374` regressão = 567 specs × 10 projetos, `workers: 1`, timeout 45 (nunca termina); `:357` skip verde; `:405-412` gh-pages `e2e-report/<run>` cresce sem limite; `:434-443` upload duplicado; `:63` instala 3 engines para smoke chromium.
- Onde: o arquivo.
- Como: regressão só `--project=chromium-public --project=chromium-authed`, `--shard=1/4..4/4`, `--reporter=blob` + `merge-reports`; creds via E23 (skip → `skipped`); publicar só os últimos 20 relatórios (job de poda); 1 upload.
- Aceite: regressão termina em < 30 min por shard; gh-pages ≤ 20 pastas.
- Prova: run citado.
- Depende de: E14, E23, E32. Esforço: M. Classe: A.

### E49 — Apagar `playwright.yml` e mover as 5 specs de carrinho para a regressão
- Objetivo: duplica o smoke de `e2e.yml` no mesmo evento; `--retries=2` sobre smoke `retries:0`; specs autenticadas sem creds; job `test` colide com `optimized-image-e2e#test`.
- Onde: `.github/workflows/playwright.yml` (apagar); `e2e.yml` (lista de specs).
- Como: apagar; garantir que as 5 specs estão no `chromium-authed` da regressão (E48).
- Aceite: smoke roda 1× por PR (E2E + Gate 3 de deploy-gates → ver E88).
- Prova: contagem de runs por SHA.
- Depende de: E48. Esforço: P. Classe: A.

### E50 — `e2e-flows.yml`: mobile real, sem `vars.` fantasma, sem `continue-on-error`
- Objetivo: `:248` `routes-mobile`; `:254,75,158,170` engolem falhas; `:90-92` `vars.E2E_USER_EMAIL`; `:126-133` auth setup `continue-on-error`; 3 blocos de setup idênticos.
- Onde: o arquivo.
- Como: `--project=mobile-chrome`; E14/E23; padrão de exit code + passo de falha; remover `--pass-with-no-tests`.
- Aceite: "Mobile Critical Routes" executa testes (> 0) e pode falhar.
- Prova: run citado + mutante.
- Depende de: E14, E23, E37. Esforço: P. Classe: A.

### E51 — Quarentena de flaky como estado versionado
- Objetivo: `global-search-gate:75-77` gera `quarantine-list.json` que só vira artefato; `magazine-flakiness` cobre 1 módulo; `retries: 5` escondia o resto.
- Onde: `e2e/quarantine.json` (novo, lido por `test-base.ts` → `test.fixme` com issue); `e2e/scripts/detect-flaky.mjs` abre PR (token da App) adicionando entradas com issue; cron semanal remove entradas cujo teste passou 10× (`--repeat-each=10`).
- Como: implementar leitura no fixture + fluxo de PR; proibir quarentena manual sem issue.
- Aceite: teste flaky detectado aparece em PR com issue vinculada; nenhuma entrada sem issue.
- Prova: PR gerada.
- Depende de: E02, E32. Esforço: M. Classe: A.

### E52 — Corrigir `lovable-edit-tracker.yml` e `branch-protection-sentinel.yml` (relatórios errados)
- Objetivo: `lovable-edit-tracker:104-131` indexa `EDIT_IDS` e `LOVABLE_SHAS` desalinhados; `:163` `NO_ID_COUNT` sempre 0; `sentinel:229-256` lê flag clássica `protected` (404 com rulesets) → avisa "NÃO protegida" em todo push; `:40,216` sem timeout.
- Onde: os 2 arquivos.
- Como: `EDIT_IDS+=("${EDIT_ID:-N/A}")`; `NO_ID_COUNT=$((LOVABLE_COMMITS - ${#EDIT_IDS[@]}))`; sentinel consulta `/rulesets` como `required-checks-guard` e **falha** (não avisa) se `main` não tiver ruleset ativo.
- Aceite: relatório do tracker bate com `git log`; sentinel verde sem aviso falso.
- Prova: run citado.
- Depende de: —. Esforço: P. Classe: A.

---

## Fase 6 — Proteção de branch e checks obrigatórios (E53–E62)

### E53 — Ruleset `main`: 1 aprovação, bypass só em emergência, sem "extra approval" morto
- Objetivo: 0 aprovações + code owner review (inócuo) + bypass admin `always`; `require_extra_approval_for_unattributed_changes` sem efeito.
- Onde: ruleset 16764622.
- Como: `required_approving_review_count: 1`; bypass `pull_request` only (não `always`); `require_last_push_approval: true` (bloqueia self-approve após push do Lovable); `dismiss_stale_reviews_on_push` mantido.
- Aceite: PR sem aprovação não merge; admin precisa "Bypass" explícito (auditável).
- Prova: `get_branch_rules` no PR.
- Depende de: E02 (bots abrem PR; alguém aprova). Esforço: P. Classe: **PO** (muda o fluxo do dono).

### E54 — Ruleset `release/*` ou remoção da declaração
- Objetivo: `required-checks.json` declara 3 checks para `release/*` que não existem no GitHub; os 3 workflows são `paths`-filtrados → deadlock.
- Onde: `.github/required-checks.json`; `ssot-supabase.yml:3-15`, `stock-rupture-fuzz.yml:3-9`, `magazine-unit-tests.yml:23-40`.
- Como: PO decide se `release/*` existe. Se sim: criar o ruleset e remover `paths:` desses 3 (todos baratos, sem rede, ≤ 10 min) ou adicionar trigger incondicional `branches: [release/*]`. Se não: remover o bloco do JSON.
- Aceite: `scripts/check-required-checks.mjs` passa e o estado do GitHub bate com o JSON.
- Prova: `list_rulesets` + saída do script.
- Depende de: —. Esforço: P. Classe: **PO** + **B**.

### E55 — Guardas do CLAUDE.md dentro do `Gate Final`
- Objetivo: REGRA #2 (`check-product-type-fields`), REGRA #4 (`check:types-inventory-drift`), contratos de migration (`check-migration-*`, `check-supabase-reference-catalog`), `check-no-salvar-alteracoes-draft`, `check-bundle-size`, `detect-base64`, `check-workflow-contracts` (E11) e `check-visual-baselines` (E44) não estão no único check obrigatório.
- Onde: `deploy-gates.yml` Gate 1 (todos zero-dep, segundos).
- Como: adicionar como passos do job `lint-typecheck` (ou job `static-guards` novo em `needs` do agregador).
- Aceite: remover `price` do tipo `Product` em PR deixa `Gate Final` vermelho.
- Prova: PR mutante.
- Depende de: E11, E44. Esforço: P. Classe: A.

### E56 — `required-checks-guard.yml` lê o JSON e valida o que importa
- Objetivo: `:29` `REQUIRED=` hardcoded; não cobre `release`; `:67-70` ignora ruleset `~ALL`; `check-required-checks.mjs` roda só em `cart-quality` (paths-filtrado) → renomear `Gate Final - Deploy Ready` passaria.
- Onde: `required-checks-guard.yml`; `scripts/check-required-checks.mjs` (nova verificação: job required é trigger-incondicional para o padrão de branch).
- Como: guard chama o script com os rulesets vivos; adicionar `.github/workflows/**` e `required-checks.json` aos paths de disparo; rodar também em `push: main` e no Gate 1.
- Aceite: renomear o job required em PR deixa o Gate Final vermelho; job required com `paths:` é rejeitado pelo script.
- Prova: 2 PRs mutantes.
- Depende de: E54. Esforço: P. Classe: A.

### E57 — Documentação de proteção alinhada à realidade
- Objetivo: `BRANCH_PROTECTION_SETUP.md:46-48` recomenda jobs push-only como required (deadlock); `:132` cita job inexistente `check-required-checks-ssot`; `draft-label-guard.yml:9-12` afirma ser required; comentários "Bloqueia merge" em ≥ 6 workflows; visibilidade do repo descrita de 3 formas contraditórias.
- Onde: os docs e headers.
- Como: reescrever `BRANCH_PROTECTION_SETUP.md` a partir de `required-checks.json` + ruleset vivo; remover alegações falsas dos headers; uma frase única sobre visibilidade (após E95).
- Aceite: `grep -ril "bloqueia merge" .github/workflows` só onde for required.
- Prova: grep.
- Depende de: E53–E56. Esforço: P. Classe: A.

### E58 — `deploy-gates.yml`: `concurrency`, Lighthouse pinado e privado
- Objetivo: required sem `concurrency`; `:146-151` `npm i -g @lhci/cli@0.13.x` em runtime; `.lighthouserc.json` `temporary-public-storage` publica HTML do site em URL pública.
- Onde: `deploy-gates.yml`, `.lighthouserc.json`, `package.json`.
- Como: `@lhci/cli` em `devDependencies` versão exata; `upload.target: filesystem` + artefato 14 d; `concurrency` cancelável só em PR.
- Aceite: nenhum relatório Lighthouse em `storage.googleapis.com`; runs supersedidos cancelam.
- Prova: run citado.
- Depende de: E17. Esforço: P. Classe: A.

### E59 — Dependabot e forks conseguem passar o `Gate Final`
- Objetivo: Gates 2.5/5.5 exigem `SUPABASE_ACCESS_TOKEN`/`SERVICE_ROLE_KEY` → PRs do Dependabot e de forks sempre vermelhos; acumulam.
- Onde: `deploy-gates.yml:95-99,166-183`; Settings → Dependabot secrets.
- Como: `if: github.actor != 'dependabot[bot]' && head.repo == repository` nos gates live com passo `skipped` explícito e summary "inconclusivo por origem" (nunca verde vazio); alternativa preferida para Dependabot: espelhar os 2 segredos como Dependabot secrets (leitura).
- Aceite: PR do Dependabot fica verde no `Gate Final` com os gates live marcados `skipped`/executados.
- Prova: próximo PR do Dependabot.
- Depende de: E97. Esforço: P. Classe: **B** (segredos).

### E60 — `labels.yml` como SSOT real
- Objetivo: 8 labels gerenciadas; automações usam `deploy-failure`, `security`, `priority-high`, `gitleaks`, `bug`, `Lovable`, `autoheal`, `dependencies`, `automated`, `ci`, `uptime`, `drift-check`, `ddl-out-of-band`, `ci-inconclusive` (E31).
- Onde: `.github/labels.yml`; `labels-sync.yml` (timeout).
- Como: adicionar todas com cor/descrição; `skip-delete: false` após sincronizar.
- Aceite: `labels-sync` verde sem diff pendente.
- Prova: run.
- Depende de: E31. Esforço: P. Classe: A.

### E61 — Nomes de job únicos e estáveis
- Objetivo: `quality-gate` ×2, `test` ×2, `check` ×2, `e2e` ×2, `update` ×3, `update-snapshots` ×4, `visual-check` ×2, `Deploy ${{ matrix.fn }}` ×2, `Edge Function Integration Tests` ×2 — quebram o mapeamento exato de `check-required-checks.mjs`.
- Onde: os arquivos.
- Como: `name:` explícito com prefixo do domínio (`Quotes · Tooltips`, `DB · Drift`, …); E11 rejeita duplicata.
- Aceite: `check-workflow-contracts` 0 duplicatas.
- Prova: saída do script.
- Depende de: E11. Esforço: P. Classe: A.

### E62 — CODEOWNERS estende para baselines, `required-checks.json`, `labels.yml`, `.github/actions/**`
- Objetivo: arquivos que controlam gates não têm dono; com E53 (1 aprovação) o code owner review passa a ter efeito.
- Onde: `.github/CODEOWNERS`.
- Como: adicionar as entradas; validar com `github_get_codeowners_errors`.
- Aceite: 0 erros de CODEOWNERS; PR que toca baseline pede revisão.
- Prova: API.
- Depende de: E53. Esforço: P. Classe: A.

---

## Fase 7 — Banco e Supabase ops (E63–E74)

### E63 — Preflight de segurança transacional no E15
- Objetivo: `db-apply-migration.yml:127-136` `psql -1` + 38 migrations com `CONCURRENTLY` e 55 com `BEGIN;/COMMIT;` de topo → aplicação parcial possível; `scripts/preflight-migration-apply.mjs:75-110` não checa.
- Onde: `scripts/preflight-migration-apply.mjs`; workflow.
- Como: rejeitar `CONCURRENTLY`, `BEGIN|COMMIT|ROLLBACK` de topo, `DROP` sem allowlist, `ALTER TYPE … ADD VALUE`, ausência de `IF NOT EXISTS` em `CREATE`, salvo opt-out `-- transaction: none` + `-- approved-by:`; `PGOPTIONS='-c lock_timeout=30s -c statement_timeout=10min'`; `timeout-minutes: 15` no `apply`.
- Aceite: migration com `CONCURRENTLY` sem opt-out é recusada no preflight (teste unitário).
- Prova: `tests/scripts/preflight-migration-apply.test.mjs` mutante.
- Depende de: —. Esforço: M. Classe: A.

### E64 — Ledger dentro da transação do E15 (ou compensação explícita)
- Objetivo: `:143-151` `migration repair` fora da transação → DDL aplicada sem ledger se falhar (exatamente o que a POLITICA_DDL proíbe).
- Onde: workflow.
- Como: `INSERT INTO supabase_migrations.schema_migrations (version, name, statements)` dentro do mesmo `psql -1`; manter `repair` como reconciliação idempotente; passo `if: failure()` que imprime o comando de repair e abre issue `ledger-manifest-drift`.
- Aceite: simulação com repair falhando deixa ledger consistente ou issue aberta.
- Prova: teste no contêiner PG17 (`security-definer-acl-multi-env` já tem o padrão).
- Depende de: E63. Esforço: M. Classe: A (workflow) — aplicação real continua **B**.

### E65 — Fim do chicken-and-egg entre E15 e `migrations-sync-log-gate`/`db-schema-drift-check`
- Objetivo: PR de migration é vermelho em "Ledger parity" (`db-schema-drift-check:40-43,95-116`) e precisa de recibo antes de existir (`check-migrations-sync-log-gate.mjs:92-98`); `append-migration-receipt.mjs` duplica linhas (757-758).
- Onde: os 2 scripts + 2 workflows.
- Como: linha `pendente` obrigatória no PR (gate valida formato); recibo do E15 **atualiza** a linha (dedupe por versão); parity em PR exclui migrations adicionadas pelo próprio PR (diff vs base).
- Aceite: PR de migration nova verde nos dois checks; após E15, uma única linha por versão.
- Prova: PR de exemplo + teste do script.
- Depende de: E04, E64. Esforço: M. Classe: A.

### E66 — `db-schema-drift-check`: substituir `db diff --linked` (quebrado) pela comparação textual
- Objetivo: `:118-124` replay de ~3.000 migrations não completa (docs E02: "replay trava", `column categories.bitrix_id does not exist`) → cron 09:30 permanentemente vermelho sem issue.
- Onde: workflow; `scripts/export-schema-snapshot.mjs` (já usado em `schema-snapshot-export`).
- Como: cron compara `db dump --schema-only` vs snapshot commitado (E46 do plano DBA); falha → issue `drift-check` deduplicada; `db diff` só em `workflow_dispatch` com nota.
- Aceite: cron verde em dia sem drift; issue única em dia com drift.
- Prova: 2 runs.
- Depende de: E04. Esforço: M. Classe: A.

### E67 — `delete-orphan-edges.yml`: allowlist, environment e sem injeção
- Objetivo: `:32-36` qualquer slug; `:42-46` sem `environment: production`; `:50-52` `inputs.confirm` em shell; `:124-150` falha só avisa; `:83-90` lista fixa de 10/05.
- Onde: o arquivo.
- Como: recusar slugs presentes em `supabase/functions/*/` ou em `audit/edge-functions-canonical-only.json`; `environment: production`; inputs via `env:`; `exit 1` se `FAIL>0`; default vazio.
- Aceite: dispatch com slug de função viva é recusado antes de qualquer chamada.
- Prova: run de dispatch recusado.
- Depende de: —. Esforço: P. Classe: A (workflow) / execução **B**.

### E68 — `migration-dry-run.yml`: validação de caminho, `lock_timeout`, sem silêncio
- Objetivo: `:76-77` `inputs.draft_path` sem validação em shell; `:42-46` DDL de rascunho em prod com `ACCESS EXCLUSIVE` sem `lock_timeout`; `:56-65` verde sem segredo; `:95-105` `continue-on-error` + `|| true`.
- Onde: o arquivo.
- Como: `env:` + regex `^qa/migrations-draft/[A-Za-z0-9._-]+\.sql$`; `PGOPTIONS='-c lock_timeout=5s -c statement_timeout=60s'`; sem segredo → `skipped` (E23); remover `|| true`.
- Aceite: dry-run com lock contention aborta em 5 s.
- Prova: run citado.
- Depende de: E23. Esforço: P. Classe: A.

### E69 — Produção não é tocada a partir de PR
- Objetivo: `schema-snapshot-export:56-106` (dump completo em artefato público em todo PR), `edge-integration-all:119-153` (fuzz `service_role`), `ci-freight-quality:129-146` (5.000 req), `replenishment-quality:32-37`, `security-definer-acl-multi-env` push com service_role via PostgREST.
- Onde: os 5 workflows.
- Como: partes live só em `push: main`/`schedule`/`workflow_dispatch` com `environment: production-readonly`; PRs recebem `ALL_IN_ONE.sql`, contratos estáticos e mock; fuzz/carga viram nightly com limite de RPS documentado.
- Aceite: `grep` de `SUPABASE_SERVICE_ROLE_KEY` em jobs com `pull_request` = 0 (fora `deploy-gates` Gate 5.5 já guardado por E59).
- Prova: grep + runs.
- Depende de: E03, E59. Esforço: M. Classe: A.

### E70 — Unificar nomes de segredos/variáveis do Supabase
- Objetivo: `PG*` vs `SUPABASE_DB_PASSWORD`; ref hardcoded vs `vars.SUPABASE_PROJECT_REF` (11) vs `secrets.VITE_SUPABASE_PROJECT_ID` (3) vs `secrets.SUPABASE_PROJECT_ID` (1); `VITE_SUPABASE_URL` 69 vs `SUPABASE_URL` 2; `PUBLISHABLE` 50 vs `VITE_ANON` 9 vs `ANON` 3; literal `sb_publishable_…` em 34 arquivos.
- Onde: todos; `docs/ci/PADRAO_WORKFLOW.md` (tabela canônica).
- Como: ref **hardcoded** `doufsxqlfjyuvxuezpln` em tudo que escreve (REGRA #1: remover `vars.` override de `deploy-edge-functions:33,237` e `redeploy-*`); `vars.VITE_SUPABASE_URL`/`vars.VITE_SUPABASE_PUBLISHABLE_KEY` como variáveis (não segredos) e fallback em um único lugar (ação composta E13); `PGPORT` criado ou removido.
- Aceite: `grep -c sb_publishable_ .github/workflows/*` = 1 (ação composta); 0 `vars.SUPABASE_PROJECT_REF` em deploy.
- Prova: grep.
- Depende de: E13. Esforço: M. Classe: **B** (variáveis/segredos novos).

### E71 — `edge-functions-drift-check`: semântica de PR, timeout, retry e `workflow_run` em qualquer conclusão
- Objetivo: `:296,336,384` PR que adiciona função é vermelho (deploy só em `push: main`); sem timeout (108 downloads sequenciais); sem `concurrency`; `:281` node default; `:262-266` upload sem `if: always()`; `:174-181` 1 falha transitória abre issue `priority/high`; `:47` roda só se deploy `success`.
- Onde: o arquivo.
- Como: em `pull_request` `missing_deploy` = warning; hash drift/órfão = falha; `timeout-minutes: 30`; retry 1× no download; `workflow_run` em qualquer conclusão; `setup-node`.
- Aceite: PR que adiciona função verde; drift real vermelho.
- Prova: 2 runs.
- Depende de: E18. Esforço: P. Classe: A.

### E72 — `regenerate-supabase-types` ⇄ `magazine-typed-queries`: cadeia que valida o arquivo certo
- Objetivo: `regenerate:100-115` tenta editar workflow com `GITHUB_TOKEN` (impossível); `magazine-typed-queries:36-39` `workflow_run` faz checkout de `main` (sem types regenerados) e o PR via `GITHUB_TOKEN` não dispara `pull_request`.
- Onde: os 2 arquivos.
- Como: remover o passo `promote_lint` (E35 já remove o `continue-on-error`); PR via App (E02) → `pull_request` dispara `magazine-typed-queries` naturalmente; remover `workflow_run`.
- Aceite: PR de types regenerados mostra `magazine-typed-queries` executado sobre o branch do PR.
- Prova: PR citado.
- Depende de: E02, E35. Esforço: P. Classe: A.

### E73 — `uptime-monitor`, `prod-health`, advisories: recuperação, dedupe e roteamento
- Objetivo: `uptime-monitor:76-89` nunca fecha a issue; `prod-health` sem `concurrency` (Lovable em rajada → Slack repetido); advisories terminam em issue `priority/low` que ninguém recebe; Slack só no sentinel/prod-health e opcional.
- Onde: os workflows de monitor; `SENTINEL_SLACK_WEBHOOK` (inexistente hoje).
- Como: passo "back to green → fechar issue com comentário"; `concurrency` em `prod-health`; PO define **um** canal (Slack/WhatsApp via N8N/e-mail) e o segredo; template de advisory ganha passo de notificação para `priority/high` e para `ci-inconclusive`.
- Aceite: queda simulada abre issue + notifica; recuperação fecha.
- Prova: dispatch de teste.
- Depende de: E31. Esforço: M. Classe: **PO** (canal) + **B** (segredo).

### E74 — `Uptime Monitor` a cada 15 min: custo × valor
- Objetivo: 168 runs em 2 dias (28 % do total) para um `curl`; cada run é checkout + job.
- Onde: `uptime-monitor.yml`.
- Como: PO decide: manter 15 min (aceitando o ruído nos runs) ou mover para 30 min + um monitor externo (Cloudflare Worker já existente na stack) com o GitHub só como fallback horário.
- Aceite: decisão registrada no header do workflow.
- Prova: —.
- Depende de: —. Esforço: P. Classe: **PO**.

---

## Fase 8 — Deploy e edge functions (E75–E84)

### E75 — `concurrency` e `environment: production` nos deploys
- Objetivo: `deploy-edge-functions.yml:38-150` sem `concurrency` (push mais antigo pode sobrescrever o mais novo); `deploy-vercel.yml` e `deploy-edge-functions.yml` sem `environment` (sem aprovação/auditoria); `db-apply-migration` sem timeout.
- Onde: os 3 arquivos.
- Como: `concurrency: {group: edge-deploy, cancel-in-progress: false}`; `environment: production` no job `deploy` (o reviewer já é o PO — decidir se push em `main` deve esperar aprovação ou se só `workflow_dispatch` exige); timeouts.
- Aceite: 2 pushes seguidos geram deploys serializados.
- Prova: 2 runs em fila.
- Depende de: E03. Esforço: P. Classe: **PO** (aprovação em push) / A.

### E76 — Apagar `redeploy-rate-limiter-consumers.yml`
- Objetivo: segundo caminho de deploy (viola corolário REGRA #8); concorre com `deploy-edge-functions` no mesmo push; header (`:5-7`) obsoleto.
- Onde: o arquivo; `deploy-edge-functions.yml` já cobre `_shared/` fan-out.
- Como: apagar; se houver necessidade de "só os consumers", usar `function_name` do dispatch.
- Aceite: 1 workflow com `supabase functions deploy`.
- Prova: grep.
- Depende de: —. Esforço: P. Classe: A.

### E77 — `deploy-edge-functions.yml`: `deno.json` raiz, sem `|| true`, inputs via `env`, ref fixo
- Objetivo: `:101-104` mudança em `supabase/functions/deno.json` não redeploya nada; `:88,90` `git diff || true`; `:61-62,73` `inputs.function_name` em shell; `:33,237` `vars.` override; job `Deploy ${{ matrix.fn }}` duplicado; sem timeouts.
- Onde: o arquivo.
- Como: arquivos raiz de `supabase/functions/` tratados como `_shared/`; remover `|| true`; `env:`; ref hardcoded; timeouts (matriz 10 min/fn).
- Aceite: alterar `deno.json` redeploya todas; dispatch com `function_name="x; id"` não executa `id`.
- Prova: `dry_run` citado.
- Depende de: E70. Esforço: P. Classe: A.

### E78 — Rollback de edge function
- Objetivo: Vercel tem snapshot+rollback; edge functions têm retry e ledger, sem restauração.
- Onde: `deploy-edge-functions.yml` (novo input `rollback_to_run`), `supabase/EDGE_FUNCTIONS_DEPLOY_LOG.md` (guarda SHA por função).
- Como: antes do deploy, salvar artefato `bundle-<fn>-<sha>` 30 d; `rollback_to_run` faz checkout do SHA registrado e redeploya só as funções listadas.
- Aceite: dispatch de rollback restaura hash anterior (verificado pelo drift check).
- Prova: run de rollback em função de teste.
- Depende de: E77. Esforço: M. Classe: A.

### E79 — `deploy-vercel.yml`: rollback à prova de `PREV` vazio, token por env
- Objetivo: `:83-86` `PREV` vazio desliga o rollback em silêncio; `--token=` na linha de comando; sem timeout; `VERCEL_TOKEN` não existe hoje.
- Onde: o arquivo.
- Como: `set -euo pipefail` + falha se `PREV` vazio; `env: VERCEL_TOKEN`; `timeout-minutes: 20`; PO decide se o fallback manual continua existindo (se sim, criar o segredo em `production`).
- Aceite: dry run com `vercel list` mockado vazio falha no passo de snapshot.
- Prova: run.
- Depende de: —. Esforço: P. Classe: **B** (segredo).

### E80 — Cargas e fuzz em produção só por agenda e com teto
- Objetivo: `ci-freight-quality:129-146` (5.000 req, 100 concorrentes, por PR); `edge-integration-all:119-153` (fuzz service_role por push); `freight-quality-gates` Gates 4/7 a um segredo de virarem burst de 200.
- Onde: os 3 workflows; scripts de carga.
- Como: `DRY_RUN=1` padrão nos scripts; execução real só `schedule` noturno em `production-readonly` com `LOAD_TOTAL_REQUESTS ≤ 500` e `RPS ≤ 20` documentados; issue em falha.
- Aceite: nenhum job com `pull_request` chama script de carga sem `DRY_RUN=1`.
- Prova: grep + run noturno.
- Depende de: E33, E69. Esforço: P. Classe: A.

### E81 — `deployment-failure-alert` e `deploy-gates` Gate 3: dedupe por marcador e sem fallback morto
- Objetivo: `deployment-failure-alert:55` dedupe por grep de 7 chars; `deploy-gates:117-121` `if [ -d e2e ]` verde se a pasta sumir.
- Onde: os 2 arquivos.
- Como: `<!-- deploy-failure:<sha> -->`; remover o `else`.
- Aceite: 2 falhas no mesmo SHA = 1 comentário; sem `e2e/` o Gate 3 falha.
- Prova: teste.
- Depende de: —. Esforço: P. Classe: A.

### E82 — Drift check após qualquer deploy + issue única por incidente
- Objetivo: `edge-functions-drift-check` corre só se deploy `success`; um incidente pode abrir `drift-check`, `ddl-out-of-band` e `ledger-manifest-drift` ao mesmo tempo.
- Onde: `edge-functions-drift-check.yml:47`; template de advisories.
- Como: `workflow_run.types: [completed]` sem filtro de conclusão; chave de dedupe por `<tipo>:<data>` + comentário cruzado quando já existe issue de outro tipo no mesmo dia.
- Aceite: deploy parcialmente falho dispara drift check.
- Prova: run.
- Depende de: E71. Esforço: P. Classe: A.

### E83 — Receitas E15/E66: teste de ponta a ponta do caminho autorizado
- Objetivo: `db-apply-migration.yml` teve 3 runs (2 cancelados, 1 falho no recibo); nunca completou verde. É o único caminho autorizado.
- Onde: workflow; migration no-op de teste `2026xxxx_e83_noop.sql` (`SELECT 1` com header de rollback).
- Como: após E01/E02/E63/E64: dispatch com a no-op em `production` (aprovação do PO) → 4 jobs verdes → PR de recibo mergeada.
- Aceite: run verde citado nos 4 jobs.
- Prova: run + PR.
- Depende de: E01, E02, E63, E64. Esforço: P. Classe: **B** (executa em produção).

### E84 — `schema-snapshot-export`: PR semanal deduplicada, sem no-op verde
- Objetivo: `:210-241` dedupe por nome de branch com data → PR acumulada semana a semana; `:167-177,251,335-338` no-op verde sem segredo.
- Onde: o arquivo.
- Como: branch fixa `bot/schema-snapshot` com force-push da App + PR única (update); sem segredo em `schedule` → falha.
- Aceite: ≤ 1 PR aberta do snapshot a qualquer momento.
- Prova: 2 semanas.
- Depende de: E02, E69. Esforço: P. Classe: A.

---

## Fase 9 — Consolidação e custo (E85–E93)

### E85 — `e2e-quotes.yml` consolidado (matriz) substitui 12 workflows
- Objetivo: 31 jobs de setup para 12 workflows de orçamentos; `e2e-quote-items-table-header` sozinho ~4.100 jobs; 5 `npm run build` inúteis; 3 instalam 3 engines por leg.
- Onde: novo `.github/workflows/e2e-quotes.yml`; apagar `ci-quotes-wizard`, `e2e-quote-conditions-pr-check`, `e2e-quote-freight-block`, `e2e-quote-item-editor-sheet`, `e2e-quote-items-table-header`, `e2e-quote-row-menu-width`, `e2e-quote-view-no-presentation-mode`, `e2e-quote-view-sticky`, `e2e-quotes-responsive`, `e2e-quotes-tooltips`, `e2e-quotes-undo`, `quote-summary-collapse-all`, `quote-summary-sticky-header`, `e2e-discount-approval`.
- Como: `preflight` (secrets-check + overflow gate + fuzz Vitest) → `build` 1× (artefato `dist/`) → `e2e` `matrix.include` `{group, project, browser, specs, auth|mock}` instalando só o navegador do leg, `vite preview` sobre `dist/`, `--retries=1 --reporter=blob` → `report` (`merge-reports`, 1 artefato 7 d, 1 comentário com dedupe de `bundle-size-report`) → job `e2e-quotes-ok` nomeável em `required-checks.json`; `schedule` semanal (cobre E10).
- Aceite: PR em `src/components/quotes/**` gera 1 workflow (≤ 8 legs) em vez de 13 jobs; tempo total ≤ 50 % do atual.
- Prova: comparação de minutos por SHA.
- Depende de: E14, E23, E24, E43. Esforço: G. Classe: A.

### E86 — `e2e-focused.yml` para os focados de UI (cnpj, dialogs, calendar, swatch, thumb, personalization, collapse, optimized-image, color-swatch)
- Objetivo: 7 workflows/15 jobs rodam em todo PR sem paths (≈ 140–250 min/PR) e nenhum é required; `ui-visual-a11y` e `e2e-dialogs-pr-check` rodam as mesmas specs; `ConfirmDialog` vigiado em 2 caminhos diferentes.
- Onde: novo `e2e-focused.yml` com `dorny/paths-filter` (SHA) → matriz dinâmica; apagar os 11 focados.
- Como: mesma arquitetura de E85; cada linha da matriz declara `paths` próprios.
- Aceite: PR só de docs não roda Playwright; PR em `src/components/ui/ConfirmDialog.tsx` roda 1 leg.
- Prova: 2 PRs de teste.
- Depende de: E85. Esforço: G. Classe: A.

### E87 — Apagar `build-typecheck.yml` e `credentials-audit.yml`; `codeql` e `security` sem duplicação
- Objetivo: cópias integrais de passos de `quality-gate`/`ci`; `security.yml` gitleaks em `push: main` duplica `gitleaks-history-audit`; `codeql` 30 min por PR sem `concurrency` e `autobuild` no-op.
- Onde: os 4 arquivos.
- Como: apagar os 2; `security.yml` só PR + semanal (`GITLEAKS_ENABLE_COMMENTS: false`); `codeql` com `concurrency`, `paths-ignore: docs/**`, sem `autobuild`.
- Aceite: −2 workflows; gitleaks 1× por merge.
- Prova: runs por SHA.
- Depende de: —. Esforço: P. Classe: A.

### E88 — Um único dono para lint/tsc/build/smoke por PR
- Objetivo: `build` ×9, `tsc` ×5, `validate-supabase-config` ×4, `test:ci-core` ×4, `chromium-smoke` ×3 (`deploy-gates` Gate 3, `playwright.yml`, `e2e.yml`).
- Onde: `ci.yml`, `full-ci.yml`, `quality-gate.yml`, `deploy-gates.yml`, `e2e.yml`.
- Como: `deploy-gates.yml` é o dono de lint/tsc/build/smoke/unit-core; `ci.yml` vira `ci-security-drift.yml` (só dependency-audit + drift live); `quality-gate.yml` mantém apenas ratchets/contratos não cobertos (ou funde no Gate 1); `full-ci.yml` vira `nightly-full.yml` (regressão + cobertura completa); `e2e.yml` só header-sticky + regressão.
- Aceite: cada comando roda 1× por PR; `Gate Final` inalterado em conteúdo.
- Prova: tabela comando × workflow no PR.
- Depende de: E55, E48. Esforço: M. Classe: A.

### E89 — Política de artefatos e poda de cache
- Objetivo: `e2e-quote-freight-block` 203 MB/run × 14 d; uploads sem `retention-days` (default 90) em 6+ arquivos; `e2e.yml` upload duplo; 49 caches / 3 GB; `full-ci` cacheia 2×.
- Onde: todos os `upload-artifact`; novo `cache-prune.yml` semanal.
- Como: `retention-days: 7` (PR) / 14 (main) / 90 só evidências de auditoria; vídeos só em falha; `if-no-files-found: ignore`; poda de caches órfãos de branches apagadas.
- Aceite: 0 uploads sem `retention-days`; cache ≤ 2 GB.
- Prova: script E11 + API.
- Depende de: E11. Esforço: P. Classe: A.

### E90 — `url-state-unit`, `ts-unused-ratchet`, `lint-untyped-from`, `magazine-*`: filtros de caminho e cadência
- Objetivo: `url-state-unit` 1.120 runs sem paths; `lint-untyped-from` 5.468 runs; `ts-unused-ratchet` `tsc` completo em todo push; `magazine-mutation` 7 runs de vitest por PR.
- Onde: os 4 arquivos.
- Como: `paths` mínimos; `magazine-mutation` com `--only` em PR e completo no cron; `url-state-unit` funde no Gate 1 (é `vitest` de 3 arquivos).
- Aceite: runs/dia desses 4 caem ≥ 70 %.
- Prova: contagem semanal.
- Depende de: —. Esforço: P. Classe: A.

### E91 — gh-pages: poda dos relatórios E2E
- Objetivo: `e2e.yml:405-412` publica `e2e-report/<run_number>` com `keep_files: true` para sempre.
- Onde: `e2e.yml`; branch `gh-pages`.
- Como: job pós-publish remove pastas além das 20 mais recentes; `pages: write` só nesse job.
- Aceite: `gh-pages` ≤ 20 relatórios.
- Prova: `git ls-tree gh-pages`.
- Depende de: E08. Esforço: P. Classe: A.

### E92 — `stock-dashboard-stress`, `magazine-flakiness`, `daily-flows`: cadência e custo dos noturnos
- Objetivo: 4 jobs de 90 min às 03:00 (2/2 cancelados na janela); `magazine-flakiness` 10× a suíte todo dia; `daily-flows-simulation` diário.
- Onde: os 3 arquivos.
- Como: stress e flakiness semanais (`--repeat-each` menor no diário); `daily-flows` só se algo mudou desde o último run (`git diff --quiet` contra tag do último sucesso).
- Aceite: minutos de cron/semana ≤ 50 % do atual (excluídos os "pending").
- Prova: soma de durações.
- Depende de: E19. Esforço: P. Classe: A.

### E93 — Métricas de CI como artefato semanal
- Objetivo: nada mede runs/PR, minutos, taxa de falha, "verde vazio" — este plano só existe porque alguém somou 600 runs à mão.
- Onde: novo `ci-metrics-weekly.yml` + `scripts/ci-metrics.mjs` (API do GitHub, read-only) → `docs/ci/METRICAS_SEMANAIS.md` via PR da App.
- Como: por workflow: runs, minutos, falhas, `skipped`, `expected == 0`, duração p95; alerta se algum workflow passar 7 dias sem run (E10) ou 3 falhas seguidas.
- Aceite: primeiro relatório mergeado.
- Prova: PR.
- Depende de: E02, E23. Esforço: M. Classe: A.

---

## Fase 10 — Segurança e governança contínua (E94–E100)

### E94 — Rotacionar a chave `service_role` vazada e resolver o alerta #1
- Objetivo: alerta de secret scanning #1 (`supabase_service_key`, projeto `pqpdolkaeqlyzpdpbizo`, `scripts/contract-testing.mjs@b0cc98c`, `publicly_leaked: true`, aberto desde 19/05); a chave não está mais no HEAD mas está no histórico público.
- Onde: Supabase dashboard do projeto legado (rotacionar/desativar); alerta no GitHub.
- Como: PO rotaciona (ou pausa o projeto legado, se morto); fechar o alerta como `revoked`; `gitleaks-history-audit` já cobre recorrência.
- Aceite: alerta #1 `resolved`; chave antiga retorna 401.
- Prova: request com a chave antiga = 401.
- Depende de: —. Esforço: P. Classe: **PO**.

### E95 — Decisão: repositório público ou privado
- Objetivo: repo é `private: false` com CODEOWNERS, segredos de produção, dump de schema como artefato (E69), relatórios Lighthouse públicos (E58), histórico com chave vazada (E94). Actions é gratuito em público — é o único benefício.
- Onde: Settings → Visibility.
- Como: PO decide. Se privado: revisar cota de minutos (≈ 1.200 min/dia hoje → E85–E92 reduzem) e ligar GHAS/CodeQL (probe de `codeql.yml:31-60` já trata). Se público: E69/E58/E94 tornam-se obrigatórios e imediatos.
- Aceite: decisão registrada em `docs/ci/PADRAO_WORKFLOW.md`.
- Prova: —.
- Depende de: —. Esforço: P. Classe: **PO**.

### E96 — Triagem dos 62 alertas CodeQL (38 HIGH)
- Objetivo: `js/file-system-race` 8, `js/regex/missing-regexp-anchor` 6, `js/insecure-temporary-file` 5, `js/incomplete-url-substring-sanitization` 4, `js/insecure-randomness` 4, `js/clear-text-storage-of-sensitive-data` 3, `js/incomplete-sanitization` 3, `js/remote-property-injection` 2, `js/clear-text-logging` 1, `js/tainted-format-string` 1, `js/user-controlled-bypass` 1 (**38 HIGH total**; versão original do plano listava apenas 35 por omissão dessas 2 regras) + 28 medium (inclui `js/file-access-to-http` 1 também omitido na versão original).
- Onde: aba Security; código apontado.
- Como: 1 PR por regra (não por alerta); scripts de CI (`scripts/**`) primeiro (temp file/race/cmd-injection); falsos positivos dispensados com justificativa; meta: 0 HIGH abertos; `codeql` passa a falhar em HIGH novo (`fail-on: high` no upload).
- Aceite: 0 HIGH abertos; novo HIGH bloqueia PR.
- Prova: lista de alertas + PR mutante.
- Depende de: —. Esforço: G. Classe: A.

### E97 — Dependabot de versões funcionando + `dependency-review-action`
- Objetivo: `dependabot.yml` (10/09) nunca gerou run de versão (28 runs, todos `npm_and_yarn` de segurança); `check:dependency-audit` é a única barreira; sem revisão de dependências em PR.
- Onde: `.github/dependabot.yml`; Settings → Code security (Dependabot version updates); novo passo `actions/dependency-review-action` (SHA) em `deploy-gates` Gate 1 para `pull_request`.
- Como: verificar o log do job "Dependabot Updates" (aba Insights → Dependency graph → Dependabot) — provável config não habilitada ou erro de lockfile; corrigir; `dependency-review` com `fail-on-severity: high` e allowlist de licenças.
- Aceite: primeiro PR `chore(deps)`/`chore(ci)` do Dependabot aberto e verde (E59).
- Prova: PR.
- Depende de: E59. Esforço: P. Classe: **B**.

### E98 — Inventário e rotação de PATs
- Objetivo: `SUPABASE_ACCESS_TOKEN` (PAT longo compartilhado por ~20 workflows), `BRANCH_PROTECTION_READ_TOKEN`, `CART_TUNE_PAT`, `VERCEL_TOKEN`, `LHCI_GITHUB_APP_TOKEN` — vários inexistentes, nenhum com rotação; `PGSSLMODE: require` sem CA.
- Onde: `docs/ci/SEGREDOS.md` (novo: nome, escopo, workflows, environment, data de rotação, dono); segredos órfãos removidos dos workflows.
- Como: remover referências a segredos que não existem e não serão criados; mover os demais para environments; `verify-full` + `PGSSLROOTCERT`; cron semestral abre issue de rotação.
- Aceite: 0 `secrets.X` referenciados sem existir (E11 pode checar via API no `required-checks-guard`).
- Prova: cruzamento API × grep.
- Depende de: E03, E70. Esforço: M. Classe: **B**.

### E99 — SBOM e proveniência do build de produção
- Objetivo: nada atesta o que foi deployado (Lovable/Vercel fazem build fora do Actions; `dist-${run_id}` some em 7 d).
- Onde: `deploy-gates.yml` Gate 6 (`anchore/sbom-action` ou `npm sbom`) + `actions/attest-build-provenance` (SHA) em `push: main`.
- Como: SBOM CycloneDX como artefato 90 d; atestação do `dist/` do Gate 6 (o que o Vercel deveria servir — `api/health` já expõe `APP_COMMIT_SHA`).
- Aceite: todo push em `main` tem SBOM + atestação.
- Prova: `gh attestation verify` no PR.
- Depende de: E88. Esforço: M. Classe: A.

### E100 — Fechar o ciclo: CLAUDE.md, graphify, retrospectiva medida
- Objetivo: CLAUDE.md não descreve a esteira (só regras de conflito); grafo desatualizado (`GRAPH_REPORT.md` vs HEAD); este plano precisa de placar.
- Onde: `CLAUDE.md` (seção "CI — o que é required, onde cada gate mora, padrão E12"), `graphify update .`, `docs/plans/MATRIZ_PLANOS_2026-09.md` (linha por etapa com estado medido, como o plano DBA fez).
- Como: após ≥ 80 etapas mergeadas, rodar `scripts/ci-metrics.mjs` (E93) e comparar com a tabela da seção 1: workflows/PR, minutos/dia, `expected == 0`, workflows sem run, alertas abertos.
- Aceite: tabela antes/depois publicada; CLAUDE.md atualizado; `Built from commit` = HEAD.
- Prova: PR.
- Depende de: E93. Esforço: P. Classe: A.

---

## 4. Ordem recomendada e dependências críticas

1. **Semana 1 (destravar):** E01 → E02 → E03 → E04 → E05 → E08 → E09 → E10 → E21 → E22. Sem E01/E02 nenhum recibo funciona; sem E03 os crons de produção nunca completam; sem E21/E22 todo o resto da esteira E2E continua fictício.
2. **Semana 2 (fundação):** E11 → E12 → E13 → E14 → E17 → E18 → E15 → E16 → E19 → E23. A partir daqui cada workflow tocado já sai no padrão.
3. **Semanas 3–4 (honestidade dos gates):** E24–E42 em paralelo por grupo (cart/stock, quotes, e2e core, freight, segurança).
4. **Semanas 5–6 (baselines e bots):** E43–E52; E53–E62 exigem decisão do PO (E53, E54) antes.
5. **Semanas 7–8 (DB e deploy):** E63–E84; E83 é o marco (primeira migration verde ponta a ponta).
6. **Semanas 9–10 (consolidação):** E85–E93; só depois de E23/E43, senão a consolidação herda gates vazios.
7. **Contínuo:** E94–E100; E94 e E95 podem (devem) ser decididos na semana 1.

Decisões que só o PO pode tomar (Classe PO): E07, E16 (branch `master`), E22, E31 (aplicar E30/E33/E40), E53, E54, E73, E74, E75, E94, E95.
Ações que exigem PO antes do merge (Classe B): E01, E02, E03, E15 (flag), E59, E70, E79, E83, E97, E98.

## 5. O que este plano **não** propõe
- Não remove nenhuma guarda `// SSOT:`/`// GUARD:` nem altera `client.ts`, `validate-supabase-config.mjs`, `.lovableignore`, `sentinel-check.sh` (arquivos protegidos do CLAUDE.md) além do que E52 descreve no workflow do sentinel.
- Não aplica DDL nem deploy por MCP. Toda aplicação continua em E15/E66; E83 é o teste do caminho, não um atalho.
- Não reduz cobertura: os pisos reais listados em 2.8 são preservados; thresholds só sobem.
- Não converte `Gate Final` em algo maior antes de E55/E88 provarem que cada passo adicionado é determinístico e sem rede.

## 6. Próximos passos
1. Destravar os PRs automáticos — hoje deploy e migration terminam em erro por uma configuração do repositório · Settings → Actions (E01) + App token (E02)
2. Separar leitura e escrita em produção — dois monitores diários ficam presos esperando aprovação e nunca rodam · environment `production-readonly` (E03)
3. Criar o usuário de teste — sem ele, mais de 30 verificações "verdes" não testam nada · Supabase Auth + segredos (E21, E22)

---

## 7. Errata e gaps descobertos na validação pós-publicação (2026-09-27)

> Auditoria realizada por 5 agentes especializados em paralelo após o merge via PR #1906.
> Todas as correções referenciadas acima (E96, tabela de estado, ponto 1 e 4 do sumário) já foram aplicadas neste documento.

### 7.1 Erros corrigidos nesta revisão

| Erro | Versão original | Versão correta | Fonte |
|---|---|---|---|
| Contagem HIGH CodeQL | 35 | 38 | Agente segurança: API CodeQL retornou 38 HIGH; 2 regras omitidas |
| Subcategoria HIGH (aritmética) | soma implícita 35 | soma real 36 (+2 novas = 38) | `js/tainted-format-string` 1 + `js/user-controlled-bypass` 1 |
| MEDIUM omitido | — | `js/file-access-to-http` (1 alerta) | Agente segurança |
| "≥30 workflows verdes sem testar" | ≥30 | 35 sem credenciais; **11–15 com specs authed que skipam** | Agente E2E: 54 total Playwright, 35 sem qualquer credencial |

### 7.2 Bugs novos descobertos (não documentados no plano original)

1. **Role `'seller'` inexistente no tipo `Role`** — `e2e/carrinhos/list-url-state-restore.spec.ts` usa `loginAs(page, 'seller')`, mas `Role = "user" | "admin" | "dev" | "editor"` (`e2e/helpers/auth.ts:35`). TypeScript deveria rejeitar em build. Em runtime cai no `else` implícito e tenta `E2E_USER_EMAIL` com mensagem de erro enganosa `Credenciais E2E_SELLER_EMAIL/PASSWORD ausentes`.
   - Classe: bug de tipo; esforço: P; ação: adicionar `"seller"` ao union ou corrigir o spec.

2. **`loginAs` não usa `return` após `test.skip`** — `e2e/helpers/auth.ts:88-90`: o código continua para `await gotoAndSettle(page, "/")` após `test.skip(true, ...)`. Funciona porque Playwright lança exceção interna no skip, mas é padrão frágil que pode quebrar em versões futuras do Playwright.
   - Classe: fragilidade; esforço: P; ação: adicionar `return` após `test.skip`.

### 7.3 Claims confirmados com precisão aumentada

| Claim do plano | Status | Detalhe |
|---|---|---|
| `auth.setup.ts:41-48` grava storageState vazio | ✅ CONFIRMADO | Exato: `if (!email \|\| !password) { fs.writeFileSync(STORAGE, '{"cookies":[],"origins":[]}'); return; }` |
| `e2e/helpers/auth.ts:88-90` tem `test.skip` | ✅ CONFIRMADO | `if (!email \|\| !password) { test.skip(true, ...); }` |
| `e2e/fixtures/test-base.ts:182-186` tem duplo guard | ✅ CONFIRMADO | Guards em linhas 182–191 (não apenas 182–186) |
| `e2e-flows.yml:92` usa `vars.` onde deveria ser `secrets.` | ✅ CONFIRMADO | Lê `vars.E2E_USER_EMAIL` para a condição `if:` mas mapeia `secrets.E2E_USER_EMAIL` para a env var |
| `freight-quality-gates.yml:286-321` Gate 6 `$LINES < 0` | ✅ CONFIRMADO | Threshold literal é `< 0`; 0% de coverage passa |
| `e2e-flows.yml:248` usa `--project=routes-mobile` inexistente | ✅ CONFIRMADO | Projeto não existe em `playwright.config.ts`; `--pass-with-no-tests` mascara |
| 6 workflows documentados ainda falhando | ✅ CONFIRMADO | Zero resoluções em 27/09; mesmas causas raiz |

### 7.4 Estado dos 7 workflows falhando em 27/09/2026

| Workflow | Último run | Status | Causa raiz |
|---|---|---|---|
| `deploy-edge-functions.yml` | #272 (26/09) | ❌ failure | `gh pr create` bloqueado — Actions sem permissão de criar PRs |
| `db-apply-migration.yml` | #3 (23/09) | ❌ failure | Mesma causa; inativo desde 23/09 |
| `db-schema-drift-check.yml` | #498 (26/09) | ❌ failure | Ledger sem recibo da migration de 23/09 |
| `kit-coverage-integration.yml` | #99 (26/09) | ❌ failure | `capacity_ml` não existe + `permission denied` na view |
| `e2e-crm-callback-approved.yml` | #124 (26/09) | ❌ failure | Secret `CRM_CALLBACK_API_KEY` não configurado |
| `restore-seller-cart-rpc.yml` | #549 (26/09) | ⏳ pending | `environment: Production` sem reviewer → cron preso em loop |
| `security-definer-acl-multi-env.yml` | #570 (26/09) | ⏳ pending | Mesmo padrão de loop pending |

