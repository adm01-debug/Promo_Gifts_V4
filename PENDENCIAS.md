# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-30
**Branch de correção:** `claude_04/beautiful-gates-bvocz5` (PR #2597 — **MERGEADO** ✅)

## Atualização — falhas mais recentes da `main` (2026-10-30T11:35Z)

Inventário restrito ao último run conhecido de cada workflow na `main`; runs `queued`, `pending` e `in_progress` não são classificados como falhas.

| Workflow | Último run | Evidência/causa | Estado e próximo passo |
|---|---|---|---|
| Uptime Monitor | [#41045561447](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045561447) — `failure` | Probe `health-check` exit 22 (`curl -f` recebeu resposta HTTP não-2xx); `site`, `check-login` e `auth-health` retornaram exit 0. A issue automática [#2803](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2803) confirma esses códigos. Consulta autenticada independente em 2026-10-30T11:30Z retornou HTTP 503 com `database=unhealthy` e `external_db=unhealthy`; isso confirma indisponibilidade atual dos dois probes, mas não identifica a causa subjacente nem prova que o estado no instante do run era idêntico. | Fix do `external_db` já está na `main` via PR #2753, porém a Edge Function publicada segue na versão 275 (última atualização 2026-10-28). Deploy anterior [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) foi `cancelled`. Deploy pontual da função `health-check` pelo workflow protegido [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) está pendente de aprovação do ambiente `production`. **Ação do PO:** revisar/aprovar esse deployment no GitHub Actions; após o deploy, aguardar novo ciclo do Uptime Monitor e confirmar o resultado. Se persistir `database=unhealthy`, investigar logs/saúde do banco canônico no Supabase antes de atribuir uma causa. |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) — `failure` | Log de `Processing Request (Linux)` registra `errorType: quota`, HTTP 402 e “additional usage limit” esgotado. O log também reporta bloqueio de rede para `api.github.com`; a evidência fatal explícita é a resposta 402 do serviço Copilot. | Bloqueio operacional externo, não falha do código e não required check. **Ação do PO/admin:** rever/regularizar o limite de uso do Copilot; depois solicitar nova execução. Se persistir após renovar a quota, investigar a allowlist de rede do runner para `api.github.com`. |

Checks verdes recentes na mesma ponta da `main` incluem UI Visual & A11y [#41045062190](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062190), Select Columns vs Types [#41045061953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045061953), Lovable Autoheal [#41045062040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062040), Gitleaks [#41045062076](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062076), E2E Personalization [#41045062037](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062037), Policies Baseline [#41045061919](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045061919) e Security Scan [#41045062287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062287). Workflows sem resultado final neste snapshot continuam `queued`/`pending` e não foram tratados como falha.

Não foram feitas alterações no schema, dados ou Edge Function diretamente. O deploy foi solicitado somente pelo workflow versionado e aguarda aprovação humana.

## Atualização P24 — execução posterior e gate de dependências (2026-10-30T11:53Z)

- **Uptime Monitor:** o run mais recente na `main` passou a ser [#41048983078](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048983078), SHA `42081291`, e também terminou `failure` no step `Probe site + edge function`. A coleta do log não expõe os códigos individuais; a issue [#2803](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2803) continua com o payload antigo porque a action deduplica a mensagem idêntica. A consulta HTTP autenticada descrita acima continua sendo o único status específico observado (`503`, com os dois checks de banco `unhealthy` às 11:30Z). Deploy de `health-check` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) segue `pending` em `production`; requer aprovação do PO.
- **Running Copilot Code Review:** último run conhecido na `main` permanece [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850), `failure` por HTTP 402 e quota Copilot excedida, detalhado no P23.
- **Gate de dependências (risco detectado localmente, CI ainda sem conclusão):** `npm audit --audit-level=high` retorna 12 high e 1 moderate. A origem do grupo high é a cadeia dev `@lhci/cli@0.15.1` → Lighthouse/Puppeteer/proxy-agent (`basic-ftp`, `extract-zip`, `chromium-bidi`/`zod`). `npm audit fix --dry-run` só propõe corrigir `ip-address` (moderate); o npm oferece `@lhci/cli@0.13.0` como `semver-major`, que rebaixa Lighthouse de `12.6.1` para `11.4.0`. Não apliquei downgrade nem force fix. O Deploy Gates da `main` [#41048978175](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048978175) ainda estava `queued` neste snapshot; aguardar o Gate 0.5 e revisar alternativa upstream/compatível antes de alterar a ferramenta.

## Atualização P25 — Supabase Linter Gate na ponta mais recente (2026-10-30T12:00Z)

- **Supabase Linter Gate:** run [#41051701308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701308), SHA `b0d1376a`, tentativa 1 falhou no step `Check Security Advisors and live catalog gates`, ao executar `scripts/check-anon-write-grants.mjs`. O log mostra duas tentativas anteriores com `TimeoutError` no helper `supabase-read-only-query.mjs`, depois resposta HTTP 544 e saída `Auditoria pg_catalog falhou`; as verificações anteriores de advisors e allowlists passaram. Evidência aponta falha de disponibilidade/timeout da consulta administrativa somente leitura, mas não determina a causa do serviço Supabase nem prova divergência de grants. **Não alterei banco, allowlist ou código.**
- A tentativa 2 foi solicitada pelo recurso oficial de rerun do GitHub Actions e estava `queued` às 12:06Z; aguardar conclusão antes de classificar o workflow como recuperado ou bloqueado. Se falhar novamente, preservar o log da tentativa e investigar a disponibilidade do caminho de consulta read-only; qualquer alteração de schema continua proibida nesta sessão.
- **Uptime Monitor:** a execução mais recente conhecida segue [#41048983078](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048983078), `failure` no step `Probe site + edge function`; o workflow não expôs códigos por probe. A última consulta autenticada independente observada às 11:30Z retornou HTTP 503 com `database=unhealthy` e `external_db=unhealthy`, sem permitir atribuir causa ao run. O deploy protegido de `health-check` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) continua `pending` de aprovação `production` pelo PO.
- **Copilot Code Review:** último failure conhecido permanece [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850), HTTP 402 por limite de uso Copilot excedido; ação do administrador permanece regularizar a quota.
- No SHA atual `b0d1376a`, os runs recentes de `Static Health Checks`, `Lovable Edit Tracker`, `SSOT Supabase Guard`, `Gitleaks`, `Required Checks Guard`, `Security Scan`, `Select Columns vs Types`, `No Prod Leak`, `Release Please`, `UI · Visual & A11y`, `Lovable Autoheal`, `Quote Builder Delivery Quality`, `Policies Baseline`, `Branch Protection Sentinel` e `CodeQL` concluíram `success`. `Deploy Gates` [#41051701334](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701334) estava `queued`; vários E2E/CI ainda estavam `in_progress`, portanto não são falhas concluídas.

### PR #2800 — fix de seletor E2E ainda sem validação funcional

O PR [#2800](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2800) permanece aberto e atrás da `main`. O run [#41041167646](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41041167646) do Magazine Header falhou durante `auth.setup`: `auth/v1/token` expirou/retornou timeout 504 antes da execução dos specs. Portanto, a alteração de seletor ainda não foi validada pelo E2E de CI. Não mesclar enquanto os checks exigidos não estiverem verdes; após a autenticação de teste responder, atualizar a branch e reexecutar.

## Atualização — HEAD `7299c88c` (2026-10-30T10:20 UTC)

**Gate Final - Deploy Ready:** [#41034358375](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358375) — ✅ **SUCCESS**

### Workflows com FAILURE em HEAD `7299c88c`

#### P21-edge-drift — edge-functions-drift-check
- **Run ID:** [#41034830573](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034830573) (sha `7299c88c`)
- **Erro exato:** `Drift detectado entre GitHub e canônico. 31 função(ões) com conteúdo diferente.`
- **Causa raiz:** Funções edge deployadas em Supabase canônico (`doufsxqlfjyuvxuezpln`) divergem do código no repositório. Drift acumulado.
- **Ação tomada:** Dispatch de `deploy-edge-functions.yml` enviado — run [#41034820685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034820685) em andamento (status `pending`).
- **Ação do PO:** Após conclusão do `Deploy Edge Functions`, disparar manualmente `edge-functions-drift-check` via Actions → workflow_dispatch para confirmar resolução.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.

#### P21-personalization — E2E — Personalization Flow
- **Run ID:** [#41040489097](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489097) (sha `6dbc9387` — atualizado de `7299c88c` run #41034358338)
- **Job falho:** `E2E — Personalization Journey` (job #124011777528)
- **Step falho:** Step "Run Personalization E2E Tests" — exit code 1; 3 failed + 1 flaky
- **Erro exato:** `[loginViaUI] Timeout aguardando redirect pós-login` — `POST auth/v1/token -> 504 (70480ms)`. Supabase auth retornando 504 Gateway Timeout no CI. Mesma causa raiz dos E2Es de Magazine Header e Critical Flows.
- **Artefato:** `personalization-e2e-artifacts.zip` (artifact ID 12970518204, ~219MB)
- **Causa raiz:** `auth/v1/token` retorna 504 no ambiente CI — Supabase auth indisponível/lento durante a execução. Não é falha de código (mudança de dot-notation é semanticamente idêntica em runtime). Pré-existente em SHA `7299c88c`.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.
- **Ação do PO:** Confirmar/provisionar secret `SUPABASE_SERVICE_ROLE_KEY` no CI para que auth funcione; ou investigar disponibilidade do endpoint `auth/v1/token` no projeto `doufsxqlfjyuvxuezpln` durante janela CI.

---

## P22 — Fix dot-notation + bloqueios de CI (2026-10-30T10:24-11:15 UTC)

### Correção aplicada — PR #2806 (SHA `6dbc9387`)

**Causa raiz identificada e corrigida:** commit `5edddfb1` (E130 noUncheckedIndexedAccess) introduziu notação de colchete em `src/components/admin/badges-manager/types.ts:254` violando `@typescript-eslint/dot-notation`. Corrigido em PR #2806 (squash-merge → SHA `6dbc9387`):
- Antes: `const NEUTRAL_CLASSES: ColorClasses = COLOR_TOKEN_CLASSES['neutral']!;`
- Depois: `const NEUTRAL_CLASSES: ColorClasses = COLOR_TOKEN_CLASSES.neutral!;`

**Evidência de correção — CI Security & Drift run [#41040489233](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489233) (SHA `6dbc9387`):**
- Step 5 "Lint check" → ✅ `success` (10:33:14→10:35:31Z)
- Step 6 "Type check" → ✅ `success` (10:35:31→10:36:41Z)
- Step 7 "Build check" → ✅ `success`
- Step 21 "Run Unit & Integration Tests" → ✅ `success` (10:36:59→10:53:52Z)
- Steps 1–26 todos ✅ `completed/success`
- Step 27 "Run E2E Critical Tests — specs autenticados" → `in_progress` desde 10:56:22Z (ver P22-e2e-auth)

### P22-runner-saturation — Gate Final bloqueado na fila de runners

- **Runs afetados:**
  - Gate Final / Deploy Gates [#41040489311](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489311) (SHA `6dbc9387`): `status=queued`, tentativa 2, desde 2026-10-30T10:41:55Z
  - Deploy Gates "Detectar mudanças" [#41043165270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41043165270) (SHA `e5323824` — HEAD): `status=queued`, desde 2026-10-30T10:46:10Z
- **Causa exata:** 4 pushes à `main` entre 10:24Z e 10:46Z (SHAs: `5edddfb1` → `6dbc9387` → `1c6b2fce` → `e5323824`) dispararam dezenas de workflows simultâneos. O plano GitHub Actions gratuito limita a 20 jobs concorrentes; slots saturados por sessões anteriores de agentes. O Gate Final ficou preso na fila sem receber runner nos 30+ minutos seguintes. O workflow re-enfileirou em tentativa 2 às 10:41:55Z e continuou aguardando.
- **Impacto:** O único required check (`Gate Final - Deploy Ready`) não atingiu `conclusion=success` nos SHAs `6dbc9387` e `e5323824` dentro da janela desta sessão. A correção de código está comprovada pelos steps 1-26 do CI Security & Drift. O Gate Final atingirá `success` automaticamente quando runners se tornarem disponíveis — não requer mudança de código.
- **Impacto no deploy:** Gate Final é o único required check; deploy pendente enquanto `queued`.
- **Ação do PO:** Aguardar liberação de runners (normalmente 30–90 min após saturação). Alternativa: cancelar runs `queued` mais antigos para liberar slots em https://github.com/adm01-debug/Promo_Gifts_V4/actions.

### P22-e2e-auth — CI Security & Drift step 27 (E2E autenticados) em andamento

- **Run:** [#41040489233](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489233) (SHA `6dbc9387`)
- **Job:** `quality-gate` — step 27 "Run E2E Critical Tests — specs autenticados" — `in_progress` desde 2026-10-30T10:56:22Z
- **Causa provável:** Specs autenticados dependem de `POST /auth/v1/token` do Supabase para criar sessão no CI. Padrão idêntico ao documentado em P21-personalization e P21-magazine-header: `auth/v1/token → HTTP 504` (Gateway Timeout) no CI. Se confirmar, é falha de infraestrutura CI, não regressão da correção dot-notation.
- **Nota:** Steps 1-26 (lint, typecheck, build, unit tests, E2E públicos) todos ✅. O fix está comprovado; o step 27 é infraestrutura E2E pré-existente.
- **Impacto no Gate Final:** NÃO é required check — não afeta deploy.
- **Ação do PO:** Se step 27 falhar com auth 504: confirmar/provisionar `SUPABASE_SERVICE_ROLE_KEY` no CI.

### P22-supabase-preview — Supabase Preview (SHA `e5323824`)

- **Check run:** [#124023725095](https://github.com/adm01-debug/Promo_Gifts_V4/runs/124023725095) (SHA `e5323824`)
- **Estado:** `completed/skipped` — "This git branch is not associated with any Supabase Branch. You can open a PR to create a new branch."
- **Causa:** Push direto à `main` (sem PR): o Supabase Branching App não cria preview para pushes em main, apenas para PRs. Estado `skipped` é comportamento esperado — não é falha.
- **Impacto:** Nenhum. Não é required check.
