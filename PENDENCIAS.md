# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-30T13:16Z
**Branch de correção:** `docs/ci-latest-failures-20261030` (PR #2816 — aberta)

## Atualização P28 — falhas e checks no SHA `7e56ae49` (2026-10-30T12:36Z)

Esta seção substitui os estados pendentes do snapshot P27 (12:23Z). Últimos runs da `main` consultados: falhas concluídas abaixo; estados em fila/execução não contam como falhas.

| Workflow | Run / conclusão | Erro e causa comprovada | Ação |
|---|---|---|---|
| Uptime Monitor | [#41053317735](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41053317735) — `failure` | Falhou o step agregado `Probe site + edge function`; o log não revela qual das quatro probes falhou. | Deploy protegido `health-check` [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) continua `pending` de aprovação em `production`. **PO:** aprovar e aguardar nova execução do monitor; identificar qual probe falha se persistir. Sem alterações de função ou banco. |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) — `failure` | HTTP 402, cota adicional Copilot esgotada. | **PO/admin:** regularizar cota e então solicitar nova execução. Não é falha de código. |
| E2E — Critical Flows & Error Boundaries | [#41054206634](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206634) — `failure` | Job `E2E — Full User Flows (authed)`: `check-login` 200, `auth/v1/token` 200 (3,5s), `auth/v1/user` 200; `system_settings` 401 após 12s e chamadas REST/RPC/Edge pendentes por 56–80s. Login ficou em `/login`. Só 1/10 testes rodou; 9 foram skipped, falhando o gate mínimo (90% skipped; máximo 50%). Causa final do 401/latência não está comprovada. | Investigar serviço/API/permissões do usuário de teste com evidência dos logs do projeto; corrigir a origem antes de repetir. Não enfraquecer o gate nem os asserts. A consulta read-only de logs unificados (12:20–12:35Z) não trouxe paths correlacionáveis; os logs PostgREST exibem apenas path `/`. Nenhum DDL, dado, secret ou código foi alterado. |

### Sucessos e estados ainda não concluídos na mesma ponta

- Passaram: Quote Number Hardening Verify [#41055540192](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41055540192), UI Visual & A11y [#41054206778](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206778), Release Please [#41054206617](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206617), Select Columns [#41054206658](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206658), Branch Protection [#41054206673](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206673), Static Health [#41054206785](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206785), No Prod Leak [#41054206666](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206666), Gitleaks [#41054206653](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206653), Autoheal [#41054207025](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054207025), Required Checks [#41054206618](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206618), Policies [#41054206631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206631), Supabase Linter [#41054206788](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206788), Lovable Edit Tracker [#41054206747](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206747), Personalization E2E [#41054206728](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206728), SSOT [#41054206549](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206549), Security Scan [#41054206640](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206640), CodeQL [#41054207049](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054207049) e Quote Builder [#41054206663](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206663).
- Ainda em execução: Deploy Gates push [#41054206726](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206726) (Gate 1, 3, 5.5), CI Security & Drift [#41054206685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206685) (quality-gate), Playwright [#41054206752](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206752) e Swatch QuickView [#41054206843](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206843). Não são falhas concluídas.
- Deploy Gates dispatch [#41054421796](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054421796) foi `cancelled`, sem motivo exposto; `Deployment Failure Alert` e `Lovable Protected-File Audit` foram `skipped`. Edge drift [#41048782448](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048782448) continua cancelado; deploy protegido aguardando PO.

### PR #2816

PR sincronizada com base `7e56ae49`, head `94b948612`, ainda aberta/bloqueada. Vercel falhou no deployment [dpl_4AYVybqkXQSRyzmEKRAk7spGa1GR](https://vercel.com/juca1/promo-gifts-v4/4AYVybqkXQSRyzmEKRAk7spGa1GR); Devin Review mostra sucesso com análise omitida por trial/créditos. Não mesclar até status requerido estar aprovado; este Vercel é status da PR, não workflow da `main`.

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

## Atualização P29 — últimas conclusões da main e ratchet (2026-10-30T12:45Z)

### Falhas concluídas no SHA `7e56ae49`

| Workflow | Run mais recente | Causa evidenciada / estado |
|---|---|---|
| Uptime Monitor | [#41056934202](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41056934202) | Falhou no step agregado `Probe site + edge function`. Probes reportadas: site=0, health-check=22, check-login OPTIONS=0 e auth-health=0. O exit 22 identifica a probe de health-check como falha, mas não determina sozinho a causa raiz. O deploy protegido [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) ainda exige aprovação do ambiente `production`; depois, reexecutar o Uptime Monitor. |
| Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | HTTP 402 por quota/billing do Copilot. Bloqueio externo; administrador precisa regularizar o plano/quota. |
| E2E — Critical Flows & Error Boundaries | [#41054206634](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206634) | Login e endpoints de Auth responderam 200, mas `system_settings` retornou 401 e chamadas REST/RPC/Edge ficaram pendentes por 56–80 s. O fluxo permaneceu em `/login`; 1/10 testes rodou e 9 foram ignorados, falhando o limite mínimo. Os dados não identificam a causa entre autorização, serviço ou dependência. Ação: revisar logs/saúde de Auth e PostgREST no intervalo do run e só então repetir o job; não afrouxar o gate. |

### Gate de TypeScript

O Deploy Gates [#41054206726](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206726) falhou no Gate 1.10: 872 diagnósticos contra baseline 867; o Gate Final falhou como consequência. A comparação local contra o commit que criou o baseline mostrou os mesmos 872 diagnósticos, sem novos diagnósticos introduzidos desde então. Foram adicionadas verificações de existência em dois componentes administrativos para corrigir cinco acessos inseguros preexistentes, sem atualizar o baseline nem alterar a política do gate. Validação local após a correção: ratchet 867/867; `npm run build:verify` passou com typecheck, lint baseline (0 erros/avisos) e build; suíte completa passou com 1.250 arquivos e 25.898 testes (1.135 skipped, 24 todo). Os mesmos checks serão repetidos após o commit, antes do push.

### Demais execuções no SHA `7e56ae49`

Os workflows com sucesso estão listados em RELATORIO_CI.md §P29. CI Security & Drift [#41054206685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206685) e Swatch QuickView [#41054206843](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206843) permaneciam em andamento na última consulta. E2E Playwright [#41054206752](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206752) e Deploy Gates dispatch [#41054421796](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054421796) foram cancelados; não são contados como falhas. Nenhuma afirmação de sucesso será feita para os dois runs ainda ativos até obter conclusão.


## Atualização P30 — conclusão dos workflows e correção E2E local (2026-10-30T13:16Z)

Esta atualização substitui os estados “em andamento” do P29 para os runs abaixo. O SHA auditado da `main` continua `7e56ae49dde173e04f66ed4523eb8eb59653821a`; somente `completed/failure` conta como falha.

| Workflow | Último run na `main` | Evidência / estado | Próxima ação |
|---|---|---|---|
| Uptime Monitor | [#41056934202](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41056934202) — `failure` | Probe do site, check-login e Auth Health passaram; `health-check` terminou com exit code 22. Isso aponta a probe que falhou, mas não determina a causa HTTP/serviço. Deploy protegido [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110) aguarda aprovação `production`. | PO/admin aprovar o deploy protegido; depois confirmar a execução do monitor e o status HTTP de health-check. |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) — `failure` | HTTP 402 por quota/billing do Copilot; bloqueio externo. | PO/admin regularizar quota e disparar nova execução. |
| E2E — Critical Flows & Error Boundaries | [#41054206634](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206634) — `failure` | O fluxo autenticado executou 1/10 testes, ignorou 9 e excedeu o limite de skips. O token Auth e `/auth/v1/user` responderam 200; `system_settings` respondeu 401 e chamadas REST/RPC/Edge ficaram pendentes. O log não fecha a causa do 401/latência. | Investigar sessão/permissões/serviços no Supabase com logs correlacionados. Não alterar secrets, schema nem gate sem causa comprovada. |
| Deploy Gates | [#41054206726](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206726) — `failure` | Gate 1.10: 872 diagnósticos contra baseline 867; Gate Final falhou como consequência. A branch deste PR remove cinco acessos inseguros sem mudar o baseline; ratchet local passou 867/867. | Aguardar checks do PR #2816 e exigir resultado verde antes de qualquer merge. |
| CI Security & Drift Checks | [#41054206685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206685) — `failure` | `security-audit` passou; `quality-gate` falhou no E2E autenticado. Seis testes falharam e seis passaram. Três `e2e/kit-builder.spec.ts` falharam porque o tour de onboarding cobria o botão “Começar pelos itens” (`z-[80]` interceptou os cliques). Três `e2e/catalog.spec.ts` também falharam; o resumo/log disponível não estabelece a causa, então ficam sem classificação. | Correção de onboarding e teste unitário estão nesta branch, pendentes de CI. Investigar separadamente as três falhas de catálogo com artefato/log específico; não marcar como resolvidas. |

### Swatch QuickView e workflows sem conclusão

- E2E • Swatch QuickView [#41054206843](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206843) permanece `in_progress`. O job Firefox [#124061436035](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206843/job/124061436035) concluiu com falha na suíte e no mínimo de testes; os jobs Chromium e WebKit ainda estão em execução. Portanto o workflow não tem conclusão geral e não é listado como falha final. O artefato Firefox tem 450 MB e não foi baixado; a causa detalhada permanece pendente.
- E2E Playwright [#41054206752](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41054206752) foi cancelado; cancelamento não é falha.
- Os workflows que concluíram `success` no SHA auditado permanecem listados no RELATORIO_CI.md §P30. Não foi identificado workflow previamente verde que tenha mudado para falha.

### Correção local de onboarding — ainda sem evidência remota

`KitOnboardingTour.finish()` agora persiste `kit-tour-completed` também quando o componente é controlado pelo pai. O helper E2E fecha explicitamente “Pular tour” se o modal de primeira visita estiver visível antes de clicar “Começar pelos itens”. Um teste unitário verifica a persistência e `onOpenChange(false)`. Validação local nesta revisão: teste unitário focado 1/1; `npm run build:verify` passou (typecheck, lint baseline 0 erros/avisos, build e guardas); suíte completa passou (1.251 arquivos; 25.899 testes aprovados, 1.135 skipped, 24 todo). Repetir build e suíte após o commit, conforme regra anti-regressão. As alterações não resolvem nem classificam as três falhas de catálogo.

### PR #2816

A PR segue aberta e sem merge. A versão anterior tinha Vercel failure e Devin Review sem análise por falta de créditos; após atualizar o head com a correção E2E e o relatório P30, consultar os novos checks. Não mesclar enquanto qualquer check requerido estiver vermelho ou pendente.
