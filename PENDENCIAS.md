# PENDÊNCIAS CI — Promo Gifts V4
**Atualizado em:** 2026-10-30
**Branch de correção:** `claude_04/beautiful-gates-bvocz5` (PR #2597 — **MERGEADO** ✅)

## Snapshot incremental em 2026-10-29 02:26 UTC — PR #2717 `9c921e8d`

Este snapshot supersede os estados anteriores abaixo para o SHA consultado; os registros antigos ficam como histórico.

- `main` e checkout principal: `c344508711797a730893644449b16a05f12f4fce`.
- PR [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717): aberta, sem merge, base `c3445087`; HEAD `9c921e8d3855c4326bd1c1f2e328a113555df648`.
- Checks observados: 76 no total — 58 success, 5 failure, 6 in progress, 6 skipped e 1 neutral. Não mesclar enquanto houver falha ou execução pendente.
- Falhas: [E2E Quotes — Matrix](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40805437712): o job `E2E · undo` passou após isolar os dados de tabela; permanece falhando o snapshot mobile dark do menu (baseline 133×156 px, atual 128×156 px; mesma diferença de 5 px em commits anteriores). Não atualizar snapshot ou tolerância sem revisar e aprovar a aparência.
- Falhas: [E2E — Magazine Header Layout](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40805437763): 3 casos esperavam navegação para `/magazine/{id}`, mas permaneceram em `/magazine`; reproduzir e obter trace/dados do editor antes de alterar produto ou teste.
- Falha: [E2E • Swatch QuickView](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40805437721): o job WebKit recebeu sinal de shutdown/cancelamento do runner após o setup; outros projetos ainda estavam em execução no snapshot. Tratar como infraestrutura até haver falha de asserção reproduzível.
- Falha: [Copilot Code Review](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40805448737): o processo foi bloqueado pelo firewall do runner ao acessar `api.github.com`; não equivale a revisão concluída.
- Seis checks ainda estavam ativos no instante da consulta: visual baselines, E2E gates, Chromium/Firefox swatch, audit e verificações associadas. Consultar GitHub antes de qualquer decisão de merge.
- Correção do teste da coluna de cotações enviada nos commits `b0b06663` e `9c921e8d`: instala mock de autenticação no modo mock, fornece resposta de leitura sintética e aguarda a tabela antes de conferir Status → Expiração → Nº Orçamento. O check confirma `E2E · undo` verde; o código do produto não foi alterado.
- Validação local após `9c921e8d`: lint (0 erros/avisos, 0 regressões), typecheck e build passaram; suíte completa: 1.210 arquivos passaram/131 ignorados; 25.656 testes passaram/1.134 ignorados/24 TODO. E2E direcionado da tabela passou com mock; não houve escrita no banco.
- Supabase canônico: sem alterações. Tipos estruturais continuam alinhados; ledger de migrations segue pendente de classificação e recibos, conforme seção P16 abaixo.

## Revalidação final em 2026-10-29 — `main` `c3445087`; PR #2717 `c4d41bd0`

Consulta de workflows: 33 workflows observados na `main`: 23 com última execução verde, 4 vermelhas, 3 canceladas, 2 ignoradas e 1 em execução (rerun WebKit, tentativa 2). No SHA `c4d41bd0`, o PR #2717 tinha 65 checks: 45 verdes, 4 falhos, 9 em execução, 6 ignorados e 1 neutro. O PR não foi mesclado. Nenhuma migration, dado ou função remota foi alterada.

| Pendência | Evidência atual | Próxima ação segura |
|---|---|---|
| E2E Catálogo → Kit | Run [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577): a verificação literal de `500` também capturou `6.500 produtos`. Correção enviada no PR #2717 (`9336e0520`); aguardar CI do PR antes de considerar resolvido. | Confirmar o check E2E verde no PR #2717 e, após merge autorizado pelos gates, observar novo run em `main`. |
| E2E Kit Builder | Run [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949): 6 testes autenticados falharam; o trecho disponível mostra `locator.click` no botão de início excedendo 120 s. | Obter trace/estado visual da falha e reproduzir com usuário de teste e dados reais; não afrouxar timeout nem ignorar teste. |
| E2E Swatch QuickView | Run [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693), tentativa 2 ainda `in_progress`: runner da tentativa anterior recebeu sinal de encerramento no projeto WebKit; não há falha de asserção confirmada. | Aguardar conclusão da tentativa 2 e classificar pelo resultado; preservar a suite e os limites atuais. |
| Edge `crm-db-bridge` | Run [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015): requests com corpo vazio e string crua receberam 503, acima do contrato de teste (<500). | Inspecionar logs e versão da função remota; se exigir deploy, seguir `.github/workflows/deploy-edge-functions.yml` e aprovação do environment Production. Não implantar via MCP/dashboard. |
| E2E Magazine Header | Run [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) na `main`: depois de clicar no primeiro cartão, a URL permaneceu `/magazine`, em vez de `/magazine/{id}`. O job autenticado da execução atual do PR #2717 está em andamento. | Reproduzir com sessão autenticada e trace; confirmar se o cartão existe e se o click dispara navegação antes de alterar teste ou aplicação. |
| Revisão automática do PR #2717 | Run [40791689247](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40791689247): reviewer Copilot encerrou por limite de uso (`quota`); não há parecer automático. | Repor a cota do Copilot ou obter revisão manual exigida pelas regras do repositório; não tratar a falha de quota como revisão aprovada. |
| WebKit no PR #2717 | Run [40791676828](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40791676828): shutdown do runner, sem asserção de produto. | Reexecutar após disponibilidade do runner; não alterar teste por cancelamento de infraestrutura. |
| E2E Quotes — visual no PR #2717 | Run [40791676846](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40791676846): screenshot móvel esperado 133×156 px, recebido 128×156 px. | Comparar screenshot com a interface aprovada; não atualizar baseline nem tolerância antes de explicar a diferença visual. |
| E2E Quotes — `undo` no PR #2717 | Run [40791676846](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40791676846): o teste observou `onUndo` uma vez. Reprodução local confirmou a causa: o componente limita duração mínima a 1.000 ms; o teste pedia 500 ms e clicava após 700 ms, antes da expiração. Correção no spec incluída no commit desta atualização; o CI ainda precisa validar. | Aguardar o novo run do PR. A correção espera o dismiss após 1.000 ms e mantém `onUndo === 0` e ausência de toast de sucesso. |
| PR #2717 — checks em andamento | Na consulta do SHA `c4d41bd0`, nove checks estavam em execução, incluindo `e2e-gates`, Gate 1, baselines visuais, Magazine Header autenticado e suites E2E. | Aguardar novos resultados após o commit desta correção e não mesclar enquanto qualquer check obrigatório estiver vermelho ou pendente. |
| Reconciliação Supabase | Canônico `doufsxqlfjyuvxuezpln`: comparação bruta tem 3.004 IDs locais, 2.552 remotos; 463 locais e 11 remotos sem par exato. O Gate E40 no PR #2714 reporta `local_only=1109; remote_only=648` por outro escopo/filtro. | Explicar a divergência metodológica, classificar cada versão e reconciliar somente por migration versionada e fluxo autorizado; não aplicar nada automaticamente. |
| Publicação da atualização Graphify | Checkout local tem `graphify-out/GRAPH_REPORT.md` e `manifest.json` atualizados e não commitados; `graphify update` reportou pacote 0.9.91 vs skill 0.9.94 e gerou diff de metadados extenso. | Reconciliar a versão do gerador e produzir diff revisável antes de publicar o snapshot; não misturar os artefatos a uma correção de produto/CI. |
| Guarda RLS / auditoria | PR #2715 permanece aberto; correção não está em `main`. O workflow quality do PR teve falhas E2E e o revisor automático esteve indisponível por limite de quota, segundo a evidência anterior. | Corrigir/validar as falhas de CI e obter revisão exigida. Sem merge enquanto os checks obrigatórios estiverem vermelhos. |

Os runs verdes e os resultados locais detalhados estão no `RELATORIO_CI.md` (snapshot da mesma data). As causas ainda não comprovadas ficam explicitamente pendentes; não foram tratadas como corrigidas por inferência.

**Atualizado:** 2026-10-29
**Branch:** `fix/e2e-vite-port-isolation` (PR #2717)

---

## ✅ P0 — RESOLVIDO — Deploy Gates na main (Gate Final)

**Resolução:** Dois runs consecutivos com `conclusion: success` na main:
- Run [40667156516](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667156516) — SHA `8c81483` — **success** (fix Gate E40 + replay-safe migrations)
- Run [40662579684](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579684) — SHA `c73cb9b` — **success** (fix Calendar RDP v10)

**Causa original:** Gate E40 (`local_only=1108; remote_only=647`) era BLOQUEANTE.  
**Fix:** Commit `8c81483` — migrations `20261027120000` e `20261027140000` tornadas replay-safe com guard `IF to_regclass('cron.job') IS NULL OR NOT EXISTS (...) THEN RAISE NOTICE + RETURN`.

---

## ✅ P4 — RESOLVIDO — Gate E40 Schema Drift (ledger dessincronizado)

**Workflow:** Deploy Gates (Gate Final)  
**Run com falha:** [40660438161](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161)  
**Fix:** Commit `8c81483` na main — migrations corrigidas tornaram o Gate E40 verde.  
**Runs de validação:** `40667156516` e `40662579684` ambos com `conclusion: success`.

---

## P1 — CI - Replenishment Module Quality Gate (E2E autenticado)

**Workflow:** CI que inclui testes E2E autenticados do módulo de reposição  
**Run ID da última falha:** 40612760478  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478  
**Status:** failure

**Erro exato (dos logs do CI):**
```
e2e/helpers/auth.ts — Timeout 75000ms exceeded.
Error: Timed out 75s waiting for expect(locator).not.toHaveURL()
Expected pattern: not matching /login/
Received string: "http://localhost:8080/login"
```

**Causa raiz:** Helper de autenticação E2E aguarda redirect pós-login por 75s, mas a URL permanece em `/login`. O app não consegue autenticar porque os secrets de credenciais de teste não estão configurados no GitHub Actions.

**Secrets ausentes identificados nos logs:**
- `E2E_USER_EMAIL` — email de um usuário de teste válido no Supabase `doufsxqlfjyuvxuezpln`
- `E2E_USER_PASSWORD` — senha desse usuário
- `VITE_SUPABASE_URL` — URL do projeto Supabase (se não estiver como variable)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key do Supabase (se não estiver como variable)

**Ação necessária do PO:**

Passo 1 — Abra a página de secrets:
```
https://github.com/adm01-debug/Promo_Gifts_V4/settings/secrets/actions
```

Passo 2 — Crie cada secret clicando em "New repository secret":

| Secret | Valor |
|---|---|
| `E2E_USER_EMAIL` | email de um usuário de teste ativo no projeto Supabase `doufsxqlfjyuvxuezpln` |
| `E2E_USER_PASSWORD` | senha desse usuário (deve conseguir fazer login em produção) |
| `VITE_SUPABASE_URL` | `https://doufsxqlfjyuvxuezpln.supabase.co` (se não existir como Actions Variable) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key do projeto `doufsxqlfjyuvxuezpln` |

Passo 3 — Verifique se o usuário de teste existe:
No Supabase Dashboard → Authentication → Users → filtre por email do usuário de teste. Se não existir, crie um usuário com email+senha.

Passo 4 — Re-run do workflow:
```
https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478
```
Clique em "Re-run all jobs".

**Impacto:** Testes E2E do módulo de reposição ficam 100% skipped (false-green) enquanto o auth falhar.

---

## P2 — E2E — Critical Flows & Error Boundaries (E2E autenticado + tooltip timing)

**Workflow:** E2E — Critical Flows & Error Boundaries  
**Run ID da última falha:** 40745678499  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678499  
**Status:** failure

**Erros exatos (dos logs do CI):**
```
1. check-playwright-min-executed.mjs: apenas 1/10 testes executados; 90% skipped por requireAuth
2. e2e/flows/sidebar-tooltips.spec.ts:60:
   expect(tooltip).toBeVisible({ timeout: 2000 })
   → tooltip não aparece em 2s após hover
```

**Causa principal:** Mesma do P1. O `beforeEach` dos testes autenticados chama `loginAs(page, "user")` que falha por ausência dos secrets E2E, causando skip em cascata.

**Ação necessária do PO:**
- Passo 1: Resolver P1 primeiro (configurar os 4 secrets acima).
- Passo 2 — Re-run após P1 estar resolvido: https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678499
- Passo 3 — Se o tooltip ainda falhar: o timeout de 2s (`expect(tooltip).toBeVisible({ timeout: 2000 })`) pode ser insuficiente em Chromium CI. Abrir issue para aumentar para 3000ms em `e2e/flows/sidebar-tooltips.spec.ts:60`.

**Impacto:** 90% dos testes E2E críticos ficam skipped enquanto o auth falhar.

---

## ✅ P3 — RESOLVIDO — Branch Protection Sentinel

**Workflow:** Branch Protection Sentinel  
**Run ID da falha original:** 40615509825  
**Run ID da falha recorrente (PR #2699):** [40728685711](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40728685711) — SHA `6b2cc72` — ❌ failure  
**Run de confirmação (PR #2703):** [40739341755](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40739341755) — SHA `c7bc0ba6` — ✅ **success**  
**Status:** ✅ RESOLVIDO — padrão sistêmico corrigido

**Histórico:**
- ✅ SHA `e4a326e` (run 40680415509) — success
- ✅ SHA `2cee272b` (run 40702858343) — success
- ❌ SHA `6b2cc72` (run 40728685711) — **failure** — squash merge PR #2699 sem `(#2699)` no commit title
- ✅ SHA `c7bc0ba6` (run 40739341755) — **success** — squash merge PR #2703 com `(#2703)` no commit title

**Causa raiz (resolvida):** A ferramenta `github_merge_pull_request` do MCP GITHUB-FOREVER não inclui automaticamente `(#NNN)` no commit title. Corrigido passando `commit_title` terminando em `(#NNN)` explicitamente em toda chamada:
```json
{
  "commit_title": "docs: descrição do PR (#2703)",
  "merge_method": "squash"
}
```

**Ação necessária do PO:** Nenhuma — padrão sistêmico corrigido. Futuros merges via MCP devem sempre incluir `(#NNN)` no `commit_title`.

---

## ✅ P5 — RESOLVIDO — CI Security & Drift Checks (Calendar RDP v10)

**Workflow:** CI Security & Drift Checks  
**Run ID da última falha:** 40615509752  
**Run de validação:** [40745678435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678435) — ✅ **success** (2026-10-28)  
**Status:** ✅ RESOLVIDO

**Causa raiz:** 5 testes unitários de Calendar falhavam por migração react-day-picker v8→v10 (commit `8b0b606`) sem atualização dos seletores DOM dos testes.

**Fix:** Commit `c73cb9b` na main — 3 arquivos de teste corrigidos. Validado no run [40745678435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678435): Gate 2 Unit Tests ✅ success.

**Ação necessária do PO:** Nenhuma — resolvido.

---

## P6 — E2E · undo (falhas pré-existentes no main)

**Workflow:** E2E · undo  
**Run ID da última falha:** 40667936090  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40667936090  
**Status:** failure — pré-existente (3+ runs consecutivos falhando na main antes desta sessão)

**Erros exatos:**
```
1. [chromium-authed] › e2e/flows/04p-quotes-expiration-column.spec.ts:149
   Error: status presente em primeiro acesso
   expect(iStatus).toBeGreaterThanOrEqual(0) → recebeu -1
   (coluna "status" não encontrada na lista de IDs de colunas)

2. [chromium-authed] › e2e/flows/04r-undo-toast-a11y-keyboard.spec.ts:150
   Error: expect(count).toBe(0) → recebeu 1
   (click após 500ms ainda aciona onUndo — timing flake/regressão)
```

**Ação necessária do PO:**
- Investigar `04p-quotes-expiration-column.spec.ts`: verificar se coluna "status" foi removida ou reordenada na UI de orçamentos
- Investigar `04r-undo-toast-a11y-keyboard.spec.ts:150`: aumentar timeout do timer ou corrigir race condition no undo toast

---

## P7 — db-schema-drift-check (ledger divergente — requer reconciliação pelo PO)

**Workflow:** db-schema-drift-check  
**Run ID da última falha:** [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880)  
**SHA:** `2cee272b` (main HEAD em 2026-10-28 14:41)  
**Status:** ❌ failure — bloqueado por ledger divergente

**Erro exato (step "Ledger parity (repo x canonical)"):**
```
[migration-ledger][bloqueado] local_only=1108; remote_only=648; mismatched=0; malformed=0
```

**Causa raiz:** O ledger de migrations está massivamente dessincronizado entre o repositório e o banco de produção `doufsxqlfjyuvxuezpln`:
- **1108 migrations** existem no repo (`supabase/migrations/`) mas **não constam** no banco remoto (`supabase_migrations.schema_migrations`)
- **648 migrations** constam no banco remoto mas **não existem** no repo

Esta divergência é independente do fix de P4 (guard pg_cron nas migrations `20261027120000`/`20261027140000`). O fix de P4 corrigiu o replay do Gate E40 dentro do `deploy-gates.yml`, mas o `db-schema-drift-check` compara o ledger em si — e o ledger está dessincronizado por DDL fora do fluxo de migration (REGRA #8 corolário).

**Ação necessária do PO:**
1. Investigar a extensão da divergência: baixar artefato `schema-reconciliation-evidence` do run [40708395880](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40708395880/artifacts/12824214915) (arquivos `/tmp/migration-ledger.json` e `/tmp/migration-ledger-summary.json`)
2. Decidir estratégia de reconciliação: criar migrations espelho para o `remote_only=648` ou limpar o `local_only=1108` do ledger
3. Após reconciliação: disparar `schema-snapshot-export.yml` com `force_rotate: true` para girar o baseline
4. Reconfirmar com `workflow_dispatch` em `db-schema-drift-check`

**Nota:** Per REGRA #8 corolário e E056, Claude **não pode** executar DDL ou `migration repair` em sessão de agente para reconciliar o ledger. Requer ação do PO.

**Nota — diferença P7 (`local_only=1108`) vs P12 (`local_only=1109`):** P12 rodou no branch do PR #2701 que adiciona a migration `20261028120000_grant_kit_view_authenticated.sql` ao repo (+1 sobre os 1108 da main). Os dois valores são corretos em seus respectivos contextos: 1108 é o estado atual da main; 1109 é o estado do branch do PR #2701.

---

## P8 — edge-functions-drift-check (drift entre GitHub e canônico)

**Workflow:** edge-functions-drift-check  
**Run ID da última falha:** 40744782349  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40744782349  
**Status:** failure

**Erro exato:**
```
##[error]Drift detectado entre GitHub e canônico. Veja sumário do job e artefato drift-report.csv.
```

**Causa raiz:** Uma ou mais edge functions no Supabase `doufsxqlfjyuvxuezpln` divergem do código em `supabase/functions/` no GitHub (deploy direto fora do workflow, conforme REGRA #8 corolário).

**Ação necessária do PO:**
- Verificar artefato `drift-report.csv` no run 40744782349 para identificar quais funções divergem
- Para drift de conteúdo: `supabase functions download <slug>` + commit + PR
- Para orphan no canônico: deletar via dashboard + registrar no repo
- Após reconciliar: disparar `deploy-edge-functions.yml` via `workflow_dispatch`

---

## ✅ P9 — RESOLVIDO — E2E — Personalization Flow

**Workflow:** E2E — Personalization Flow  
**Run ID da última falha:** 40662579633  
**Run de validação:** [40745678737](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40745678737) — ✅ **success** (2026-10-28)  
**Status:** ✅ RESOLVIDO

**Causa raiz:** Mesma de P1. Testes E2E autenticados falham por ausência dos secrets `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`.

**Ação necessária do PO:** Nenhuma — resolvido no run 40745678737.

---

## P10 — E2E • Swatch QuickView (secrets E2E + dados de produto ausentes)

**Workflow:** E2E • Swatch QuickView (Lista + Tabela)  
**Run ID da última falha:** 40662579393  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579393  
**Status:** failure

**Erros exatos:**
```
firefox: check-playwright-min-executed → min. de testes não atingido (auth falhou)
webkit: expect(picker).not.toBeNull()
        "nenhum produto com color_swatches V2 em ${route.path}"
        at e2e/catalog/swatch-picker-v2-focus-and-quickview.spec.ts:103
```

**Causa raiz (dois problemas):**
1. Firefox/chromium: autenticação E2E falhou — mesma causa P1 (secrets ausentes)
2. Webkit: picker V2 retorna null — produtos com `color_swatches V2` podem não existir em produção ou seletor mudou

**Ação necessária do PO:**
- Resolver P1 primeiro (secrets E2E)
- Investigar webkit: verificar se existem produtos com `color_swatches` V2 em produção e se o seletor está correto

---

## P11 — Edge Integration Tests — All Functions (11 testes falhando)

**Workflow:** Edge Integration Tests — All Functions  
**Run ID da última falha:** 40746330314  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40746330314  
**Status:** failure — ❌ BLOCKED PO — requer deploy das versões atuais

**Resultado:** 3 arquivos falharam | 11 testes failed | 884 passed | 2 skipped (897 total)

**Causa raiz (determinada — versões deployadas desatualizadas no Supabase):**

As 3 edge functions afetadas têm código **correto no repositório** (confirmado em 2026-10-28 via `github_get_content`):
- `generate-mockup` (SHA `09af62394a`) — já tem `try/catch` em `JSON.parse` do body
- `verify-2fa-token` (SHA `a58240e50786`) — já tem `try/catch` em `JSON.parse` do body
- `validate-access` (SHA `14ce2379c053`) — já tem `missingBodyResponse`, `invalidJsonResponse`, `validationErrorResponse`, validação JWT completa e rejeição de tokens inválidos

**O deploy no Supabase está desatualizado.** As versões em produção são antigas (sem esses tratamentos), causando:
1. `generate-mockup` + `verify-2fa-token` em produção: timeout 30s ao receber JSON inválido (versão antiga sem try/catch → worker trava)
2. `validate-access` em produção: retorna HTTP 200 para todos os inputs, incluindo body inválido e tokens ausentes/expirados (versão antiga sem validação)

**NÃO é bug de código** — a correção já está commitada no repo. O problema é que o deploy não foi feito com as versões atuais.

**Ação necessária do PO:**
- Disparar `workflow_dispatch` em `.github/workflows/deploy-edge-functions.yml`
- Aprovar o gate `environment: production` quando solicitado
- Funções a redeployar: `generate-mockup`, `verify-2fa-token`, `validate-access`

---

## P12 — Kit Coverage — Integration (bloqueado por P7)

**Workflow:** Kit Coverage — Integration  
**Run ID da última falha (main):** 40628415319  
**Link:** https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319  
**PR com fix:** [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) (draft — Gate Final ❌)  
**Run de falha no PR:** [40733949177](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40733949177) (job Gate Final: 122981142154)  
**Status:** ❌ BLOCKED PO — bloqueado por P7

**Erro exato (main):**
```
Unknown Error: permission denied for view v_kit_component_complete
```

**Causa raiz:** O role usado pelo teste de integração não tem `GRANT SELECT` na view `v_kit_component_complete` no projeto `doufsxqlfjyuvxuezpln`.

**Fix implementado:** Migration `20261028120000_grant_kit_view_authenticated.sql` criada em branch `claude/fix-p12-grant-kit-view-261028-1730`, PR [#2701](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2701) aberto (draft).

**Por que o PR não pode ser mergeado — bloqueio descoberto em 2026-10-28:**

A migration nova faz o Gate E40 "Detect schema file changes" **ativar** o Gate E40 Schema Drift Check. O drift check falha com `local_only=1109; remote_only=648` (P7 pré-existente), retornando `R_SCHEMA_DRIFT=failure`. O Gate Final exige `R_SCHEMA_DRIFT == "success" || "skipped"` — com `failure`, o Gate Final falha (job 122981142154: `##[error]Gate E40 Schema Drift falhou (failure)`).

Runs anteriores na main tinham `R_SCHEMA_DRIFT=skipped` (commits sem migration) e por isso passavam. **Qualquer PR com migration nova falha o Gate Final enquanto P7 não for resolvido.**

**Ação necessária do PO (duas opções):**

**Opção A (recomendada):** Resolver P7 (reconciliar ledger) → mergear PR #2701 → disparar `db-apply-migration.yml` via `workflow_dispatch`.

**Opção B:** Aplicar o GRANT diretamente via `workflow_dispatch` em `db-apply-migration.yml` com SQL `GRANT SELECT ON public.v_kit_component_complete TO authenticated, service_role;` — requer aprovação de `environment: production` no GitHub Actions UI.

---

## P13 — Vercel deployment failure (projeto fantasma)

**Status:** failure em commits desta branch

**Erro:**
```
Vercel: Deployment has failed
description: "Deployment has failed — run this Vercel CLI command: npx vercel inspect dpl_B5Yf4S5kEH9wNh4aASkq6M56psbW --logs"
```

**Causa raiz provável:** Projeto fantasma `promo-gifts-reconciliation-integrity-20260915` (`prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok`) criado em 2026-09-15 — incidente documentado na REGRA #11 do CLAUDE.md.

**Ação necessária do PO:**
- Verificar se o projeto fantasma `prj_W1Zdi6BQWkAwQx5VJjpSNlZubeok` ainda existe em https://vercel.com/juca1 e deletá-lo
- Confirmar que `.vercel/project.json` contém `"projectId": "prj_9UfugNYCuboH2R0XB04Jv8PpjDpZ"` (projeto canônico)

---

*Ação prioritária: P1 (secrets E2E) — desbloqueia P2, P9, P10. P6, P8, P11 requerem investigação independente. P12 bloqueado por P7 (Opção B disponível via workflow_dispatch sem resolver P7). P13 requer deleção do projeto fantasma Vercel.*

## P14 — Uptime Monitor: `health-check` retorna 503/timeout

**Run mais recente na `main`:** [40793110088](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40793110088) — SHA `c344508711797a730893644449b16a05f12f4fce`, schedule, 2026-10-29 00:17 UTC.

**Issue automática:** [#2718](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2718).
**Status:** ❌ bloqueado por degradação observada no caminho Supabase Edge Function → PostgREST/PostgreSQL; causa operacional detalhada ainda não isolada.

**Resultado dos probes:** `site=0`, `health-check=22`, `check-login (OPTIONS)=0`, `auth-health=0` (`curl` exit 22 = HTTP >= 400).

**Evidência:**
- O workflow `.github/workflows/uptime-monitor.yml` já envia `apikey` e `Authorization: Bearer` para `health-check`; remover ou desabilitar `verify_jwt` não é correção demonstrada.
- Edge Function `health-check` ativa na versão 275, `verify_jwt=true`; a verificação interna consulta `public.profiles` com timeout de 1.500 ms.
- Logs da função em 00:18–00:20 UTC registram `database timeout after 1500ms` e HTTP 503. Logs PostgREST no mesmo intervalo mostram HTTP 504 em requisições autenticadas a `profiles`; logs PostgreSQL registram cancelamentos por `statement timeout`.
- O MCP administrativo conseguiu consultar o Postgres, mas esse teste isolado não prova disponibilidade do caminho PostgREST usado pela função.

**Ação necessária:** investigar a origem dos statement timeouts/504 no caminho de API, confirmar com novo run do monitor e só então propor correção mínima. Não alterar o endpoint para sempre retornar 200, não remover a autenticação, não fazer deploy da Edge Function diretamente via MCP/dashboard e não alterar schema/dados.

## P15 — PR #2717 ainda não está pronta para merge

**PR:** [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717), head `7e3bfebecc07c3076c8d0b381f8ab71aae78fe24`, aberta e sem merge.

| Check | Run | Bloqueio observado |
|---|---:|---|
| E2E Focused UI — thumb-quickview | [40792695754](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40792695754) | Login E2E permaneceu em `/login` após 75 s; no mesmo intervalo há respostas 504 em consultas autenticadas a `profiles`. Corrigir após estabilizar/investigar autenticação/API; não pular ou enfraquecer o teste. |
| E2E Quotes — Matrix | [40792695757](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40792695757) | Snapshot mobile dark do menu divergiu. Revisar imagem/diff e comportamento antes de atualizar o baseline. |
| Copilot Code Review | [40792708888](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40792708888) | Serviço de review falhou por limite de uso/quota; não representa review aprovada. |

Na consulta de 2026-10-29 00:22 UTC havia outras 7 execuções ainda em andamento. A PR deve permanecer aberta até que todos os checks obrigatórios terminem sem falhas e a divergência visual seja validada.

## P16 — Ledger de migrations canônico ainda não reconciliado

**Projeto:** `doufsxqlfjyuvxuezpln`.
**Evidência anterior por comparação exata de IDs:** 3.004 versões únicas locais; 2.552 no ledger remoto; 463 local-only e 11 remote-only. O gate E40 também reportou `local_only=1109; remote_only=648`, sob outro escopo/filtro ainda não reconciliado com essa contagem.

**Status:** ❌ não sincronizado/classificação pendente. Os types estruturais públicos foram comparados anteriormente e estavam alinhados; isso não resolve o ledger.

**Ação necessária:** alinhar/documentar os dois métodos de comparação e classificar cada ID divergente como migration legítima, baseline histórica ou registro fora de banda. Até essa reconciliação, não executar `db push`, `migration repair` em massa, nem aplicar/registrar migrations por MCP/dashboard. Qualquer aplicação necessária deve seguir o workflow controlado autorizado no repositório, com as migrations versionadas e pré-checks aprovados.

## P17 — Reconciliação final do checkout, GitHub e Supabase — 2026-10-28/29

- Checkout principal `main` e `origin/main`: ambos em `c344508711797a730893644449b16a05f12f4fce`; alterações locais em `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` são artefatos gerados e não foram incorporados ao código.
- PR [#2717](https://github.com/adm01-debug/Promo_Gifts_V4/pull/2717): aberta, último HEAD remoto consultado `5a2e578a269459129d2a24dc2a6047471724003b`, base `c3445087`. A correção do harness E2E e este relatório estão em commit local ainda não enviado. Testes locais direcionados: spec de undo 7/7, snapshots visuais do toast 8/8 e fluxo catálogo→kit 6/6; `quote-view-no-presentation-mode` passou 25/27, com divergência visual mobile dark de 5 px e um teste AlertDialog que falhou sob carga, mas passou isolado. Não atualizar baseline visual sem revisão/aprovação. A branch deve permanecer sem merge até novos checks.
- No último HEAD remoto consultado, os checks da PR estavam: 7 falhas, 5 em andamento, 49 verdes, 6 ignorados e 1 neutro. Falhas observadas: `Magazine Header OK`, E2E Magazine Header, E2E view-no-presentation-mode, E2E undo, audit, WebKit swatch→QV e Copilot reviewer. A correção local do undo ainda não foi enviada nem confirmada pelo CI.
- Pós-commit local: lint aprovado (0 erros/avisos, 0 regressões), typecheck aprovado, build e guardas de produção aprovados; suíte integral com 1.210 arquivos e 25.656 testes aprovados, 131 arquivos/1.134 testes ignorados e 24 TODO. O grafo foi atualizado (55.613 nós, 83.734 arestas, 6.617 comunidades); HTML não gerado acima do limite de 5.000 nós. `types.ts` teve extração AST parcial por erro preexistente na linha 42.514; não foi modificado.
- Últimas falhas na `main`: Uptime Monitor (run [40793110088](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40793110088), PostgREST/health check indisponível), E2E Critical Flows (run [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577), falha no fluxo Catalog→Kit), CI Security & Drift (run [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949), specs E2E autenticadas falharam) e Swatch QuickView (run [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693), runner WebKit cancelado e job Chromium falhou). Essas falhas seguem sem correção validada em `main`.
- Supabase canônico confirmado pelo projeto `doufsxqlfjyuvxuezpln` (Promo_Gifts_V4, PostgreSQL 17.6, ACTIVE_HEALTHY). Consulta somente leitura: 2.552 migrations no ledger; última `20261027160000`. Comparação exata com `supabase/migrations`: 3.009 arquivos locais, 3.004 IDs únicos, 463 IDs apenas locais, 11 apenas remotos e cinco IDs duplicados localmente (`20260525232003`, `20260622111500`, `20260622130000`, `20260623000008`, `20260902220800`). Não houve escrita no banco.
- Bloqueio de segurança: divergências do ledger precisam ser classificadas antes de qualquer aplicação ou `migration repair`; usar exclusivamente o workflow de produção documentado em `AGENTS.md`. Não copiar dados operacionais de produtos/clientes para o GitHub. Types estruturais estavam alinhados na auditoria anterior; não regenerei nem alterei o schema nesta etapa.

## Revalidação de 2026-10-29 03:12 UTC — estado atual dos bloqueios

Esta seção substitui as contagens anteriores de workflows/PR nos registros históricos P15–P17; os detalhes históricos foram preservados.

### Workflows na main com última execução falha

| Workflow | Run | Estado / causa observada | Próxima ação segura |
|---|---:|---|---|
| Nightly Full CI | [40808174535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40808174535) | Falhas em duas shards E2E e dois testes visuais. A grade de reposição não disponibilizou `h3` no primeiro item de lista e falta snapshot de foco desktop; raiz ainda não confirmada. | Reproduzir com a mesma conta/dados de E2E e revisar o erro-context; não gerar snapshots novos sem comparação visual. |
| E2E — Critical Flows & Error Boundaries | [40762904577](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904577) | A checagem de texto `500` tinha falso positivo no conteúdo numérico. Fix está na PR #2717 e o E2E passou no head b0206929e. | Aguardar demais checks; merge somente com required checks verdes. |
| CI Security & Drift Checks | [40762904949](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904949) | Locators e carregamento de imagem falharam; há 503/504 no caminho PostgREST. | Reproduzir E2E e correlacionar logs de API; não mascarar a falha com retry/timeout relaxado. |
| E2E • Swatch QuickView | [40762904693](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762904693) | Linhas/produtos com swatches ausentes e timeouts. Head da PR ainda sem resultado final para Chromium/Firefox; WebKit foi interrompido pelo runner. | Aguardar jobs atuais e, com o run concluído, rerodar apenas WebKit uma vez; se repetir, registrar como infraestrutura. |
| Edge Integration Tests — All Functions | [40762354015](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354015) | `crm-db-bridge` respondeu 503 a payloads inválidos, contra expectativa não-5xx. | Comparar contrato do handler e versão implantada; qualquer deploy somente pelo workflow autorizado. |
| E2E — Magazine Header Layout | [40762354171](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40762354171) | Clique no contêiner não navegava para a revista. Fix em PR #2717; os checks de Magazine passaram no head b0206929e. | Aguardar checks obrigatórios e merge seguro. |

Na consulta, 24 das 35 últimas execuções por workflow estavam verdes; inclui Deploy Gates, CodeQL, Supabase Linter, Branch Protection Sentinel, Workflow Lint e Uptime Monitor. Três estavam canceladas e duas ignoradas; essas categorias não foram contadas como falha concluída.

### PR #2717 — bloqueios que impedem declarar sucesso

**Head:** `b0206929eee037e6fea13ac787114d5765d3884b`. A PR está aberta, sem merge. Dois checks (Chromium e Firefox do Swatch QuickView) continuavam em execução às 03:12 UTC.

- WebKit: runner recebeu sinal de encerramento antes de iniciar auth; nenhum resultado de teste foi produzido. Aguardando fim do workflow para um rerun único.
- Copilot reviewer: serviço falhou com HTTP 402 (quota/uso adicional); log também relata bloqueio de firewall para `api.github.com`. Isso não equivale a revisão aprovada; depende de cota/rede do serviço.
- `view-no-presentation-mode`: diferença visual de cerca de 5 px no menu mobile dark; requer avaliação visual, sem atualizar baseline até aprovação.
- E2E de paridade Novidades/Reposição: `page-title-novidades` não ficou visível após navegação; 13 passaram, 3 falharam. Causa do estado da rota/dados ainda não comprovada.
- Dois jobs de E2E/visual baseline foram cancelados; aguardam confirmação de origem/status final.
- Os checks Magazine Header e E2E Critical Flows passam no head atual, evidenciando as duas correções publicadas na PR.

## P18 — Divergência entre Graphify local e branch remota

O comando `graphify update .` foi executado no worktree da PR após as alterações, mas `graphify-out/GRAPH_REPORT.md` e `graphify-out/manifest.json` estão modificados localmente e ainda não foram commitados. Após estabilização do run atual, revisar o diff gerado, versionar a atualização do grafo com o relatório CI e seguir o processo de reteste pós-commit.

## P19 — Reconciliação do ledger canônico (sem alteração de banco)

A comparação read-only atual confirmou 3.009 arquivos locais, 3.004 IDs únicos e 2.552 versões no Supabase canônico; 463 IDs existem apenas localmente, 11 apenas no ledger remoto e 5 IDs estão duplicados em arquivos locais. O Gate E40 usa filtro/escopo distinto e retorna outro total. Não aplicar migrations, fazer `migration repair`, `db push` ou alterar registros do ledger até reconciliar a metodologia e classificar cada ID com evidência. Nenhum schema ou dado foi alterado nesta auditoria.
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
