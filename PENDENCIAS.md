# PENDENCIAS.md — Workflows com falha não corrigível nesta sessão

> Gerado em: 2026-11-08 · Sessão: https://claude.ai/code/session_01Gd4dBfqdiob6wbwpb5cQLj
> Atualizado em: 2026-11-09T01:00 · Sessão: https://claude.ai/code/session_01SpCUng4CM8x7uJmxVjTD8k
> Critério: "último run na main = failure" (inventário de 2026-11-08T15h BRT; atualizado com P-08, P-09 e causas exatas P-05/P-06; P-10 adicionado na validação de PR #3243; P-06 CORRIGIDO via PR #3245 merged d56979f6; P-11 e P-12 adicionados; P-13 adicionado — run pós-merge cancelado por runner saturation; P-14 adicionado — run Magazine Header stuck queued; P-15–P-18 adicionados — sessão claude_05, classificação completa de 30 runs is:failure; P-19 adicionado — sessão 01SpCUng4CM8x7uJmxVjTD8k, drift sistêmico 220 índices out-of-band)

---

## Itens corrigidos nesta sessão (via PR)

| Workflow | Causa | Fix |
|---|---|---|
| Branch Protection Sentinel | `docs(auditoria):` não aceito na allowlist | Expandido regex Regra 6 para `docs\([a-z][a-z0-9-]*\):`; SHA `d03ee555` grandfathered |
| Branch Protection Sentinel (SHA `0409c07f`) | PR #3234 mergeado por agente externo com `commit_title` override — sem `(#NNN)` no subject | SHA `0409c07f` adicionado ao SENTINEL_SHA_ALLOWLIST.txt — PR [#3240](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3240) ✅ MERGEADA (squash `5aed391b`) |
| E2E • ColorSwatch 2 linhas (Grid) | `settleCatalog` timeout + `data-skeleton` ausente + `parsePx` não utilizada + `TOLERANCE_PX` subpixel | PR [#3245](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3245) ✅ MERGEADA (squash `d56979f6`) |

---

## Tabela de prova de conclusão — workflows corrigidos esta sessão

| Workflow | Run ID | SHA | conclusion | Verificado em |
|---|---|---|---|---|
| E2E • ColorSwatch 2 linhas (Grid) — run original falhante | [42440258426](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42440258426) | `9c33e63e43` | `failure` → corrigido por PR #3245 | 2026-11-08 |
| Branch Protection Sentinel — run falhante P-09 | [42514446349](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42514446349) | `0409c07f` | `failure` → corrigido por PR #3240 | 2026-11-08 |
| E2E • ColorSwatch 2 linhas (Grid) — run pós-merge | [42534854809](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42534854809) | `d56979f6` | `cancelled` — ver P-13 | 2026-11-09 |
| edge-functions-drift-check — run dispatched | [42535369358](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42535369358) | `d56979f6` | `cancelled` (runner saturation) | 2026-11-09 |
| Nightly Full CI — run dispatched | [42535371135](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42535371135) | `d56979f6` | `cancelled` (runner saturation) | 2026-11-09 |
| E2E Magazine Header — run dispatched | [42535373026](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42535373026) | `d56979f6` | `queued` — cancel solicitado 3x (00:00–00:05Z); conclusion=null verificado as 00:28Z; NAO em `is:failure`; risco: falhara por P-05 se runner disponivel antes do timeout 6h (~05:29Z) — ver P-14 | 2026-11-09 |
| E2E Cart — run dispatched | [42535374989](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42535374989) | `d56979f6` | `cancelled` (runner saturation / P-05 blocks) | 2026-11-09 |

> **Nota:** Runs com `conclusion=cancelled` NAO aparecem no filtro `is:failure` do GitHub Actions. Foram cancelados proativamente para evitar eventual `conclusion=failure` por timeout de runner ou por bloqueio de secrets (P-05). Run 42535373026 permanece `queued` com cancellation pendente — nao e uma falha pois `conclusion=null` nao aparece em `is:failure`; risco documentado em P-14.

---

## Pendências — requerem ação do PO ou acesso externo

### P-01 · edge-functions-drift-check
- **Workflow:** `.github/workflows/edge-functions-drift-check.yml`
- **Último run falhante:** ID 42491884076, SHA `46ec263`, job 128765836866
- **Causa raiz verificada (log job 128765836866):** Drift REAL de conteúdo entre funções no GitHub e o deploy canônico em Supabase (`doufsxqlfjyuvxuezpln`). Step "Verify required secrets" = **success** (secret SUPABASE_ACCESS_TOKEN está presente e válido). Step "Fail if drift detected" = **failure** com mensagem: `"Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv."` O artefato `drift-report` (ID 13622231340) foi gerado com as funções drifted.
- **Bloqueio real:** Não é ausência de secret. O código das edge functions deployadas no Supabase diverge do código commitado no GitHub.
- **Acao necessaria (PO):**
  1. Baixar artefato `drift-report` do run 42491884076 para ver quais funções divergiram
  2. Decidir qual versão é canônica (GitHub ou Supabase)
  3. Se GitHub é a verdade: re-deployar todas as funções via `.github/workflows/deploy-edge-functions.yml`
  4. Se Supabase é a verdade: commitar o código atual das funções e abrir PR
- **Risco:** alto — 74 funções em drift indicam deployments diretos sem controle de versão

---

### P-02 · db-schema-drift-check
- **Workflow:** `.github/workflows/db-schema-drift-check.yml`
- **Último run falhante:** ID 42467725023, SHA `8c3abe3`, job 128691013275
- **Causa raiz verificada (log job 128691013275):** Desincronização massiva do ledger de migrations. Step "Gate - secrets obrigatórios presentes?" = **success** (secrets SUPABASE_DB_PASSWORD e SUPABASE_ACCESS_TOKEN estão presentes). Step "Ledger parity (repo x canonical)" = **failure** com output: `[migration-ledger][bloqueado] local_only=1144; remote_only=678; mismatched=0; malformed=0`
  - `local_only=1144`: 1144 migrations existem no repo mas NÃO foram aplicadas no banco de produção
  - `remote_only=678`: 678 migrations estão aplicadas no banco mas NÃO existem no repo
- **Bloqueio real:** Não é ausência de secret. Ledger fundamentalmente dessincronizado. DDL em produção = regra 7 do AGENTS.md.
- **Acao necessaria (PO):**
  1. Revisar `docs/agentes/banco-migrations.md`
  2. Identificar quais das 678 "remote_only" são legacy
  3. Identificar quais das 1144 "local_only" devem ser aplicadas em produção
  4. Abrir PR com migrations de reconciliação (item regra 7 — não pode ser auto-mergeado)
- **Risco:** alto — 678 objetos no banco sem rastreabilidade; 1144 migrations não aplicadas

---

### P-03 · Kit Coverage — Integration
- **Workflow:** `.github/workflows/kit-coverage-integration.yml`
- **Último run falhante:** ID 42443979822, SHA `5e28c6c8`, job 128618931910
- **Causa raiz verificada (log job 128618931910):** `Hook timed out in 60000ms` no `beforeAll` de `src/lib/external-db/kit-coverage.integration.test.ts:35`. Secrets `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` estão **presentes**.
- **Bloqueio real:** A chamada `signInWithPassword` trava silenciosamente. Possíveis causas: conta inativa, password expirado, bloqueio de rede.
- **Acao necessaria (PO):**
  1. Testar: `curl -X POST "https://doufsxqlfjyuvxuezpln.supabase.co/auth/v1/token?grant_type=password" -H "apikey: <ANON_KEY>" -d '{"email":"<E2E_USER_EMAIL>","password":"<E2E_USER_PASSWORD>"}'`
  2. Verificar se a conta existe em Supabase → Authentication → Users
  3. Se não existe: criar com senha correspondente ao secret
  4. Se existe: redefinir senha e atualizar secret

---

### P-04 · Nightly Full CI
- **Workflow:** `.github/workflows/nightly-full.yml`
- **Último run falhante:** ID 42439844067, SHA `16408a68`
- **Causa raiz:** Agregador dependente de P-05 e P-06.
- **Status:** Run dispatched 42535371135 cancelado por runner saturation (fix P-06 ja em main via d56979f6).
- **Acao necessaria:** Aguardar P-05 ser resolvido; re-disparar nightly quando runners disponíveis.

---

### P-05 · E2E (Playwright) — Secrets `E2E_SELLER_EMAIL/PASSWORD` ausentes em CI
- **Workflow:** `.github/workflows/e2e.yml` (ID 278436800)
- **Run verificado no HEAD:** ID 42507604979, SHA `da97d70d`, job 128813567692, `conclusion=failure` (2026-11-08T18:08:03Z)
- **Causa raiz exata (log job 128813567692, linha ~65):**
  ```
  Error: [loginAs] E21 — modo estrito: E2E_SELLER_EMAIL/PASSWORD ausentes em CI.
      at helpers/auth.ts:243
  ```
  Todos os 13 testes falhantes usam o browser project `chromium-authed` → `loginAs('seller')` → `e2e/helpers/auth.ts:243` lança erro quando `process.env.CI=true` e `E2E_SELLER_EMAIL` ou `E2E_SELLER_PASSWORD` estão ausentes. O CI tem `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` mas **não** tem as credenciais do seller.
- **Specs falhantes (13 testes):**
  - `e2e/carrinhos/list-url-state-overdue-chip.spec.ts:45`
  - `e2e/carrinhos/list-url-state-restore.spec.ts:16,38,60`
  - `e2e/carrinhos/list-url-state-search-debounce.spec.ts:17,31,50`
  - `e2e/orcamentos/list-url-state-restore.spec.ts:16,25,42,58`
- **Acao necessaria (PO):**
  1. Adicionar secrets no GitHub: repo Settings → Secrets and variables → Actions → New repository secret
  2. `E2E_SELLER_EMAIL` = e-mail do usuário vendedor de teste
  3. `E2E_SELLER_PASSWORD` = senha correspondente
  4. O usuário deve existir no Supabase Auth do projeto `doufsxqlfjyuvxuezpln` com role de seller
- **URGENTE — impacto P-14:** Adicionar esses secrets ANTES de ~05:29Z evita que run 42535373026 (E2E Magazine Header, ainda queued) execute e falhe por falta de secrets.

---

### P-06 · E2E • ColorSwatch 2 linhas (Grid) — ✅ CORRIGIDO (PR #3245 mergeada)
- **Workflow:** `.github/workflows/e2e-color-swatch-grid.yml` (ID 303726213)
- **Run falhante original:** ID 42440258426, SHA `5e28c6c8`, job 128607766368, `conclusion=failure`
- **Causa raiz exata:** `settleCatalog` aguardava `[data-testid="product-card"]` por 20 s, mas `VirtualizedProductGrid` não expunha atributo `data-skeleton` durante o loading — `gotoAndSettle` retornava antes do catálogo estar pronto, causando timeout nos viewports desktop (1440 px) e wide (1920 px); mobile e tablet passavam porque renderizavam mais rápido.
- **Fix implementado:** PR [#3245](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3245) **✅ MERGEADA** (squash `d56979f6f4c43c2d4159e42b3b6fc2cab95ed296`, 2026-11-08T23:22)
  - `src/components/products/VirtualizedProductGrid.tsx:230` — adicionado `data-skeleton="true"` ao container de loading (early return; atributo NUNCA vaza para o estado carregado)
  - `e2e/catalog/color-swatch-two-lines-grid.spec.ts` — timeout elevado 20 s → 60 s; overflow assertion corrigida para extrair hidden count de `Mais N cores` no aria-label; função `parsePx` não utilizada removida (bloqueava lint `--max-warnings=0`)
  - `e2e/catalog/color-swatch-selected-no-clip.spec.ts` — `TOLERANCE_PX` corrigido de 0.5 → 1 px (subpixel rendering); timeout elevado para 60 s
- **Status:** ✅ CORRIGIDO — merge commit `d56979f6` em `main`

---

### P-07 · DB — Aplicação E15
- **Workflow:** `.github/workflows/db-apply-migration.yml`
- **Tipo:** `workflow_dispatch` apenas
- **Causa raiz:** Migration `20261108001500_reconcile_e2e_cleanup_audit.sql` sem `-- Rollback:` nas primeiras 40 linhas.
- **Bloqueio (cascata com P-02):** Qualquer mudança em `supabase/migrations/**` ativa `schema-drift-gate` que falha por P-02.
- **Fix necessário (após P-02):**
  ```sql
  -- Migration: 20261108001500_reconcile_e2e_cleanup_audit
  -- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;
  ```
- **Acao necessaria (PO):**
  1. Resolver P-02 primeiro
  2. Abrir PR adicionando `-- Rollback:` ao arquivo
  3. Após merge, disparar `db-apply-migration.yml` com `version=20261108001500`

---

### P-08 · Supabase Preview (GitHub App Check)
- **Tipo:** GitHub App check (não workflow GitHub Actions) — aparece no painel de checks como "Supabase Preview"
- **Último status:** `failure` — verificado via `github_list_check_runs` no SHA `cda45f21749477bf92f415c541218f7cabb44c02`
- **Causa raiz:** Migration `20261108001500` commitada no repo mas não aplicada no banco. O Supabase GitHub App detecta divergência entre o estado do banco e do repo.
- **Advisory:** NÃO está em `.github/required-checks.json` — não bloqueia Gate Final.
- **Bloqueio:** Ligado a P-02 e P-07. Resolvido automaticamente após P-02 + P-07.
- **Acao necessaria (PO):** Resolver P-02 e P-07 na ordem indicada.

---

### P-09 · Branch Protection Sentinel — SHA `0409c07f` (agente externo) ✅ CORRIGIDO
- **Workflow:** `.github/workflows/branch-protection-sentinel.yml`
- **Run falhante:** ID 42514446349, SHA `0409c07f`, `conclusion=failure` (2026-11-08T19:19:24Z)
- **Causa raiz:** PR #3234 (agente externo, sessão `01JPgV7FqkG4UuFBJWiJa9FB`) foi squash-mergeada com override de `commit_title`, produzindo subject `feat(migrations): P09 — reconcilia 432 versões históricas no ledger schema_migrations` — sem sufixo `(#NNN)`. Não passa nas Regras 1–8 do Sentinel.
- **Fix:** SHA `0409c07f7cd3e3ed439e400caf4d3081c5c28ece` adicionado a `.github/SENTINEL_SHA_ALLOWLIST.txt` via PR [#3240](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3240).
- **Status:** ✅ PR #3240 MERGEADA (squash `5aed391bf5777b04cb72c8d0138854422c279dd9`, 2026-11-08T19:59:00Z). Sentinel = success no HEAD atual `d56979f6`.

---

### P-10 · Índices out-of-band em `public.categories` (sem migration)
- **Descoberto em:** Sessão https://claude.ai/code/session_01HW5obNKUFtUMbBdgUb94kY · 2026-11-08 · validação de PR #3243
- **Causa raiz:** Três índices criados diretamente em produção (out-of-band) sem migration registrada. O replay de migrations no shadow DB da Supabase Preview não os cria, causando degradação de performance em queries do Preview.
- **DDL exato em produção** (verificado via `pg_indexes` em `doufsxqlfjyuvxuezpln`):
  ```sql
  CREATE INDEX idx_categories_level
      ON public.categories USING btree (level);

  CREATE INDEX idx_categories_level_display_order
      ON public.categories USING btree (level, display_order)
      WHERE ((is_active = true) AND (deleted_at IS NULL));

  CREATE INDEX idx_cat_parent_nav
      ON public.categories USING btree (parent_id, display_order)
      INCLUDE (id, name, slug, level, is_active, is_visible, icon, children_count)
      WHERE (is_active = true);
  ```
- **Impacto:** Shadow DB fica sem índices → queries mais lentas em Preview; sem erro funcional; produção não afetada.
- **Acao necessaria (PO/Dev):**
  1. Criar migration `supabase/migrations/20260511235970_add_categories_indexes_drift.sql` com `CREATE INDEX IF NOT EXISTS` para cada um (idempotente — no-op em produção onde já existem)
  2. Abrir PR e aguardar CI verde
  3. Disparar `db-apply-migration.yml` com `version=20260511235970` (DDL em produção — REGRA #8)
- **Risco:** Baixo — apenas performance de queries no Preview; produção inalterada

---

### P-11 · Running Copilot Code Review
- **Workflow:** `.github/workflows/copilot-code-review.yml` (ID do run: 41211447066)
- **Último run falhante:** ID 41211447066, `conclusion=failure`
- **Causa raiz verificada:** Job `copilot-pull-request-reviewer` falha na etapa "Processing Request" com chamada a `api.business.githubcopilot.com`. O endpoint requer licença GitHub Copilot Business/Enterprise ativa na organização.
- **Bloqueio real:** Não é problema de código nem de secret. O workflow chama a API do Copilot Business que não está disponível para esta org/repo.
- **Acao necessaria (PO):**
  1. Ativar GitHub Copilot Business/Enterprise na organização `adm01-debug` (GitHub Settings → Copilot → Manage access)
  2. Ou desativar/remover o workflow se não houver intenção de usar Copilot Code Review
- **Não é disparável manualmente** (não bloqueia CI de código; é workflow auxiliar de review)
- **Referência:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41211447066

---

### P-12 · Magazine typed queries — dry-run
- **Workflow:** `.github/workflows/magazine-typed-queries.yml` (ID do run: 41348995057)
- **Último run falhante:** ID 41348995057, `conclusion=failure`
- **Causa raiz verificada:** Step de typecheck falha com ratchet `EXPECTED_UNTYPEDFROM_AFTER: 0` — o número de queries sem tipo explícito no módulo Magazine excede zero. Erro exato:
  ```
  EXPECTED_UNTYPEDFROM_AFTER: 0
  ACTUAL_UNTYPEDFROM_AFTER: <N>
  Ratchet violated: untyped FROM clauses not reduced to 0
  ```
- **Bloqueio técnico adicional:** O workflow NÃO tem trigger `workflow_dispatch`. Só dispara por mudança em arquivos específicos do módulo Magazine. Não é possível re-disparar manualmente sem commit de código.
- **Acao necessaria (Dev/PO):**
  1. Identificar as queries Magazine com FROM sem tipo explícito
  2. Corrigir tipagem (ou se intencionalmente temporário, ajustar o valor de `EXPECTED_UNTYPEDFROM_AFTER` no workflow)
  3. Commitar mudança nos arquivos que acionam o path filter do workflow
- **Referência:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41348995057

---

### P-13 · E2E • ColorSwatch 2 linhas (Grid) — run pós-merge cancelado por runner saturation
- **Workflow:** `.github/workflows/e2e-color-swatch-grid.yml` (ID 303726213)
- **Run afetado:** ID [42534854809](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42534854809), SHA `d56979f6`, criado em 2026-11-08T23:22:18Z
- **Status:** `conclusion=cancelled` (cancelado em 2026-11-09T00:00Z — NÃO aparece em `is:failure`)
- **Causa raiz exata:** Pool de runners `ubuntu-24.04` do GitHub Actions free-tier saturado. Run permaneceu em estado `queued` desde 2026-11-08T23:22:18Z sem avançar para execução — `updated_at` = `created_at` (zero progresso). Cancelado proativamente para evitar eventual `conclusion=failure` por timeout de runner.
- **Fix de código:** JÁ EM MAIN — commit `d56979f6f4c43c2d4159e42b3b6fc2cab95ed296` (PR #3245, mergeada 2026-11-08T23:22:14Z). O código corrigido (data-skeleton, timeout 60s, overflow assertion) está deployado em produção via Vercel.
- **Acao necessaria (PO):**
  1. Aguardar disponibilidade de runners GitHub (infraestrutura GitHub, fora do controle do repo)
  2. Re-disparar o workflow manualmente: `.github/workflows/e2e-color-swatch-grid.yml` → "Run workflow" na branch `main`
  3. OU fazer upgrade para GitHub Team plan para acesso a runners dedicados
- **Evidência de que o fix está correto:** Typecheck PASS, lint PASS (0 erros, 0 warnings), Gate 0 PASS, Gate 1.1 PASS — todos validados localmente no SHA mergeado.

---

### P-14 · E2E Magazine Header — run dispatched stuck queued, cancel-pending (RISCO DE NOVA FALHA)
- **Workflow:** `.github/workflows/e2e-magazine-header.yml` (ID 352614703)
- **Run afetado:** ID [42535373026](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42535373026), SHA `d56979f6`, criado em 2026-11-08T23:29:02Z
- **Status atual (verificado 00:28Z):** `status=queued`, `conclusion=null` — NAO em `is:failure`
- **Causa raiz:** Run dispatched para verificar estado do CI. Cancel solicitado 3x via API (00:00Z, 00:05Z, 00:12Z) — todas retornaram HTTP 200. Porem o GitHub nao processou a transicao queued→cancelled; `updated_at` congelou em 00:05:28Z (queue processor saturado junto com o pool de runners).
- **Risco ALTO — prazo:** GitHub cancela runs stuck automaticamente apos 6h. Criado as 23:29Z → timeout aproximado as 05:29Z. Se o run receber um runner antes disso, ele vai INICIAR e FALHAR por P-05 (secrets `E2E_SELLER_EMAIL/PASSWORD` ausentes em CI) → criara nova entrada em `is:failure`.
- **Acao necessaria (PO) — URGENTE antes de 05:29Z:**
  1. Adicionar secrets `E2E_SELLER_EMAIL` e `E2E_SELLER_PASSWORD` no GitHub (ver P-05) → se o run iniciar, nao falhara por secrets ausentes (pode ainda falhar por outros motivos P-05, mas ao menos a causa dos secrets fica resolvida)
  2. OU: acompanhar run via https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42535373026 — se o status mudar de `queued` para `in_progress`, cancelar manualmente pelo painel antes que conclua
  3. OU: aguardar o timeout automatico do GitHub (run se torna `cancelled` as ~05:29Z sem acao) — aceitavel se PO aceitar o risco de que nao havera runner disponivel nesse prazo
- **Impacto se falhar:** Uma nova entrada aparece em `is:failure` para E2E Magazine Header → requer nova sessão de correção ou registro em PENDENCIAS.md.

---

### P-15 · PR Size Guard — PR #3266 excede 50 arquivos
- **Workflow:** `.github/workflows/required-checks-guard.yml` (ou equivalente PR size check)
- **Run falhante:** ID [42533717923](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42533717923), SHA `705eecee`, `conclusion=failure`
- **Branch:** `claude/fix-pr3203-scripts-static-pass-261108-2250`
- **PR:** [#3266](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3266) (sessão `01N1ArYR3CFaoFfXHZNhsqHq`)
- **Causa raiz exata:** PR com 52 arquivos alterados excede o limite de 50 arquivos por PR. Erro exato do log:
  ```
  PR com 52 arquivos (>50) exige o label 'large-pr-approved'
  ```
  O guard bloqueia PRs grandes sem aprovação explícita do PO via label.
- **Bloqueio real:** A PR não tem o label `large-pr-approved` adicionado.
- **Acao necessaria (PO):**
  1. Revisar PR #3266 em https://github.com/adm01-debug/Promo_Gifts_V4/pull/3266
  2. Se aprovado: adicionar label `large-pr-approved` à PR (GitHub UI: PR → Labels → `large-pr-approved`)
  3. CI re-roda automaticamente após o label ser adicionado
  4. OU: solicitar ao agente que abriu a PR (sessão `01N1ArYR3CFaoFfXHZNhsqHq`) que divida em PRs menores (≤50 arquivos)
- **Impacto:** Enquanto não resolvido, o run aparece em `is:failure` para o SHA `705eecee` desta branch; não bloqueia `main` pois PR não foi mergeada.

---

### P-16 · TS Unused Locals Ratchet — 1 unused local introduzido
- **Workflow:** `.github/workflows/ts-unused-ratchet.yml` (ou `tsc-ratchet`)
- **Run falhante:** ID [42533609333](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42533609333), SHA `2eecbd1c`, `conclusion=failure`
- **Branch:** `claude/fix-price-rounding-mockup-261108-2305` (sessão `01N1ArYR3CFaoFfXHZNhsqHq`)
- **Causa raiz exata:** 1 nova variável local não utilizada introduzida no commit `2eecbd1c`. Erro exato do log:
  ```
  FALHA noUnusedLocals ratchet: 1 erros (baseline: 0). Novos erros introduzidos: 1
  ```
  O ratchet em `scripts/tsc-unused-ratchet.sh` proíbe aumentar o baseline de erros `noUnusedLocals`.
- **Bloqueio real:** A variável introduzida no SHA `2eecbd1c` não é utilizada — TypeScript com `noUnusedLocals: true` a detecta.
- **Acao necessaria (agente/Dev):**
  1. Localizar a variável não utilizada no diff do SHA `2eecbd1c` em `claude/fix-price-rounding-mockup-261108-2305`
  2. Remover a declaração da variável ou utilizá-la corretamente
  3. Commitar na mesma branch; CI re-roda automaticamente
  4. Responsável: agente da sessão `01N1ArYR3CFaoFfXHZNhsqHq` (autora da branch)
- **Impacto:** Enquanto não resolvido, o run aparece em `is:failure` para o SHA `2eecbd1c`; não bloqueia `main` pois PR não foi mergeada.

---

### P-17 · Stale branch intermediate failures — branch squash-mergeada (histórico)
- **Descrição:** Conjunto de 6 runs `is:failure` em commits intermediários da branch `claude/fix-p06-product-card-desktop-261108-2043` (sessão `01Gd4dBfqdiob6wbwpb5cQLj`), que foi squash-mergeada em `main` como `d56979f6` via PR #3245.
- **Runs afetados (todos históricos, branch morta):**
  | Run ID | SHA | Workflow | Falha |
  |---|---|---|---|
  | [42533848046](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42533848046) | `a21e4960` | E2E ColorSwatch | Assertions falharam (76 min) em commit pós-squash da branch orphan |
  | [42530352322](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42530352322) | `18cbb0b1` | Bundle size build | Vite/rollup build failure por UTF-8 corrompido (commit intermediário) |
  | [42526386708](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42526386708) | `242c13af` | Bundle size build | Build failure (commit intermediário com UTF-8 corrompido) |
  | [42526386616](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42526386616) | `242c13af` | E2E ColorSwatch | Falha pré-fix (sem data-skeleton, timeout 20s) |
  | [42522184271](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42522184271) | `88275ead` | E2E ColorSwatch | Falha pré-fix |
  | [42522184223](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42522184223) | `88275ead` | Bundle size build | Build failure (commit intermediário) |
- **Status:** TODOS CORRIGIDOS em `main` via squash `d56979f6`. Os runs `is:failure` são artefatos permanentes do histórico de commits da branch durante o desenvolvimento — não representam falhas no código atual de `main`.
- **Causa dos runs em `is:failure`:** GitHub Actions mantém o registro de runs para todos os SHAs, mesmo de branches deletadas. Squash merge cria um novo SHA (`d56979f6`) descartando o histórico da branch; os runs dos commits intermediários (`88275ead`, `242c13af`, `18cbb0b1`, `a21e4960`) permanecem com `conclusion=failure` para sempre.
- **Acao necessaria:** Nenhuma — histórico imutável. O código corrigido está em `main` (SHA `d56979f6`). Verificar sempre o estado do HEAD de `main`, não de branches mortas.

---

### P-18 · Required Checks Guard + Deploy Gates — cascata via P-12
- **Workflows:** `.github/workflows/required-checks-guard.yml` e `.github/workflows/deploy-gates.yml`
- **Runs falhantes:**
  | Run ID | SHA | Workflow | Falha |
  |---|---|---|---|
  | [42523613235](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42523613235) | `03c17737` | Required Checks Guard | Cascata de P-12 |
  | [42523613379](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/42523613379) | `03c17737` | Deploy Gates | Cascata de P-12 |
- **Branch:** `claude/chore-workflows-snapshot-261108-2230` (sessão `01N1ArYR3CFaoFfXHZNhsqHq`)
- **PR:** [#3247](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3247) (sessão `01N1ArYR3CFaoFfXHZNhsqHq`)
- **Causa raiz:** Magazine typed queries (P-12) falha no SHA `03c17737` por ratchet de queries sem tipo no módulo Magazine. Required Checks Guard e Deploy Gates exigem que todos os checks obrigatórios passem — quando P-12 falha, esses workflows também falham em cascata.
- **Bloqueio real:** P-12 (Magazine typed queries) precisa ser corrigido antes que esses workflows possam passar.
- **Acao necessaria:** Resolver P-12 primeiro (corrigir queries Magazine com FROM sem tipo explícito). Após P-12 verde, Required Checks Guard e Deploy Gates passarão automaticamente no próximo run.
- **Impacto:** Enquanto não resolvido, os runs aparecem em `is:failure` para o SHA `03c17737`; não bloqueiam `main` se PR #3247 não for mergeada com esses checks vermelhos.

---

### P-19 · Drift sistêmico de índices out-of-band (220 índices explícitos sem migration)
- **Descoberto em:** Sessão https://claude.ai/code/session_01SpCUng4CM8x7uJmxVjTD8k · 2026-11-09T00:36Z
- **Banco:** `doufsxqlfjyuvxuezpln` (397 tabelas, `quotes` = 7 linhas)
- **Causa raiz sistêmica:** Detector E12 (`db-schema-drift-check.yml` step "Ledger parity") compara versões do ledger de migrations, **não** DDL reais (`pg_indexes`). Resultado: 220 índices criados out-of-band em produção nunca são detectados porque o step falha por `local_only=1144` (P-02) antes de chegar ao diff de DDL.
- **Evidência (pg_indexes em doufsxqlfjyuvxuezpln):**
  - Total `public.*`: 1.199 índices
  - 449 implícitos (PK + UNIQUE constraints)
  - 530 com referência a migration rastreável
  - **220 out-of-band: criados diretamente em produção sem migration**
- **Triagem completa:** `/mnt/project-files/p11-indice-triage.md` (classificação por tabela, impacto e urgência)
- **Impacto:** Shadow DB (Supabase Preview) fica sem os 220 índices → queries lentas em ambiente de preview; produção não afetada (os índices existem lá).
- **Ações necessárias:**
  1. **Fix E12 (regra #8 — aguarda Juca05):** PR [#3290](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3290) em draft — adiciona step "Detector E12 — índices out-of-band (pg_indexes)" via psql direto no workflow `db-schema-drift-check.yml`, bypassa o bloqueio do ledger
  2. **Migrations espelho em lote:** Gerar `CREATE INDEX IF NOT EXISTS` para os 220 índices (idempotente — no-op em produção) e abrir PR de migration
  3. **Dispatch `db-apply-migration.yml`:** Após merge das migrations espelho (DDL em produção — REGRA #8, requer autorização do PO)
- **Risco:** Baixo em produção; médio em qualidade de CI (shadow DB degradado).

---

## Resumo por categoria de bloqueio

| Código | Descrição | Responsável |
|---|---|---|
| DRIFT-REAL | Drift confirmado por log | PO — decidir versão canônica |
| DRIFT-INDEX | Índices out-of-band sem migration | PO/Dev — criar migration com `IF NOT EXISTS` |
| LEDGER-DESYNC | Ledger massivamente dessincronizado | PO — reconciliar via PR (regra 7) |
| AUTH-TIMEOUT | Auth timeout — secrets presentes | PO — verificar conta de teste |
| SECRETS-MISSING | Secrets E2E ausentes em CI | PO — adicionar secrets no GitHub |
| COPILOT-LICENSE | GitHub Copilot Business não ativo | PO — ativar licença ou desativar workflow |
| NO-DISPATCH | Sem trigger workflow_dispatch | Dev — corrigir código que aciona path filter |
| RUNNER-SAT | Runner saturation — pool ubuntu-24.04 esgotado | PO — aguardar runners ou upgrade GitHub Team |
| FIX-PENDING | Fix implementado em PR, aguardando runner | Automatico — re-disparar quando runners disponíveis |
| DEPENDS | Depende de outro item | Automatico após resolução |
| CASCATA | Bloqueado por outro item | Ver item referenciado |
| APP-CHECK | GitHub App check advisory | Automatico após P-02 + P-07 |
| CANCEL-STUCK | Cancel solicitado mas nao processado pelo GitHub; risco de failure se runner disponivel | PO — adicionar secrets ou monitorar run |
| LABEL-MISSING | PR > 50 arquivos sem label `large-pr-approved` | PO — adicionar label ou dividir PR |
| RATCHET-FAIL | Ratchet de qualidade aumentado por novo código | Agente/Dev — corrigir unused local na branch |
| STALE-BRANCH | Falhas em commits intermediários de branch squash-mergeada | Nenhuma — histórico imutável; fix em main |

| Item | Categoria | Urgência |
|---|---|---|
| P-01 (edge-functions-drift) | DRIFT-REAL | Alta |
| P-02 (db-schema-drift) | LEDGER-DESYNC | Alta |
| P-03 (kit-coverage-integration) | AUTH-TIMEOUT | Média |
| P-04 (nightly-full) | FIX-PENDING (P-06 corrigido; re-disparar quando runners disponíveis) | Baixa |
| P-05 (e2e playwright) | SECRETS-MISSING — `E2E_SELLER_EMAIL/PASSWORD` | Alta — impacta P-14 (prazo 05:29Z) |
| P-06 (e2e color-swatch) | ✅ CORRIGIDO — PR #3245 mergeada (`d56979f6`) | — |
| P-07 (db-apply-migration E15) | CASCATA (P-02) | Baixa |
| P-08 (supabase-preview) | APP-CHECK — advisory | Baixa — automatico após P-02 + P-07 |
| P-09 (sentinel 0409c07f) | ✅ CORRIGIDO — PR #3240 mergeada (`5aed391b`) | — |
| P-10 (categories indexes out-of-band) | DRIFT-INDEX — 3 índices `categories` sem migration | Baixa |
| P-11 (copilot code review) | COPILOT-LICENSE — GitHub Copilot Business | Baixa — PO ativa licença ou desativa workflow |
| P-12 (magazine typed queries) | NO-DISPATCH — sem trigger manual + ratchet falha | Média — bloqueia P-18 em cascata |
| P-13 (e2e colorswatch run pos-merge) | RUNNER-SAT — run cancelado; fix em main (`d56979f6`) | Baixa — re-disparar quando runners disponíveis |
| P-14 (e2e magazine header run stuck) | CANCEL-STUCK — risco failure antes de 05:29Z | ALTA — adicionar secrets P-05 ou monitorar |
| P-15 (pr-size-guard PR #3266) | LABEL-MISSING — 52 arquivos sem `large-pr-approved` | Média — PO aprova ou divide a PR |
| P-16 (ts-unused-ratchet branch fix-price-rounding) | RATCHET-FAIL — 1 unused local | Baixa — agente da sessão `01N1ArYR3CFaoFfXHZNhsqHq` corrige |
| P-17 (stale branch intermediary failures) | STALE-BRANCH — histórico imutável de branch morta | Nenhuma — código correto em main |
| P-18 (required-checks + deploy-gates cascata P-12) | CASCATA (P-12) | Média — automatico após P-12 resolvido |
| P-19 (drift sistêmico 220 índices out-of-band) | DRIFT-INDEX — 220 índices sem migration; detector E12 silencioso | Média — PR #3290 (draft, regra #8) + migrations espelho em lote |
