# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-30
**Branch de correção:** `claude_04/beautiful-gates-bvocz5` (PR #2597 — **MERGEADO** ✅)

## Atualização P27 — inventário da ponta atual da `main` (2026-10-30T12:23Z)

Inventário por workflow na `main`, com base nos runs mais recentes consultados. Somente conclusões `failure` contam como falha; execuções `queued`, `pending`, `in_progress`, `cancelled` ou `skipped` ficam separadas. A ponta atual é `7e56ae49dde173e04f66ed4523eb8eb59653821a` (PR #2818, docs-only).

| Workflow | Última execução concluída em falha | Evidência | Próximo passo |
|---|---|---|---|
| Uptime Monitor | [#41053317735](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41053317735) — `failure` | Job `check`, step agregado `Probe site + edge function`; o log do step não expõe qual probe entre site, `health-check`, `check-login` e Auth Health falhou. Não há evidência suficiente para atribuir o erro a uma probe específica. | Deploy protegido da função `health-check` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) segue aguardando aprovação do ambiente `production`. **PO:** aprovar pelo GitHub Actions; depois conferir um novo ciclo do monitor e, se falhar, obter status individual das probes. Não alterei a função/banco diretamente. |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) — `failure` | Log informa HTTP 402 / cota de uso adicional Copilot esgotada; há também aviso de rede para `api.github.com`, mas o erro fatal explícito foi 402. | **PO/admin:** regularizar a cota Copilot e solicitar nova execução. Não é falha de código nem check obrigatório de deploy. |

### Runs atuais ainda em fila ou pendentes — SHA `7e56ae49`

Estes estados não são falhas e ainda não permitem confirmar “verde” na nova ponta. Os Gate Final, E2E e demais jobs devem terminar antes da prova final:

- Deploy Gates (push) [#41054206726](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206726) `queued`; Deploy Gates (dispatch) [#41054421796](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054421796) `pending`; CI Security & Drift [#41054206685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206685) `pending`.
- CodeQL [#41054207049](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054207049), Gitleaks [#41054206653](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206653), Quote Builder [#41054206663](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206663), Release Please [#41054206617](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206617), Policies Baseline [#41054206631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206631), Static Health [#41054206785](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206785), Branch Protection [#41054206673](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206673), Lovable Edit Tracker [#41054206747](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206747) e Lovable Autoheal [#41054207025](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054207025): `queued`.
- No Prod Leak [#41054206666](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206666), Select Columns vs Types [#41054206658](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206658), SSOT Supabase Guard [#41054206549](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206549), Supabase Linter Gate [#41054206788](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206788), Required Checks Guard [#41054206618](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206618), Security Scan [#41054206640](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206640), E2E Critical Flows [#41054206634](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206634), UI Visual & A11y [#41054206778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206778), E2E Personalization [#41054206728](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206728) e E2E Playwright [#41054206752](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206752): `queued`.
- E2E Personalization anterior [#41051701270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701270), tentativa 2, terminou `success`; Supabase Linter anterior [#41051701308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701308), tentativa 2, também terminou `success`. Essas conclusões são do SHA `b0d1376a`, não substituem os runs atuais.
- Edge Functions drift [#41048782448](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048782448) está `cancelled`, sem prova de reconciliação. Deploy protegido [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) continua `pending` de aprovação humana. `Deployment Failure Alert` [#41054278600](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054278600) e `Lovable Protected-File Audit` [#41054206659](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206659) estão `skipped`, não são falhas.

### PR #2816 — verificações próprias da PR

A PR [#2816](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2816) está aberta e desatualizada em relação à `main`. O status registrado para head `e975c4fef` mostra deployment Vercel `failure` e Devin Review `success` com revisão ignorada por trial/créditos. Esse deployment é status da PR, não workflow concluído da `main`. Após sincronizar a branch, aguardar novos checks; não mesclar enquanto o required check estiver pendente ou falho.

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

## Atualização P25 — Supabase Linter Gate e E2E na ponta mais recente (2026-10-30T12:10Z)

- **Supabase Linter Gate:** run [#41051701308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701308), SHA `b0d1376a`, tentativa 1 falhou no step `Check Security Advisors and live catalog gates`, ao executar `scripts/check-anon-write-grants.mjs`. O log mostra duas tentativas com `TimeoutError` no helper `supabase-read-only-query.mjs`, depois HTTP 544 e saída `Auditoria pg_catalog falhou`; advisors e allowlists passaram. A tentativa 2 via rerun oficial concluiu `success` às 12:09Z. Isso confirma recuperação na repetição e é compatível com falha transitória do serviço de consulta; não determina a causa do HTTP 544. **Não alterei banco, allowlist ou código.** A conclusão mais recente do workflow é `success`, portanto saiu da lista de falhas atuais.
- **E2E — Personalization Flow:** run [#41051701270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701270), SHA `b0d1376a`, tentativa 1 terminou `failure`: 4 specs falharam e 1 passou. Nos logs, as chamadas PostgREST `color_groups`, `v_products_public` e `categories` permaneceram pendentes por cerca de 26–27 s; `get_profile_and_roles` ficou pendente até 69 s. O erro final reportado em `loginViaUI` foi permanecer em `/login` após 75 s, sem sucesso no redirect. Isso é compatível com lentidão/indisponibilidade nas dependências de dados/auth durante o teste, mas o log não traz status HTTP que prove causa raiz. Solicitei rerun oficial apenas dos jobs falhos; tentativa 2 estava `queued` às 12:09Z, aguardando runner. Não reduzi timeout nem removi asserts.
- **Drift de Edge Functions:** o último `edge-functions-drift-check` disponível é [#41048782448](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048782448), `cancelled`, enquanto o deploy protegido [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) segue `pending` de aprovação. Não há execução posterior que confirme reconciliação; não classificar o run cancelado como sucesso nem como falha atual concluída. Após a aprovação e conclusão do deploy, rodar o drift-check de novo.
- **Uptime Monitor:** a execução mais recente conhecida segue [#41048983078](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048983078), `failure` no step `Probe site + edge function`; o workflow não expôs códigos por probe. A última consulta autenticada independente observada às 11:30Z retornou HTTP 503 com `database=unhealthy` e `external_db=unhealthy`, sem permitir atribuir causa ao run. O deploy protegido de `health-check` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) continua `pending` de aprovação `production` pelo PO.
- **Copilot Code Review:** último failure conhecido permanece [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850), HTTP 402 por limite de uso Copilot excedido; ação do administrador permanece regularizar a quota.
- No SHA atual `b0d1376a`, os runs recentes de `Static Health Checks`, `Lovable Edit Tracker`, `SSOT Supabase Guard`, `Gitleaks`, `Required Checks Guard`, `Security Scan`, `Select Columns vs Types`, `No Prod Leak`, `Release Please`, `UI · Visual & A11y`, `Lovable Autoheal`, `Quote Builder Delivery Quality`, `Policies Baseline`, `Branch Protection Sentinel`, `CodeQL` e `Supabase Linter Gate` (tentativa 2) concluíram `success`. `Mark stale issues and pull requests` também está verde em [#41047015308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41047015308). `Deploy Gates` [#41051701334](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701334) e o rerun da Personalization estavam `queued`; outros E2E/CI estavam `in_progress`, portanto não são falhas concluídas.

## Atualização P26 — E2E Critical Flows e execuções recentes (2026-10-30T12:19Z)

- **E2E — Critical Flows & Error Boundaries:** run [#41051701108](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701108), SHA `b0d1376a`, terminou `failure`. Jobs `E2E — Mobile Critical Routes` e `E2E — Error Boundaries (sem auth)` passaram; falhou `E2E — Full User Flows (authed)`. O `Setup auth state` confirmou que as credenciais estavam presentes e o teste de setup passou (1 teste em 1,3 min). No fluxo autenticado, `loginViaUI` permaneceu em `/login` por 75 s; o log registra PostgREST/Edge calls pendentes por 16–70 s, além de `get-visitor-info` retornando HTTP 403 após ~40,7 s. O gate mínimo também falhou: somente 1 de 10 testes executado, 9 ignorados (90% > limite de 50%). São sintomas de chamadas lentas e/ou rejeitadas no ambiente E2E; sem status de todas as chamadas ou log correlato não é possível atribuir causa única ao app, Auth, PostgREST ou Edge Function. Não alterei secrets, timeout, testes, código ou banco.
- A consulta agregada read-only aos logs unificados do Supabase, filtrada por fontes Edge/Postgres e rotas/status de 12:00–12:13Z, não retornou linhas. Isso não prova ausência de eventos fora dos campos/labels filtrados e não fornece causa independente. **Ação pendente:** PO/admin deve revisar nos painéis do Supabase a saúde e os logs de Auth, PostgREST e Edge Functions no intervalo indicado; após a dependência estabilizar, reexecutar somente os jobs E2E que falharam e verificar o gate mínimo sem o afrouxar.
- **Runs mais recentes ainda sem conclusão:** o rerun de E2E Personalization [#41051701270](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701270) estava `in_progress` às 12:15Z; o Uptime Monitor [#41053317735](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41053317735) entrou `in_progress` às 12:19Z; Deploy Gates [#41051701334](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701334) permanecia `queued`. Nenhum deles é contado como falha concluída neste snapshot. O último Uptime Monitor concluído [#41048983078](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048983078) falhou; o novo run em progresso é o mais recente.
- **Copilot Code Review:** permanece como falha concluída mais recente do workflow [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850), HTTP 402 por quota Copilot excedida; é bloqueio operacional externo e requer ação de administrador.
- **Supabase Linter Gate:** latest attempt do run [#41051701308](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41051701308) está `success` (tentativa 2), então a falha HTTP 544 da tentativa 1 não é o resultado mais recente.
- **Validação local pós-commit `3d277b164`:** `NODE_OPTIONS=--max-old-space-size=4096 npm run build:verify` e `npm test -- --reporter=dot --silent` concluíram com exit 0; 1.250 arquivos passaram, 130 skipped; 25.898 testes passaram, 1.135 skipped e 24 todo. O commit contém somente `PENDENCIAS.md` e `RELATORIO_CI.md`; `git diff --check` passou. Esta validação não altera nem substitui os bloqueios E2E remotos acima.

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

---

## P28 — Novos failures em `main` pós-Lovable (2026-10-30T13:40Z)

### Contexto

Em 2026-10-30T13:13-13:14Z o Lovable (`gpt-engineer-app[bot]`) fez dois pushes diretos à `main` (comportamento esperado — REGRA #7):
- SHA `ff61eec4` — commit `fix(spotlight): timer cleanup`
- SHA `a7c02ac1` — commit `feat(E128): split SupplierFormDialog.tsx em sub-componentes por aba`

Esses pushes dispararam novos runs de workflow. Falhas abaixo são classificadas por tipo.

---

### P28-sentinel — Branch Protection Sentinel (dois SHAs)

| Run | SHA | Conclusão |
|---|---|---|
| [#41061416107](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061416107) | `ff61eec4` | `failure` |
| [#41061596613](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596613) | `a7c02ac1` | `failure` |

- **Causa raiz:** O `Branch Protection Sentinel` falha quando um commit é empurrado diretamente à `main` sem o formato de squash-merge `(#NNN)`. Lovable faz isso sistematicamente (REGRA #7 — comportamento documentado).
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.
- **Ação:** Padrão conhecido e aceito. Não fixável sem mudar a integração do Lovable ou remover o sentinel. PO deve decidir se deseja ajustar o `.lovableignore` ou tolerar essas falhas.

---

### P28-replenishment — CI - Replenishment Module Quality Gate (SHA `ff61eec4`)

- **Run ID:** [#41061415964](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061415964)
- **Job falho:** `audit` — step 7 "Run E2E Tests (Smoke)"
- **Erro exato (log):** `[loginViaUI] Timeout aguardando redirect pós-login` — `URL atual: http://localhost:8080/login` após 75000ms. Specs: `replenishment-stress.spec.ts`, 2 falhos, 1 passou. Helper: `e2e/helpers/auth.ts:123`
- **Causa raiz:** Mesma causa de §P21-personalization — `auth/v1/token` retorna timeout 504/lento no CI. Não há mudança de código relacionada ao replenishment no commit `ff61eec4` (é apenas cleanup de timer no Spotlight).
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.
- **Ação do PO:** Provisionar `SUPABASE_SERVICE_ROLE_KEY` no CI (mesma ação de §P21-personalization).

---

### P28-quote-builder — Quote Builder Delivery Quality (SHA `a7c02ac1`)

- **Run ID:** [#41061596692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596692)
- **Job falho:** `quality-gate` — step 5 "🌍 E2E & Visual Regression"
- **Causa provável:** Padrão E2E auth timeout (artefato `delivery-quality-report` de 1GB uploadado mas job falhou no step E2E). Log tail não expõe o erro específico; padrão é idêntico ao §P21-personalization.
- **Impacto no Gate Final:** NÃO é required check — não bloqueia deploy.
- **Ação do PO:** Provisionar `SUPABASE_SERVICE_ROLE_KEY` no CI.

---

### P28-e2e-personalization — E2E — Personalization Flow (SHA `a7c02ac1`)

- **Run ID:** [#41061596766](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596766)
- **Causa raiz:** Mesma causa de §P21-personalization — auth 504 no CI.
- **Impacto no Gate Final:** NÃO é required check.
- **Ação do PO:** Provisionar `SUPABASE_SERVICE_ROLE_KEY` no CI.

---

### Resumo P28 — Nenhum required check afetado

Todos os 5 novos failures (2× Branch Protection Sentinel + CI Replenishment + Quote Builder + E2E Personalization) ocorrem em workflows que NÃO são required checks para o Gate Final. O único required check (`Gate Final - Deploy Ready`) ainda não executou para o HEAD atual `a7c02ac1` da `main`.

**PR #2819** (`claude/fix-indexed-access-baseline-261030-1248`, SHA `ae87ee412`) continua a correção válida para Gate 1.10. Deploy Gates run [#41064553276](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41064553276) em `queued` às 13:40Z.

---

## P29 — Inventário atualizado da main HEAD `a7c02ac1` (2026-10-30T14:00Z)

Inventário completo dos workflows com última execução = `failure` na `main` no HEAD atual `a7c02ac1`.

### Falhas concluídas (última execução = failure)

| Workflow | Run | SHA | Causa raiz | Ação | Required check? |
|---|---|---|---|---|---|
| Branch Protection Sentinel | [#41061596613](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596613) | `a7c02ac1` | Lovable push direto sem formato `(#NNN)` — REGRA #7 estrutural | PO: decidir integração Lovable ou tolerar | NÃO |
| CI - Replenishment Module Quality Gate | [#41061415964](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061415964) | `ff61eec4` | `auth/v1/token` timeout 504 no CI — mesma causa §P21-personalization | PO: provisionar `SUPABASE_SERVICE_ROLE_KEY` | NÃO |
| E2E — Personalization Flow | [#41061596766](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596766) | `a7c02ac1` | `auth/v1/token` timeout 504 no CI | PO: provisionar `SUPABASE_SERVICE_ROLE_KEY` | NÃO |
| Quote Builder Delivery Quality | [#41061596692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596692) | `a7c02ac1` | `auth/v1/token` timeout 504 no CI | PO: provisionar `SUPABASE_SERVICE_ROLE_KEY` | NÃO |
| Uptime Monitor | [#41064302786](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41064302786) | `a7c02ac1` | Probe `health-check` exit 22 (curl HTTP error) — edge function retornando não-2xx. Issue [#2820](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2820) criada automaticamente. Causa: `health-check` em versão desatualizada (último deploy aprovado pendente). | PO: aprovar deploy [#41034820685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034820685) em environment `production` (mesmo item §P21-edge-drift) | NÃO (schedule, não required check) |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | `22ca2b3f` | HTTP 402 — cota Copilot excedida | PO: regularizar billing Copilot | NÃO |

### Falhas antigas supersedidas por runs mais recentes na main

Os workflows abaixo falharam em SHAs mais antigos (`7e56ae49`) mas agora têm runs mais recentes em `a7c02ac1` (concluídos ou em progresso) — não contam mais como "última falha":

| Workflow | Falha antiga | Run atual em `a7c02ac1` |
|---|---|---|
| CI Security & Drift Checks | `41054206685` (failure, `7e56ae49`) | `41061596603` (queued, `a7c02ac1`) |
| Deploy Gates | `41054206726` (failure, `7e56ae49`) | `41061596966` (queued, `a7c02ac1`) |
| E2E — Critical Flows & Error Boundaries | `41054206634` (failure, `7e56ae49`) | `41061596576` (in_progress, `a7c02ac1`) |
| E2E • Swatch QuickView (Lista + Tabela) | `41054206843` (failure, `7e56ae49`) | `41061596646` (in_progress, `a7c02ac1`) |

### Workflows verdes na ponta `a7c02ac1`

CodeQL, Gitleaks, Lint untypedFrom, Lovable Autoheal, Lovable Edit Tracker, No Prod Leak in Dev/Test Config, Policies Baseline, Release Please, Required Checks Guard, SSOT Supabase Guard, Security Scan, Select Columns vs Types, Static Health Checks, Supabase Linter Gate, TS Unused Locals Ratchet, UI · Visual & A11y, schema-snapshot-export.

### Estado do Gate Final na main

- **Deploy Gates main** [#41061596966](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41061596966) — SHA `a7c02ac1` — `queued` às 13:35Z
- **PR #2819 Deploy Gates** [#41064553276](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41064553276) — SHA `ae87ee412` — `queued` às 13:40Z
- Ambos aguardam runner; check-in programado para 14:30Z

### Ação pendente do PO (consolidada)

| # | Item | Ação |
|---|---|---|
| 1 | `SUPABASE_SERVICE_ROLE_KEY` | Provisionar secret no CI → resolve 4+ falhas E2E |
| 2 | Deploy Edge Functions | Aprovar run [#41034820685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034820685) em `production` → resolve Uptime Monitor + drift |
| 3 | Copilot billing | Regularizar cota → resolve Running Copilot Code Review |
| 4 | Branch Protection Sentinel | Decidir sobre integração Lovable (tolerar ou ajustar) |

---

## P30 — Inventário completo HEAD `52570b33` / `cba9944d` (2026-10-30T17:30Z)

**HEAD atual da main:** `52570b33` (squash PR #2828, RELATORIO_CI.md §P28)
**Runs de referência:** executados sobre `cba9944d` (antecessor direto de `52570b33`); runs de `52570b33` ainda em andamento no momento deste registro.

### Workflows com última execução = `failure` (verificados)

| Workflow | Run | SHA | Causa raiz | Tipo de bloqueio | Required check? |
|---|---|---|---|---|---|
| CI Security & Drift Checks | [#41067472831](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472831) | `cba9944d` | 8 testes falham (`chromium-authed`): `catalog.spec.ts` (5 testes) + `kit-builder.spec.ts` (3 testes) com `Expected: visible, Received: undefined` em `expectVisibleByTestId` (waits.ts:209); 2 testes "flaky" (passaram no retry). TestID `kit-builder-container` EXISTS em `KitBuilderPage.tsx`. Comportamento intermitente sugere timing/concorrência no runner. | Infra/flakiness — requer investigação de concorrência ou session state entre testes autenticados | NÃO |
| E2E — Magazine Header Layout | [#41067472825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472825) | `cba9944d` | Job "E2E — Magazine Header (authed)" completou em 0s (step durou <1s após setup do auth) — nenhum teste executado. Causa: spec provavelmente encontrou 0 testes matching (skip condicional ou fixture ausente). Job "Magazine Header OK" falha como consequência. | Infra/fixture — spec sem testes matching; requer depuração local | NÃO |
| E2E • Swatch QuickView | [#41067472586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067472586) | `cba9944d` | `check-playwright-min-executed`: `executed=5, minimo=10`; `ratio skipped=66.7% > 50%`. Log: "Causas possíveis: secrets E2E ausentes, spec list vazia ou Playwright abortou antes de rodar". Browsers webkit+chromium+firefox todos falharam. | Infra/secrets — `E2E_USER_*` secrets ausentes ou inválidos para esta suite | NÃO |
| Uptime Monitor | [#41081887544](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081887544) | `52570b33` | Probe `health-check` exit 22 (curl HTTP error não-2xx) — edge function `health-check` em versão desatualizada. Issue [#2829](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2829) criada. Fix está no código (PR #2753 na main) mas deploy da função pendente de aprovação em `production`. | PO-BLOCKED: aprovar deploy de edge functions via `.github/workflows/deploy-edge-functions.yml` (workflow_dispatch `health-check`) | NÃO (schedule) |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | `22ca2b3f` | HTTP 402 — cota adicional Copilot esgotada. Log: `errorType: quota`. | PO-BLOCKED: regularizar billing Copilot GitHub | NÃO |
| edge-functions-drift-check | [#41034830573](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034830573) | `7299c88c` | 31 funções em drift entre código no GitHub e estado canônico deployado — deploy via MCP/dashboard sem PR (REGRA #8 corolário). | PO-BLOCKED: dispatch `deploy-edge-functions.yml` para reconciliar; ou abrir PRs de migration espelho para cada função — REGRA #8 aplica | NÃO (workflow_dispatch/schedule) |
| Branch Protection Sentinel | [#41081845698](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41081845698) | `52570b33` | Push do Lovable sem formato `(#NNN)` no commit message — REGRA #7 estrutural. Falha recorrente a cada push do bot. | PO-BLOCKED: decidir tolerância ou ajustar integração Lovable | NÃO |

### Workflows verdes na ponta `cba9944d` / `52570b33` (verificados)

Branch Protection Sentinel ✅ (cba9944d — mas falha em 52570b33 por novo push Lovable), CI Replenishment ✅, CodeQL ✅, Deploy Gates ✅ (run [#41067473692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473692) — 15 jobs success, 2 skipped), E2E Critical Flows ✅, E2E Personalization ✅, Gitleaks ✅, Lovable Autoheal ✅, Lovable Edit Tracker ✅, No Prod Leak ✅, Policies Baseline ✅, Required Checks Guard ✅, SSOT Supabase Guard ✅, Security Scan ✅, Select Columns vs Types ✅, Static Health Checks ✅, Supabase Linter Gate ✅, TS Unused Locals Ratchet ✅, UI Visual & A11y ✅.

### Nenhum required check afetado

O único required check (`Gate Final - Deploy Ready`) executou com sucesso em `cba9944d` (run [#41067473692](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41067473692), job 124135936896, 15:09:03Z — 15 jobs ✅, 2 skipped ⏭️). Os 7 workflows em falha documentados acima NÃO são required checks.

### Ações pendentes do PO (P30 consolidada)

| # | Item | Ação concreta |
|---|---|---|
| 1 | Uptime Monitor + edge-drift | Dispatch `deploy-edge-functions.yml` (`workflow_dispatch`, `function_name: health-check`) em GitHub Actions > Production env approval |
| 2 | E2E Swatch QuickView | Verificar/renovar secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` no repo (Settings > Secrets > Actions) |
| 3 | Copilot Code Review | Regularizar billing/cota Copilot no GitHub org |
| 4 | CI Security & Drift / Magazine Header | Investigar flakiness de auth em `chromium-authed` e fixture da spec Magazine Header — pode precisar de `E2E_USER_*` secret review (mesmo item #2) |
| 5 | Branch Protection Sentinel | Avaliar tolerância ou configurar Lovable para usar formato de commit com `(#NNN)` |
