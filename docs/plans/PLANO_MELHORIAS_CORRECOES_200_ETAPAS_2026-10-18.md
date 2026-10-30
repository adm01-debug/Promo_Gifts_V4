# PLANO DE MELHORIAS E CORREÇÕES — 200 ETAPAS

**Data:** 2026-10-18
**Base:** commit `d6cdb442a` (`main`)
**Janela auditada:** últimos 500 commits — `dcc8e681ee82e4acf70a0dfc124ea81ce36edf9c..d6cdb442a` (2026-08-29 → 2026-10-15)
**Método:** 5 auditorias paralelas e independentes (CI/CD, banco/migrations, frontend/TypeScript, edge functions/segurança, histórico/processo) + verificação direta da configuração ao vivo do GitHub pela API.
**Status:** NÃO EXECUTADO. Plano preparado para execução por outro agente.

---

## COMO USAR ESTE DOCUMENTO

Você é o agente executor. Leia as seções §1 a §4 antes de tocar em qualquer arquivo.

- §1 diz **por que** os 20 planos anteriores pararam em 29% e o que muda aqui.
- §2 são as **regras de execução**. Não são sugestões. A etapa que as violar deve ser recusada.
- §3 define as **trilhas** (quem consegue fechar o quê) e a **legenda**.
- §4 são as **200 etapas**, em 20 ondas de 10.
- §5 é a **rastreabilidade** achado → etapa.
- §6 é o que ficou **deliberadamente de fora**, com a razão.

Cada etapa tem um campo `Pronto:` com um comando e um código de saída esperado. Uma etapa só está concluída quando aquele comando devolve o que está escrito. Não existe "parcial" nem "não verificado" neste plano — foram esses dois estados que derreteram a matriz de controle anterior (46% das etapas de um plano ficaram em `⚠️ não verificado`).

---

## §1 — DIAGNÓSTICO: POR QUE OS PLANOS ANTERIORES NÃO FECHARAM

O repositório já mediu o próprio placar. `docs/AUDITORIA_PLANEJADO_NAO_EXECUTADO_2026-10-11.md` §4:

> **20 planos, 1.387 etapas declaradas, 409 concluídas = 29%**

Nenhum plano de setembro passou de 50%. Dois estão em 0% (`docs/PLANO_PENDENCIAS_CORRECOES_MELHORIAS_50_ETAPAS_2026-08-29.md`, 47 dias; `docs/plans/KIT_MAKER_PLANO_CORRECOES_50_ETAPAS_2026-09-27.md`). A causa não é falta de disciplina nem falta de gate. É esta cadeia, medida em 2026-10-18 pela API do GitHub:

**1. O único required check de `main` está vermelho em ~93% das execuções.**
`deploy-gates.yml`, últimos 60 runs: 4 `success`, 12 `failure`, 32 `cancelled`, 3 `action_required`, 9 em curso. Nas 6 falhas mais recentes o job que reprova é sempre o mesmo: `Gate 3 - E2E Smoke`, step `Run Playwright smoke tests`. Os secrets E2E existem — o job executa, não é skip (`has_e2e == 'true'`) — e os steps anteriores (`e2e-smoke-coverage-doc.mjs --check`, `check-smoke-tags.mjs`) passam. É teste de verdade falhando contra produção. Os 32 `cancelled` vêm de `cancel-in-progress` em PR somado ao churn alto.

**2. Com o required check vermelho, o caminho normal de merge não entrega.**

**3. O ruleset deixa a válvula de escape aberta.** Ruleset 16764622 "Protect main", `enforcement: active`:
- `bypass_actors: [{actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "always"}]` — RepositoryRole 5 = Admin
- `required_approving_review_count: 0`
- `required_review_thread_resolution: false`, `require_last_push_approval: false`

**4. A válvula foi usada.** Dos 329 commits first-parent da janela, 85 não têm referência `(#NNNN)`; destes, **69 têm um único parent — push direto em `main`**. Todos de `adm01-debug`. O conteúdo é quase inteiramente CI, segurança e governança (`E84`, `E87`, `E89`, `E96`, `E97`, `E98`, `E99`, `E100`, `codeql`, `required-checks-guard`) — exatamente a classe que a REGRA #9 e a regra `pull_request` do ruleset deveriam cobrir. Caso extremo: PR #2149 levou as 100 etapas do `PLANO_WORKFLOWS_CI_V2` (84 commits, 172 arquivos, 11.458 linhas, tocando `CODEOWNERS`, `deploy-gates.yml` e `db-apply-migration.yml`) para `main` **11 segundos depois de ser aberta**, sem nenhuma revisão.

**5. Cada gate novo piora o problema.** Mais gates sobre uma esteira que não fecha = mais vermelho = mais dependência do bypass. É por isso que 117 dos 500 commits da janela são do tipo `ci` e 35 dos 170 `fix` são `fix(ci)`: o trabalho de CI está se consertando a si mesmo em círculo.

### A consequência prática

Enquanto o Gate 3 não ficar verde e o bypass não fechar, **toda etapa de hardening deste plano entrega zero**. Um gate que ninguém pode esperar ficar verde não é proteção, é ruído. Por isso a Onda 0 deste plano não adiciona nada: ela conserta o que existe e fecha a válvula. As ondas 1 a 19 só fazem sentido depois dela.

### O segundo eixo: o scanner cego

Independente da cadeia acima, três fatos se somam num vazamento consumado:

- `.gitleaks.toml` tem 25 linhas: apenas `title` e `[allowlist]`. **Zero `[[rules]]`, nenhum `[extend] useDefault = true`.** Uma config do gitleaks sem regras e sem extender o ruleset padrão não detecta nada. `gitleaks-history-audit.yml:51` passa `config-path: .gitleaks.toml` explicitamente; `security.yml:43` usa a action sem `config-path`, mas o gitleaks auto-descobre o mesmo arquivo na raiz. A varredura diária de histórico completo roda verde com zero detectores.
- `scripts/kit-enrichment/asia-dims-batch.py:6` e `scripts/kit-enrichment/xbz-dims-batch.py:13` carregam uma chave `service_role` do projeto canônico de produção. Payload do JWT decodificado: `role=service_role`, `ref=doufsxqlfjyuvxuezpln`, `exp=2036-01-03`. Commit de origem `b5e044f45`. Não está na allowlist — não foi exceção deliberada, foi o scanner cego.
- O repositório é **público** (`"private": false`, `"visibility": "public"` na API).

`service_role` ignora RLS por definição. São 388 tabelas, 3,6M linhas em `stock_snapshots` e PII do CRM com leitura e escrita abertas a qualquer pessoa, por mais 9 anos. **O código corrigido não resolve isso** — o commit permanece no histórico público. Só a rotação da chave resolve, e a rotação é do PO.

### O terceiro eixo: o drift de schema que nunca rodou

`git log --all -- 'supabase/baseline/*baseline_schema.sql'` devolve vazio: o baseline que o `db-schema-drift-check` replaya **nunca foi commitado**. `findBaseline()` retorna `null`. E `schema-snapshot-export.yml:71-76` chama o drift-check com `allow_missing_baseline: true`, então sem baseline ele passa vazio. Consequência dupla: o único controle de drift de schema nunca rodou, e o primeiro dump que for gerado vai absorver silenciosamente toda a DDL fora de migration que existe hoje — incluindo a do incidente de 2026-10-13. Somado a `docs/db/BACKUP_STATUS.md:9-18`, onde PITR e backup automático estão `⏳ PENDENTE` com os 4 checkboxes do PO em branco desde 2026-09-16, com ~21 migrations aplicadas em produção nesse intervalo: não existe backup de dados conhecido, só um dump schema-only de setembro.

### Placar da auditoria

| Auditoria | Achados | P0 | P1 | P2 | P3 |
|---|---:|---:|---:|---:|---:|
| Coordenação (config ao vivo) | 10 | 6 | 2 | 2 | 0 |
| CI/CD e workflows | 55 | 5 | 20 | 23 | 7 |
| Banco, migrations e RLS | 52 | 3 | 28 | 21 | 0 |
| Frontend e TypeScript | ver §4 trilha D | — | — | — | — |
| Edge functions e segurança | 54 | 6 | 29 | 19 | 0 |
| Histórico e processo | 61 | 8 | 31 | 22 | 0 |

### O que está certo e não deve ser mexido

Um plano de correção que não diz o que preservar convida o executor a refatorar o que funciona. Está certo e é para ficar como está:

- `src/integrations/supabase/client.ts:25` — `CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln"` íntegro, guardas SSOT no lugar. REGRA #1 cumprida.
- Os 5 campos críticos do tipo `Product` presentes, com gate real em `deploy-gates.yml:137` (`check-product-type-fields.mjs`). A cadeia de regressão de junho está fechada.
- As 8 tabelas/views da REGRA #4 presentes em `types.ts`.
- Conformidade sintática do padrão E12: R1, R2, R4, R5 e R7 com **zero** violações em 127 workflows; 100% das actions pinadas por SHA; zero `pull_request_target`; zero `permissions: write-all`. O `actionlint` 1.7.7 acusa **um único** erro nos 127 arquivos.
- Infra de segurança de edge function bem construída: `_shared/authorize.ts` (revogação por `iat`, AAL2), `_shared/dispatcher-auth.ts` (fail-closed quando o secret falta, vault PG, comparação em tempo constante), `_shared/log-safety.ts`, `_shared/url-allowlist.ts`, o HMAC de `webhook-inbound` e `product-webhook` (este com nonce + timestamp anti-replay), `secrets-manager` e `manage-users` (dev-only, auditoria de negação, valores nunca retornados).
- `PULL_REQUEST_TEMPLATE.md` (exige etapa, reserva, contratos, rollback e autorizações), `CONTRIBUTING.md` (298 linhas), 4 templates de issue, `SECURITY.md`, 6 runbooks, CHANGELOG vivo via release-please.
- O conhecimento tribal sobre o Lovable: os 7 hashes de incidente citados em `CLAUDE.md`, `.lovableignore` e `CODEOWNERS` todos resolvem no repositório. É o maior ativo de processo que existe aqui.

---

## §2 — REGRAS DE EXECUÇÃO

Derivadas do que fez os planos anteriores falharem. Valem para as 200 etapas.

**R1 — A Onda 0 é bloqueante.** Nenhuma etapa da Onda 1 em diante começa antes das 10 etapas da Onda 0 estarem fechadas com o comando de `Pronto:` devolvendo o esperado. A Onda 0 não adiciona nada: ela conserta o Gate 3, fecha o bypass e estanca o vazamento. Sem ela, todo o resto é teatro.

**R2 — Lotes de 10 com portão.** 20 ondas de 10 etapas. A onda N+1 não abre com menos de 8 das 10 etapas da onda N fechadas. As 2 que não fecharem viram pendência nomeada no `plan:status`, não desaparecem. A taxa histórica é 29%: um plano de 200 executado em ondas de 10 com portão entrega mais que um plano de 200 executado em sequência livre.

**R3 — Pronto é comando, não adjetivo.** Toda etapa traz `Pronto:` com comando e código de saída. "Feito", "parcial", "não verificado" e "provavelmente ok" não são estados válidos. Se a etapa não tem comando verificável, ela está mal escrita — recuse e reporte.

**R4 — Uma etapa, um PR.** Limite por PR: 10 arquivos de workflow, **ou** 1 workflow crítico (`deploy-gates.yml`, `db-apply-migration.yml`, `deploy-edge-functions.yml`, `schema-snapshot-export.yml`, `branch-protection-sentinel.yml`), **ou** 1 migration, **ou** 1 edge function. Nunca mistura de categorias. O que destruiu a rastreabilidade antes foi o oposto: PR #1865 com 136 arquivos e 747.111 linhas levando os dois workflows mais críticos de governança junto com 6 migrations, uma auditoria tripla e um plano de 50 etapas.

**R5 — PR obrigatório, inclusive para o CODEOWNER.** Toda mudança em `.github/**`, `CODEOWNERS`, `supabase/migrations/**`, `scripts/check-*` e `.gitleaks.toml` passa por PR. Push direto em `main` só para reverter incidente em curso, e com postmortem no mesmo dia. A REGRA #9 atual pede `git push` e apenas sugere PR — esse buraco foi usado 69 vezes na janela. A etapa P200-E009 fecha o texto da regra.

**R6 — ID global no commit e no PR.** Formato `P200-ENNN` no assunto do commit e no corpo do PR. O namespace `E01..E100` está repetido em mais de 20 planos: `git log --grep E15` devolve 31 commits de planos diferentes, o que torna rastreio por histórico impossível. Prefixo único resolve.

**R7 — Deleção e consolidação antes de hardening.** No mesmo arquivo, primeiro apaga/consolida, depois endurece. Em 2026-10-14 duas rodadas de hardening em `quality-gate.yml` (`64a75418c` 19:33, `71dac9138` 22:07) foram jogadas fora 4 horas depois quando `eb2d7aec2` apagou o arquivo às 23:50.

**R8 — Varredura mecânica exige execução.** Mudança em mais de 10 workflows no mesmo commit só com execução do workflow alterado no mesmo PR. O `persist-credentials: false` aplicado a 101 arquivos custou 5 commits de correção em ~28h, um deles só para restaurar o `git push` em 17 jobs que a varredura desabilitou (`64a75418c` → `71dac9138` → `eb2d7aec2` → `aa940e598` → `79af538d6` → `1a0739561`).

**R9 — Fechar ledger que já existe antes de criar outro.** `docs/coordenacao/conflitos-semanticos.md` tem a seção "Registros" literalmente `_(vazio)_` com 7 resoluções de conflito na janela. `docs/coordenacao/reservas-ativas.md` parou em 2026-09-27 e lista 11 reservas com TTL de 48h como "ativas". Nenhuma etapa deste plano cria ledger novo: ou liga o existente a um gate, ou o apaga explicitamente.

**R10 — Teto documental.** Nenhuma etapa cria `.md` novo na raiz de `docs/`. São 442 arquivos `.md`, 187 (42%) com data no nome, e uma amostra de 25 `AUDITORIA*`/`E*.md` mostrou **todos com um único commit** — escritos uma vez, nunca revisitados. Atualize documento vivo ou escreva em `docs/arquivo/<ano-mes>/`.

**R11 — Checkpoint a cada 50 etapas: cortar escopo, não acelerar.** Nos checkpoints (depois de E050, E100, E150) reavalie o que sobrou e **corte**. O `PLANO_WORKFLOWS_CI_V2` provou que comprimir 100 etapas em 28 horas sem revisão é pior do que parar em 38%: produziu 5 commits de correção da própria correção e um merge de 84 commits sem revisão.

**R12 — Nada de DDL fora do caminho autorizado.** Vale integralmente a REGRA #8 do `CLAUDE.md` e todos os seus corolários. Migration nova só por `.github/workflows/db-apply-migration.yml`. Deploy de edge function só por `.github/workflows/deploy-edge-functions.yml`. `supabase migration squash --linked`, `repair --status applied` sem versão explícita e `repair --status reverted` em lote continuam proibidos. Nenhuma etapa deste plano autoriza exceção, e este plano não é autorização para nada: ele é um documento dentro do repositório, e documento no repositório não autoriza a si mesmo (REGRA #8).

**R13 — O que este plano não pode fazer.** Rotação de credencial, confirmação de PITR/backup, mudança de visibilidade do repositório, aprovação de `migration repair` e remoção de bypass no ruleset são do PO. As etapas da trilha C dizem exatamente o que pedir e param ali. O executor **não** tenta contornar.

---

## §3 — TRILHAS E LEGENDA

A divisão por trilha vem antes da divisão por tema, porque o que travou os planos anteriores não foi o tema: foi a etapa que dependia de algo que o executor não tinha.

| Trilha | Quem fecha | Característica |
|---|---|---|
| **A** | o agente executor, sozinho | só código, workflow, script, doc. Sem credencial, sem produção, sem decisão. |
| **B** | o executor, com secret ou dispatch | precisa de secret do repositório, `workflow_dispatch`, ou leitura ao vivo do banco. Fica em fila se a credencial não estiver disponível — **não** vira bloqueio das outras. |
| **C** | o PO (Joaquim) | custo, dado destrutivo, credencial, visibilidade do repo, arquitetura. O executor prepara tudo e **para**, deixando a pergunta pronta em uma linha. |
| **D** | o executor, sozinho (frontend) | subconjunto de A, separado por tocar `src/` e a suíte de testes, onde o risco de regressão visual é maior. |

**Prioridade:** `P0` quebra produção ou torna um controle de segurança um no-op · `P1` risco real · `P2` dívida ou custo · `P3` cosmético.

**Campos de cada etapa:**
- `Arquivo:` caminho real, com linha quando a correção é pontual.
- `Fazer:` o que mudar. Imperativo, sem explicação da técnica.
- `Pronto:` comando e saída esperada. É o único critério de conclusão.
- `Origem:` o achado que gerou a etapa, para rastrear em §5.

---

## §4 — AS 200 ETAPAS

### ONDA 0 — DESBLOQUEIO (E001–E010) · **BLOQUEANTE**

Esta onda não adiciona nenhum controle novo. Ela conserta o que existe, fecha a válvula de escape e estanca o vazamento. Enquanto não fechar, nenhuma outra onda abre (R1).

#### P200-E001 · [C] · P0 · Rotar a `service_role` do projeto canônico
**Arquivo:** painel Supabase do projeto `doufsxqlfjyuvxuezpln` (fora do repositório)
**Fazer:** pedir ao PO, em uma linha: *"A chave `service_role` de produção está commitada em repositório público desde `b5e044f45` e vale até 2036-01-03. Preciso que você gire ela no painel do Supabase. Enquanto não girar, qualquer pessoa tem leitura e escrita totais no banco, ignorando RLS."* Depois da rotação, atualizar os secrets dependentes (`SUPABASE_SERVICE_ROLE_KEY` nos secrets do repositório e nas edge functions) e parar.
**Pronto:** PO confirma a rotação por escrito e a data fica registrada em `docs/ci/SEGREDOS.md` na linha do segredo → `grep -c "rotacionada em 2026-10" docs/ci/SEGREDOS.md` ≥ 1
**Origem:** C-09, A4-01

#### P200-E002 · [A] · P0 · Remover a chave hardcoded dos scripts de enriquecimento ✅
**Arquivo:** `scripts/kit-enrichment/asia-dims-batch.py:6`, `scripts/kit-enrichment/xbz-dims-batch.py:13`
**Fazer:** trocar o literal por `os.environ["SUPABASE_SERVICE_ROLE_KEY"]`, com `sys.exit(1)` e mensagem clara se a variável não estiver definida. Não inventar fallback. Não deixar comentário com o valor antigo.
**Pronto:** `grep -rcE "eyJ[A-Za-z0-9_-]{20,}" scripts/kit-enrichment/` → `0` em todos os arquivos
**Origem:** C-09, A4-01

#### P200-E003 · [A] · P0 · Dar regras ao gitleaks ✅
**Arquivo:** `.gitleaks.toml`
**Fazer:** acrescentar `[extend]` com `useDefault = true` no topo, antes do `[allowlist]`. Manter as 2 entradas de allowlist existentes (a publishable key e a URL do projeto são públicas de verdade). Rodar o gitleaks localmente no histórico completo e triar o que aparecer: valor público vai para a allowlist com justificativa na linha, segredo real vira etapa de rotação na trilha C.
**Pronto:** `grep -c "useDefault" .gitleaks.toml` → `1` **e** `docker run --rm -v "$PWD:/p" zricethezav/gitleaks:latest detect -s /p -c /p/.gitleaks.toml --no-banner` detecta a chave de E002 antes do fix e sai `0` depois
**Origem:** C-08

#### P200-E004 · [B] · P0 · Consertar o `Gate 3 - E2E Smoke` ✅
**Arquivo:** `.github/workflows/deploy-gates.yml:355-366`, `scripts/run-smoke-filtered.mjs`, specs com tag `@smoke`
**Fazer:** baixar o artefato `playwright-report` de um run reprovado (`gh run download`), identificar qual spec `@smoke` falha e por quê, e consertar a causa. Não desabilitar, não remover a tag, não marcar `continue-on-error`, não pular o teste — R3 do `CLAUDE.md` §REGRA #5 vale aqui. Se a falha for de dado em produção (conta E2E sem permissão, produto ausente, carrinho órfão), corrigir o dado e registrar o que foi corrigido.
**Pronto:** `gh api "repos/adm01-debug/Promo_Gifts_V4/actions/workflows/deploy-gates.yml/runs?per_page=5" --jq '[.workflow_runs[].conclusion]'` mostra `success` nos 2 runs mais recentes de PR
**Origem:** C-07

#### P200-E005 · [C] · P0 · Fechar o bypass de admin no ruleset
**Arquivo:** ruleset `16764622` ("Protect main"), fora do repositório
**Fazer:** pedir ao PO: *"O ruleset de `main` permite que qualquer admin ignore todos os gates (`bypass_mode: always`) e exige 0 aprovações. Foi por isso que 69 commits entraram direto em main na janela. Preciso que você remova o `bypass_actors` e suba `required_approving_review_count` para 1."* Só depois de E004 — fechar o bypass com o Gate 3 vermelho trava o repositório inteiro.
**Pronto:** `gh api repos/adm01-debug/Promo_Gifts_V4/rulesets/16764622 --jq '{bypass: .bypass_actors, aprov: (.rules[]|select(.type=="pull_request")|.parameters.required_approving_review_count)}'` → `bypass: []` e `aprov: 1`
**Origem:** C-01, C-02, A5-11, A5-41

#### P200-E006 · [C] · P0 · Remover a branch protection clássica órfã
**Arquivo:** `GET /repos/adm01-debug/Promo_Gifts_V4/branches/main/protection`, fora do repositório
**Fazer:** a proteção clássica exige os contextos `quality-gate` e `security-audit`. Nenhum dos dois está em `.github/required-checks.json`, `quality-gate.yml` foi apagado em E15, e os nomes hoje resolvem ambiguamente para job ids em 4 workflows diferentes (`ci-security-drift.yml:28` e `:159`, `delivery-quality.yml:29`, `freight-quality-gates.yml:317`, `nightly-full.yml:26` — este só em schedule). Pedir ao PO para apagar a proteção clássica e deixar só o ruleset, que é a fonte que o `required-checks-guard` valida.
No mesmo pedido, apagar o ruleset **24121385** ("Protect main branch", criado 2026-09-28), que aplica somente `deletion` — regra que o ruleset 16764622 já tem. Dois rulesets ativos para o mesmo branch, um deles vazio, só confundem auditoria.
**Pronto:** `gh api repos/adm01-debug/Promo_Gifts_V4/branches/main/protection 2>&1 | grep -c "Branch not protected"` → `1`; `gh api repos/adm01-debug/Promo_Gifts_V4/rulesets --jq 'length'` → `1`
**Origem:** C-03, C-05

#### P200-E007 · [A] · P0 · Fazer o Gate E23 poder falhar ✅
**Arquivo:** `.github/workflows/deploy-gates.yml:323-326`, `.github/workflows/_secrets-check.yml:28`
**Fazer:** o gate chama o reusable sem `fail_if_missing`, cujo default é `false`, então o job sempre sai 0 e a checagem `[[ "$R_SECRETS" == "success" ]]` na linha 551 é tautológica. Passar `with: { fail_if_missing: true }`, **ou** — se a intenção é só expor o output `has_e2e` — remover o gate da tabela de bloqueantes do `CLAUDE.md` e apagar a linha 551 do agregador. Decidir uma das duas e não deixar as duas meias.
**Pronto:** `grep -A3 "_secrets-check.yml" .github/workflows/deploy-gates.yml | grep -c "fail_if_missing: true"` → `1`, ou a linha 551 deixa de existir e o `CLAUDE.md` marca E23 como não-bloqueante
**Origem:** A1-01, A1-15

#### P200-E008 · [A] · P0 · Fazer o Gate 1.13 comparar de verdade ⏳
**Arquivo:** `.github/workflows/deploy-gates.yml:239-243`, `scripts/check-policies-baseline.mjs:233-250`
**Fazer:** o gate precisa usar `--require-live` em push e PR interno, com condição explícita para pular apenas PRs de fork que não recebem `SUPABASE_ACCESS_TOKEN`. Assim, ausência de credencial ou falha da Management API não vira aprovação estática. No `supabase-security-gate.yml`, habilitar CHECKs 3 e 4 em PRs internos e restringi-los explicitamente a esses eventos, como os demais checks que usam credenciais.
**Pronto:** teste automatizado confirma `--require-live` no Gate 1.13, condição de fork explícita nos três steps e que os CHECKs 3/4 do Gate 5 rodam em push e PR interno; `node scripts/check-policies-baseline.mjs --require-live` sem credenciais termina inconclusive (exit 2); Gate Final e Gate 5 passam no CI.
**Origem:** A1-02, A2-10, A2-41

#### P200-E009 · [A] · P0 · Reescrever a REGRA #9: governança exige PR, não push ✅
**Arquivo:** `CLAUDE.md` (REGRA #9)
**Fazer:** o texto atual pede `git push` ao final da sessão e apenas *sugere* abrir PR. O buraco foi usado 69 vezes na janela, quase tudo em `.github/**`. Reescrever: mudança em `.github/**`, `CODEOWNERS`, `supabase/migrations/**`, `scripts/check-*` e `.gitleaks.toml` exige **PR**, inclusive do CODEOWNER; push direto em `main` só para reverter incidente em curso, com postmortem no mesmo dia.
**Pronto:** `grep -c "exige PR" CLAUDE.md` ≥ 1 **e** `grep -c "git push ao final" CLAUDE.md` → `0`
**Origem:** A5-41, A5-55, C-04

#### P200-E010 · [A] · P1 · Criar `npm run plan:status` ✅
**Arquivo:** `scripts/plan-status.mjs` (novo), `package.json`
**Fazer:** script que lê este plano, extrai o comando de cada campo `Pronto:`, executa, e imprime o placar: `fechadas / abertas / falhando`, agrupado por onda e trilha. Saída em tabela no stdout e em `--json` para CI. Sem isso a medição deste plano vira outra auditoria de 1.258 linhas seis semanas depois.
**Pronto:** `npm run plan:status` imprime placar com as 200 etapas e sai `0`; `npm run plan:status -- --json | jq '.total'` → `200`
**Origem:** A5-01, A5-07, A5-08

> **PORTÃO DA ONDA 0:** todas as 10 fechadas. E001, E005 e E006 são da trilha C — se o PO não responder, as etapas A/B da onda seguem, mas **nenhuma onda posterior abre** enquanto E004 e E005 estiverem abertas, porque são elas que fazem os gates valerem algo.

---

### ONDA 1 — GATES QUE MENTEM (E011–E020)

Gates declarados bloqueantes que terminam verdes sem verificar nada. São a razão pela qual a esteira dá uma falsa sensação de cobertura.

#### P200-E011 · [A] · P0 · Ressuscitar o `merge-reports` do E2E ✅
**Arquivo:** `.github/workflows/e2e.yml:177`
**Fazer:** `needs: e2e-shard` mas `if: always() && (needs.e2e-gates.result == 'success')`. `needs.e2e-gates` não existe nesse contexto — é o único erro que o `actionlint` 1.7.7 acusa nos 127 workflows. Expressão sempre falsa: o job nunca roda desde o sharding do E17 (`520f25afb`). Trocar por `needs.e2e-shard.result` ou incluir `e2e-gates` em `needs:`.
**Pronto:** `actionlint .github/workflows/e2e.yml` → exit `0` **e** o job `merge-reports` aparece como executado no run mais recente
**Origem:** A1-03

#### P200-E012 · [A] · P0 · Mover o guard de suíte vazia para dentro do shard ✅
**Arquivo:** `.github/workflows/e2e.yml:218-221`
**Fazer:** o step `Check min tests executed` (E42) e o `🛑 Fail job se algum shard registrou falhas` vivem no job morto do E011 — o anti-falso-verde do E2E de regressão é um no-op. Mover o `check-min-tests` para dentro de `e2e-shard`, para cada shard validar o próprio mínimo executado.
**Pronto:** um run com `--grep=@naoexiste` forçado reprova o shard, em vez de passar verde
**Origem:** A1-04

#### P200-E013 · [A] · P0 · Excluir `chromium-authed` da matriz quando não há secret ✅
**Arquivo:** `.github/workflows/e2e.yml:112-141`
**Fazer:** a matriz roda `[chromium-public, chromium-authed]` e o step de teste tem `if: matrix.project == 'chromium-public' || env.E2E_USER_EMAIL != ''`. Sem o secret, os 4 shards `chromium-authed` terminam verdes com zero testes executados. Usar o output `has_e2e` do `_secrets-check.yml` para montar a matriz via `fromJSON`, em vez de `if:` por step.
**Pronto:** sem `E2E_USER_EMAIL` no ambiente, o run mostra 4 jobs em vez de 8 — nenhum job verde com zero testes
**Origem:** A1-05

#### P200-E014 · [B] · P1 · Fazer o Gate 1.2 comparar contra o `pg_catalog` ✅
**Arquivo:** `.github/workflows/deploy-gates.yml:147`, `scripts/check-types-inventory-drift.mjs`
**Fazer:** o gate roda `--base "$BASE"` sem `--live`, então nunca compara `types.ts` contra o banco: só faz git-diff entre base e HEAD. Acrescentar um step (ou cron diário) com `--live` e `DATABASE_URL`, tratando indisponibilidade como `inconclusive` explícito, nunca como passe.
**Pronto:** `node scripts/check-types-inventory-drift.mjs --live` roda no CI e reprova quando uma tabela viva falta em `types.ts`
**Origem:** A2-18

#### P200-E015 · [A] · P1 · Fazer o Gate 3 sempre executar alguma coisa ✅
**Arquivo:** `.github/workflows/deploy-gates.yml:334`, `:578-585`
**Fazer:** o gate é `if: needs.secrets-check.outputs.has_e2e == 'true'`; em PR sem secrets o skip gera só `::warning::` no agregador, então o único E2E do required check pode não rodar em nenhum PR de fork. Rodar o subconjunto `chromium-public` do smoke sem credencial, para o gate sempre executar.
**Pronto:** um PR sem secrets E2E mostra o `Gate 3` executado com ≥1 teste, não `skipped`
**Origem:** A1-16

#### P200-E016 · [A] · P1 · `deploy-vercel` não pode terminar verde sem deployar ✅
**Arquivo:** `.github/workflows/deploy-vercel.yml:63-68`
**Fazer:** quando `can_deploy=false` o job `deploy` fica `skipped` e o workflow termina verde, mascarando secrets Vercel ausentes num caminho de fallback de emergência. Fazer o `check-secrets` sair 1 em vez de emitir output, ou acrescentar job agregador que reprove no skip.
**Pronto:** com `VERCEL_TOKEN` ausente o workflow conclui `failure`, não `success`
**Origem:** A1-10

#### P200-E017 · [A] · P1 · CodeQL não pode passar verde sem analisar ✅
**Arquivo:** `.github/workflows/codeql.yml:~72-90`
**Fazer:** todos os steps de análise e o ratchet E96 de alertas HIGH/CRITICAL estão sob `if: steps.code-security.outputs.enabled == 'true'`. Se o Code Security não estiver habilitado, o job termina verde sem analisar nem ratchetar. Reprovar com `exit 1` em push para `main` quando `enabled=false`, ou declarar o estado em `required-checks.json` como gate conhecido-ausente.
**Pronto:** com `enabled=false` simulado o job conclui `failure` em push para `main`
**Origem:** A1-06

#### P200-E018 · [A] · P1 · Inverter o default do rate limiter para fail-closed ✅
**Arquivo:** `supabase/functions/_shared/rate-limiter.ts:45`
**Fazer:** o fail-open é o default e só o limiter `approval` usa `failClosed`. Um erro no banco desliga **todos** os rate limits do projeto de uma vez. Inverter o default para `failClosed: true` e marcar as exceções explicitamente, uma por uma, com comentário dizendo por quê.
No mesmo PR, corrigir `rate-limit-check/index.ts:19,129-137`, que mantém o store num `Map` **em memória** — limite por isolate, então os 5/min do login são decorativos — e cujo `catch` devolve `status 200 allowed:true`. Migrar para a RPC `check_edge_rate_limit` do `_shared/rate-limiter` e fail-closed no caminho de login.
**Pronto:** `grep -c "failClosed = true" supabase/functions/_shared/rate-limiter.ts` ≥ 1; erro de banco devolve 429/503, não 200; `grep -c "new Map" supabase/functions/rate-limit-check/index.ts` → `0`
**Origem:** A4-25, A4-26

#### P200-E019 · [A] · P1 · `e2e-cleanup` fail-closed na allowlist vazia ✅
**Arquivo:** `supabase/functions/e2e-cleanup/index.ts:113`
**Fazer:** `if (ALLOWED_EMAILS.size > 0 && ...)` — com `E2E_CLEANUP_ALLOWED_EMAILS` vazio a allowlist é pulada inteira e o token apaga `quotes`, `orders` e `quote_items` de **qualquer** usuário. Inverter: allowlist vazia devolve 503.
**Pronto:** sem a env var a função responde 503; com ela, só os e-mails listados são afetados
**Origem:** A4-15

#### P200-E020 · [A] · P1 · `secure-upload` fail-closed sem antivírus ✅
**Arquivo:** `supabase/functions/secure-upload/index.ts:228`, `:251-255`
**Fazer:** três falhas na mesma função. `if (vtApiKey)` — sem `VIRUSTOTAL_API_KEY` o scan é inteiramente pulado e o arquivo vai para o bucket `verified/` público. E VT 404 (hash desconhecido) é tratado como "permitido upload inicial", o que deixa passar todo malware novo ou dirigido. E o `contentType` em `:295` e `:321-322` vem de `file.type` (multipart, controlado pelo cliente) e o objeto é publicado por `getPublicUrl`: `text/html` ou `image/svg+xml` = XSS armazenado em domínio próprio. Sem credencial: 503. Hash desconhecido: enviar para análise e quarentenar até veredito. `file.type` validado contra allowlist de `image/*`, com o Content-Type forçado no upload.
**Pronto:** sem `VIRUSTOTAL_API_KEY` a função responde 503; arquivo com hash inédito fica em quarentena; upload de `.svg` ou `.html` → 400
**Origem:** A4-16, A4-17, A4-18

> **PORTÃO DA ONDA 1:** ≥8 de 10 fechadas.

---

### ONDA 2 — EDGE FUNCTIONS SEM AUTENTICAÇÃO (E021–E030)

Sete funções deployadas em produção (recibos nos runs `37380000049` e `37449001108`, 2026-10-05/06) sem nenhuma verificação de chamador. O motivo de terem passado verdes está em E030: o gate de autorização só cobre 33 das 109 funções.

#### P200-E021 · [C] · P0 · Decidir o destino da `load-test` ✅
**Arquivo:** `supabase/functions/load-test/index.ts:7-16`, `:57`, `:79-92`, `:126-129`
**Fazer:** a função não autentica ninguém e envia `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY` para um `targetEndpoint` arbitrário vindo do corpo da requisição — entrega a chave de produção a qualquer destino que o chamador escolher. E aceita `totalRequests ≤ 100000 × concurrency ≤ 1000`, o que a torna um amplificador de DDoS saindo dos IPs do Supabase. Perguntar ao PO: *"Essa função de teste de carga está em produção, sem autenticação, e repassa a service_role para qualquer URL. Deleto do canônico ou você precisa dela?"* Se precisar: `authorize(req, { requireRole: 'dev' })` + `assertAllowedExternalUrl`, nunca anexando a service_role, e teto de 100×10.
**Pronto:** a função não aparece em `supabase functions list` do canônico, **ou** `grep -c "requireRole: 'dev'" supabase/functions/load-test/index.ts` → `1` e `grep -c "SERVICE_ROLE" supabase/functions/load-test/index.ts` → `0`
**Origem:** A4-02, A4-03

#### P200-E022 · [A] · P0 · `audit-suite` — exigir autorização ✅
**Arquivo:** `supabase/functions/audit-suite/index.ts:28`, `:49-60`
**Fazer:** sem autenticação, cria usuários via `auth.admin.createUser` e insere em `user_roles` com a service_role, em produção. Pôr `authorize(req, { requireRole: 'dev', enforceServerSide: true })` como primeira linha do handler.
**Pronto:** `curl -X POST <url>/audit-suite` sem token → 401; `grep -c "authorize(req" supabase/functions/audit-suite/index.ts` ≥ 1
**Origem:** A4-04

#### P200-E023 · [A] · P0 · `audit-suite` — cleanup em `finally` ✅
**Arquivo:** `supabase/functions/audit-suite/index.ts:129-130`
**Fazer:** o `deleteUser` dos 2 usuários de teste está dentro do `try`, sem `finally`. Qualquer exceção deixa usuários e linhas de `user_roles` órfãos em `auth.users` de produção. Mover para `finally`, como `test-cart-*/index.ts` já fazem.
**Pronto:** `grep -c "finally" supabase/functions/audit-suite/index.ts` ≥ 1; teste com exceção forçada não deixa usuário órfão
**Origem:** A4-54

#### P200-E024 · [A] · P0 · `test-cart-concurrency` e `test-cart-limit` — autorização e senha aleatória ✅
**Arquivo:** `supabase/functions/test-cart-concurrency/index.ts:20-27`, `supabase/functions/test-cart-limit/index.ts:29`
**Fazer:** as duas criam usuário em `auth.users` de produção com senha hardcoded e e-mail de padrão previsível, sem autenticação. Exigir `authorize(req, { requireRole: 'dev' })` e gerar a senha com `crypto.getRandomValues`.
**Pronto:** `grep -lc "requireRole: 'dev'" supabase/functions/test-cart-{concurrency,limit}/index.ts` → 2 arquivos; nenhuma senha literal nos dois
**Origem:** A4-05, A4-06

#### P200-E025 · [A] · P0 · `test-cart-rls` — autorização e senha aleatória ✅
**Arquivo:** `supabase/functions/test-cart-rls/index.ts:30`, `:38-52`
**Fazer:** mesmo padrão de E024, criando 2 usuários em produção.
**Pronto:** `curl` sem token → 401; nenhuma senha literal no arquivo
**Origem:** A4-07

#### P200-E026 · [A] · P0 · `test-contract-orchestrator` — não provisionar webhook em runtime ✅
**Arquivo:** `supabase/functions/test-contract-orchestrator/index.ts:71-75`
**Fazer:** sem autenticação, faz UPSERT em `inbound_webhook_endpoints` criando o slug `test-automated` com `hmac_secret_ref=SIMULATION_BYPASS_KEY` — ou seja, um anônimo provisiona um ingress de webhook assinado. Exigir `authorize(req, { requireRole: 'dev' })` e remover o provisionamento em runtime: o endpoint de teste deve nascer por migration.
**Pronto:** `grep -c "inbound_webhook_endpoints" supabase/functions/test-contract-orchestrator/index.ts` → `0`; `curl` sem token → 401
**Origem:** A4-08

#### P200-E027 · [A] · P0 · `test-inventory-orchestrator` — fechar o oráculo de configuração ✅
**Arquivo:** `supabase/functions/test-inventory-orchestrator/index.ts:36-50`
**Fazer:** sem autenticação, devolve o mapa `{name, present, source}` de `SUPABASE_SERVICE_ROLE_KEY`, `WEBHOOK_DISPATCHER_SECRET` e `EXTERNAL_CRM_URL`. Mesmo sem valores, dizer a um anônimo quais segredos existem e de onde vêm é reconhecimento. Exigir `requireRole: 'dev'` ou remover a função.
**Pronto:** `curl` sem token → 401, ou a função não existe no canônico
**Origem:** A4-09

#### P200-E028 · [A] · P1 · `bulk-random-passwords` — step-up e auditoria ✅
**Arquivo:** `supabase/functions/bulk-random-passwords/index.ts:126-142`
**Fazer:** reset em massa de senha de até 1000 contas protegido apenas por um `x-admin-token` estático, sem role, sem MFA, sem rate limit e sem auditoria. Exigir `authorize(req, { requireRole: 'dev', requireAal2: true })` + `x-step-up-token`, e gravar cada execução em `audit_log`.
**Pronto:** chamada só com `x-admin-token` → 403; execução autorizada deixa linha em `audit_log`
**Origem:** A4-19

#### P200-E029 · [A] · P1 · `bulk-random-passwords` — dry-run não dumpa o diretório ✅
**Arquivo:** `supabase/functions/bulk-random-passwords/index.ts:216-219`
**Fazer:** o `mode` default é `dry_run` e a resposta inclui `users: [{id, email}]` de **todas** as contas. Com o token, um dry-run "inócuo" exporta o diretório de usuários. Devolver apenas contagem.
**Pronto:** `grep -c "email" supabase/functions/bulk-random-passwords/index.ts` não inclui o campo no payload de resposta do dry-run
**Origem:** A4-20

#### P200-E030 · [A] · P0 · Fazer o gate de autorização cobrir as 109 funções ✅
**Arquivo:** `scripts/check-edge-authorization.mjs:9-16`, `supabase/functions/_shared/edge-authz-manifest.ts`
**Fazer:** este é o gate que deixou E021–E027 passarem. Hoje ele só verifica funções `supervisor`/`dev` **com** `enforcedBy: "shared-authorize"`. `enforcedBy: "custom"` passa sem nenhuma verificação de código, e as categorias `public`/`authenticated`/`service`/`scoped` — 76 das 109 funções — não têm enforcement algum. Exigir que toda entrada `custom` aponte um teste em `tests/security/edge-authz-bypass.test.ts`, e reprovar quando o `index.ts` não contiver nenhuma primitiva de auth conhecida.
No mesmo PR, fechar 4 lacunas do gate de edge function: (1) `edge-functions-drift-check.yml` não está em `required-checks.json`, então drift entre git e canônico depende de disciplina humana — acrescentar o job "Compare GitHub × Canonical"; (2) `edge-functions-drift-check.yml:25-28` não tem `supabase/config.toml` nem `.security/edge-functions-verify-jwt-false-allowlist.json` no filtro `paths:`, então PR que só mude `verify_jwt` não dispara o gate E42; (3) em `:200-215` o `repo_manifest` é construído iterando os caminhos **do canônico**, então arquivo presente no repo e ausente no canônico não altera o hash — computar os dois manifestos independentemente e comparar também os conjuntos de caminhos; (4) corrigir os comentários de `config.toml` e do manifest que tratam `verify_jwt=true` como barreira de autenticação: a chave anon é um JWT válido do projeto (`src/integrations/supabase/client.ts:28`) e satisfaz o gateway — `verify_jwt` é anti-ruído, não autorização.
**Pronto:** `node scripts/check-edge-authorization.mjs --gate` reprova ao se remover o `authorize()` de uma função `custom`; o drift check é required; PR que só toca `config.toml` dispara o gate
**Origem:** A4-31, A4-29, A4-30, A4-48, A4-32

> **PORTÃO DA ONDA 2:** ≥8 de 10. E030 é obrigatória no portão — sem ela as outras 9 regridem sem aviso.

---

### ONDA 3 — BASELINE E DRIFT DE SCHEMA (E031–E040)

O único controle de drift de schema nunca rodou. A ordem desta onda importa: levantar o drift **antes** de gerar o baseline, senão o dump fotografa a divergência como se fosse o estado correto.

#### P200-E031 · [B] · P0 · Levantar o drift atual antes de qualquer baseline
**Arquivo:** relatório novo em `docs/arquivo/2026-10/` (R10)
**Fazer:** com `DATABASE_URL`, rodar `supabase db diff` contra o histórico de migrations e listar todo objeto que existe em produção sem migration correspondente. Classificar cada um: (a) vira migration espelho, (b) é ruído legítimo de allowlist, (c) é para remover. Não gerar baseline nesta etapa.
**Pronto:** relatório existe com um veredito (a/b/c) por objeto divergente, e nenhum objeto sem veredito
**Origem:** A2-02

#### P200-E032 · [A] · P0 · Converter em migration espelho o que E031 classificou como (a)
**Arquivo:** `supabase/migrations/` (novos arquivos)
**Fazer:** uma migration por objeto ou por grupo coeso, idempotente (`IF NOT EXISTS`), seguindo R4 (uma migration por PR). Objeto criado em produção sem migration vira migration espelho, **nunca** entrada de allowlist — é o que o corolário do `CLAUDE.md` REGRA #8 determina.
**Pronto:** todo objeto (a) de E031 tem arquivo em `supabase/migrations/`; `node scripts/preflight-migration-apply.mjs` sai `0` para cada um
**Origem:** A2-02

#### P200-E033 · [B] · P0 · Gerar e commitar o primeiro baseline
**Arquivo:** `supabase/baseline/<B>_baseline_schema.sql`, `<B>_ledger_versions.json`
**Fazer:** só depois de E031 e E032. Dispatch do `schema-snapshot-export.yml` e merge da PR `bot/schema-snapshot`, revisando o diff do baseline antes do merge. O baseline não é migration: nunca copiar para `supabase/migrations/`, nunca aplicar em produção.
**Pronto:** `git log --all -- 'supabase/baseline/*baseline_schema.sql'` devolve ≥1 commit; `node scripts/drift-baseline.mjs` encontra o baseline em vez de `null`
**Origem:** A2-01

#### P200-E034 · [A] · P0 · Tirar o `allow_missing_baseline` do drift-gate ✅
**Arquivo:** `.github/workflows/schema-snapshot-export.yml:71-76`
**Fazer:** o `drift-gate` chama o drift-check com `allow_missing_baseline: true`, então sem baseline ele passa vazio. Com E033 fechada, remover a flag — o gate deve reprovar quando não houver baseline, não passar.
**Pronto:** `grep -c "allow_missing_baseline: true" .github/workflows/schema-snapshot-export.yml` → `0`
**Origem:** A2-02

#### P200-E035 · [A] · P1 · Drift-check em todos os schemas de aplicação ✅
**Arquivo:** `.github/workflows/db-schema-drift-check.yml:207`
**Fazer:** o `db diff` roda só `--schema public`, deixando `ops`, `analytics`, `cf_recon`, `prod_audit`, `internal`, `api`, `supplier_stricker`, `storage`, `vault` e `auth` sem verificação — 19+ schemas por `BACKUP_STATUS.md`. Passar a lista completa, versionada num arquivo único compartilhado com o export (para os dois nunca divergirem).
**Pronto:** `grep -c "schemas.txt\|SCHEMAS=" .github/workflows/db-schema-drift-check.yml` ≥ 1 e o mesmo arquivo é lido por `schema-snapshot-export.yml`
**Origem:** A2-05

#### P200-E036 · [A] · P1 · Inventariar event triggers em vez de descartá-los ✅
**Arquivo:** `scripts/drift-baseline.mjs:169`, `:204-223`
**Fazer:** `sanitizeBaselineForReplay()` descarta todo `ALTER EVENT TRIGGER` e `COMMENT ON EVENT TRIGGER` (foi o que o HEAD `d6cdb44` fez), e o dump já não traz `CREATE EVENT TRIGGER`. Resultado: event triggers são 100% invisíveis ao drift-check. Exportar o inventário de `pg_event_trigger` como arquivo auxiliar versionado e comparar em passo próprio.
**Pronto:** existe `supabase/baseline/<B>_event_triggers.json` e o drift-check reprova quando um event trigger é criado fora de migration
**Origem:** A2-06

#### P200-E037 · [A] · P1 · Inventariar `cron.job`, publications e `ALTER ROLE` ✅
**Arquivo:** `scripts/drift-baseline.mjs:82-95`
**Fazer:** o próprio cabeçalho do baseline declara que não contém pg_cron, storage, vault, schema `auth`, publications nem config por role. E foi exatamente `cron.alter_job` fora de migration que produziu o incidente de 2026-10-13. Exportar `cron.job`, publications e `ALTER ROLE ... SET` como inventários JSON versionados (padrão `CRON_JOB_DATA`) com gate de diff.
**Pronto:** o drift-check reprova quando um `cron.job` é alterado fora de migration
**Origem:** A2-07

#### P200-E038 · [A] · P1 · Ancorar e validar a allowlist de drift ✅
**Arquivo:** `supabase/baseline/drift-allowlist.txt`, `scripts/drift-baseline.mjs:225-239`
**Fazer:** `filterDiff` aplica `new RegExp` sem âncora, e a proibição de regex genérica (`^grant`, `^alter table`) existe só como comentário, sem nada no código aplicando. Validar que cada entrada contém identificador qualificado (`schema."objeto"`) e reprovar entrada genérica. Compilar cada regex em `try/catch` próprio, citando número de linha no erro. Agrupar o diff por statement antes de filtrar, para a granularidade não ser a linha.
**Pronto:** `node --test tests/scripts/drift-allowlist.test.mjs` cobre entrada genérica (reprova), regex inválida (erro com nº de linha) e DDL multi-linha
**Origem:** A2-08, A2-35, A2-36

#### P200-E039 · [A] · P1 · Bloquear baseline gerado do projeto errado ✅
**Arquivo:** `scripts/drift-baseline.mjs:57-67`
**Fazer:** `findSecrets()` bloqueia JWT, PAT e chaves no dump, mas não procura o project-ref proibido `pqpdolkaeqlyzpdpbizo` nem exige a presença do canônico. Baseline gerado do projeto errado passa pelo abort. Acrescentar as duas condições.
**Pronto:** um dump de teste contendo `pqpdolkaeqlyzpdpbizo` faz o export abortar com exit ≠ 0
**Origem:** A2-09

#### P200-E040 · [A] · P1 · Tornar o drift-check um required check ✅
**Arquivo:** `.github/required-checks.json`
**Fazer:** só depois de E033 a E039. O job `Migrations x Canonical schema` não é required nem é chamado pelo `deploy-gates.yml`, então pode ficar vermelho indefinidamente sem bloquear merge. Acrescentar ao `required_checks` do ruleset `main` e, no mesmo PR, atualizar o ruleset no GitHub (trilha C se precisar do PO).
**Pronto:** `node scripts/check-required-checks.mjs --gate` sai `0` com o novo check na lista e o ruleset ao vivo refletindo
**Origem:** A2-04

> **PORTÃO DA ONDA 3:** E031→E032→E033→E034 nesta ordem, sem pular. ≥8 de 10 no total.

---

### ONDA 4 — RLS E POLICIES (E041–E050)

950 policies no baseline assinado. O modelo é quase inteiramente permissivo: só 2 das 950 são `RESTRICTIVE`, o que significa que policy nova sempre amplia acesso e nunca restringe.

#### P200-E041 · [A] · P0 · Fechar leitura anônima de tabelas fiscais e de suprimento ✅
**Arquivo:** `.security/policies-baseline.json`, migration nova
**Fazer:** 23 policies com role `anon` usam `USING (true)` — leitura anônima irrestrita. Começar por `product_fiscal`, `product_supply`, `system_kill_switches`, `product_ai_content` e `product_seo`. Trocar por view `v_*_public` com colunas explícitas (padrão P6 do `SCHEMA_REFERENCE.md`) ou por predicado de publicação. Uma tabela por PR (R4).
**Pronto:** `jq '[.policies[]|select(.roles|index("anon"))|select(.qual=="true")]|length' .security/policies-baseline.json` cai de 23 para ≤18 nesta onda, e `product_fiscal`/`product_supply` não estão mais na lista
**Origem:** A2-12

#### P200-E042 · [A] · P1 · Lote 1 das 248 policies sem `TO` explícito ✅
**Arquivo:** migration nova
**Fazer:** 248 policies têm `roles={public}` (criadas sem `TO`), são avaliadas para todos os roles incluindo `anon`, e a única barreira efetiva passa a ser o GRANT. Recriar com `TO authenticated` / `TO service_role`, em lotes por tabela, priorizando as tabelas com PII e dado financeiro. Lote 1 = 10 tabelas de maior exposição.
**Pronto:** `jq '[.policies[]|select(.roles==["public"])]|length' .security/policies-baseline.json` desce de 248 para ≤238
**Origem:** A2-13

#### P200-E043 · [A] · P1 · Reprovar policy nova com `roles={public}` ✅
**Arquivo:** `scripts/check-policies-baseline.mjs`
**Fazer:** fechar a porta antes de esvaziar o quarto: o gate deve recusar qualquer policy **nova** com `roles={public}` ou `anon` + `USING (true)`, mantendo as 248 existentes como baseline a drenar. Sem isso, E042 enche de novo.
**Pronto:** o gate reprova ao se adicionar no baseline de teste uma policy `TO public`
**Origem:** A2-13

#### P200-E044 · [A] · P1 · Baseline de policies sem filtro de schema ✅
**Arquivo:** `scripts/check-policies-baseline.mjs:57-62`
**Fazer:** a query filtra `schemaname = 'public'`, então policies de `ops`, `analytics`, `cf_recon` e `storage` não entram no baseline assinado nem no gate. Remover o filtro (ou listar todos os schemas de aplicação, compartilhando o arquivo de E035) e regenerar com `--update-baseline`.
**Pronto:** `jq '[.policies[].schema]|unique|length' .security/policies-baseline.json` > 1
**Origem:** A2-11

#### P200-E045 · [A] · P1 · Implementar o gate de RLS sem policy ✅
**Arquivo:** `scripts/check-rls-no-policy-drift.mjs` (novo), `.security/rls-no-policy-allowlist.json`
**Fazer:** o próprio arquivo de allowlist declara no campo `description` que "nenhum script de CI lê este arquivo ainda". Tabela nova com RLS ligada e zero policies entra em produção sem gate algum — e fica trancada ou aberta, dependendo do GRANT. Escrever o script no molde de `check-secdef-anon-drift.mjs` e plugar no `deploy-gates.yml`.
**Pronto:** `node scripts/check-rls-no-policy-drift.mjs --gate` sai `0` hoje e reprova ao se adicionar tabela RLS-sem-policy fora da allowlist
**Origem:** A2-14

#### P200-E046 · [C] · P1 · Decidir a migration `internal_deny_direct_access`
**Arquivo:** `supabase/migrations/20260716000055_dynamic_explicit_deny_rls_no_policy_tables.sql`
**Fazer:** a migration que cria `internal_deny_direct_access` (RESTRICTIVE `USING(false)`) em toda tabela RLS-sem-policy existe desde 2026-07-16 e nunca foi aplicada — zero ocorrências no baseline de 2026-10-15. Revalidar contra as 5 tabelas atuais da allowlist e perguntar ao PO: *"Aplico essa migration de negação explícita (ela tranca tabelas que hoje dependem só do GRANT) ou arquivo?"*
**Pronto:** a migration está aplicada com recibo em `MIGRATIONS_SYNC_LOG.md`, **ou** foi movida para `supabase/sql-legacy/` com a razão escrita
**Origem:** A2-15

**Revalidação 2026-10-30 (somente leitura):** a policy `internal_deny_direct_access` não foi
encontrada no catálogo e a versão `20260716000055` não aparece no ledger consultado. A existência
do arquivo não autoriza aplicá-lo; a etapa segue pendente de decisão explícita do PO e do fluxo
versionado de migration previsto nas regras do projeto.

#### P200-E047 · [A] · P2 · Uma `RESTRICTIVE` por tabela sensível ✅
**Arquivo:** migration nova
**Fazer:** com só 2 RESTRICTIVE em 950, o default do modelo é união (OR). Introduzir uma RESTRICTIVE por tabela sensível, no padrão de E046, para que o default passe a ser interseção nessas tabelas.
**Pronto:** `jq '[.policies[]|select(.permissive=="RESTRICTIVE")]|length' .security/policies-baseline.json` ≥ 12
**Origem:** A2-40

#### P200-E048 · [A] · P2 · `plannedKeys` tem de casar mais que o nome ✅
**Arquivo:** `scripts/check-policies-baseline.mjs:328-347`
**Fazer:** a tolerância aceita como "mudança planejada" qualquer policy cujo nome apareça em migration não aplicada. Policy inserida fora de migration com nome coincidente passa o gate. Casar também `cmd`, `roles` e `qual`, não só a chave `schema.tabela.policyname`.
**Pronto:** teste com policy de nome igual e `qual` diferente reprova o gate
**Origem:** A2-38

#### P200-E049 · [B] · P2 · Confirmar o rate guard nas 7 tabelas de INSERT anônimo
**Arquivo:** `.security/policies-baseline.json`, trigger `fn_anon_insert_rate_guard`
**Fazer:** 18 policies dão a `anon` comandos não-SELECT; 7 são INSERT reais (`analytics_events`, `catalog_analytics`, `product_views`, `search_analytics`, `frontend_telemetry`, `kill_switch_hits`, `password_reset_requests`) com `WITH CHECK` só de forma, sem limite de volume. Confirmar no `pg_trigger` que o guard cobre as 7 e verificar essa cobertura **no gate**, não só ao vivo.
**Pronto:** o gate de policies reprova se uma das 7 tabelas perder o trigger
**Origem:** A2-39

**Revalidação 2026-10-30 (somente leitura):** o trigger `trg_anon_rate_guard` foi encontrado
em seis tabelas existentes da lista. `public.kill_switch_hits` não existe em `pg_class` no
catálogo consultado. A etapa segue parcial: corrigir o inventário para os alvos reais e manter
um teste do gate para cada tabela que o projeto efetivamente publicar; não contar a tabela
inexistente como falta de trigger.

#### P200-E050 · [A] · P2 · Unificar as duas allowlists do lint 0029 ✅
**Arquivo:** `.security/lint-0029-allowlist.json` (93 entradas), `.security/supabase-linter-baseline.json` (50, `generated_at` 2026-07-13)
**Fazer:** duas allowlists divergentes para o mesmo lint (SECURITY DEFINER executável por `authenticated`), a segunda com justificativa única e 3 meses sem revisão. Unificar em `lint-0029-allowlist.json` com `reason`, `approvedBy` e `date` por função, e fazer `check-supabase-linter.mjs` ler só dela.
**Pronto:** `.security/supabase-linter-baseline.json` não existe mais e `node scripts/check-supabase-linter.mjs --gate` sai `0`
**Origem:** A2-16

---

## ⏸ CHECKPOINT 1 — APÓS E050

Pare. Rode `npm run plan:status`. Antes de abrir a Onda 5:

1. **Corte, não acelere** (R11). Se menos de 40 das 50 etapas fecharam, não siga para a Onda 5 — reavalie o que sobrou e mova para o fim do plano o que não é P0/P1.
2. Confirme que as 3 etapas de trilha C da Onda 0 (E001, E005, E006) foram respondidas pelo PO. Se E005 segue aberta, **o bypass continua aberto** e tudo que foi feito em E007–E050 pode ser contornado por push direto. Reporte isso explicitamente, não siga em silêncio.
3. Verifique que `deploy-gates.yml` fechou verde em pelo menos 3 PRs consecutivos. Se não, volte a E004: a esteira segue sendo o gargalo.

---

### ONDA 5 — LEDGER DE MIGRATIONS (E051–E060)

O ledger (`supabase_migrations.schema_migrations`) e o schema real divergem em vários pontos, e a divergência é silenciosa por desenho. 477 migrations marcadas `local_only` nunca rodaram em produção.

#### P200-E051 · [A] · P1 · `repair-only` tem de avisar que quebra o replay — ✅ concluída em 2026-10-29
**Arquivo:** `.github/workflows/db-apply-migration.yml:33-38`
**Fazer:** `mode: repair-only` registra versão no ledger sem rodar SQL — condição que o `CLAUDE.md` diz quebrar o replay do baseline — e o workflow não avisa nem exige rotação. Emitir aviso bloqueante no summary e exigir dispatch de `schema-snapshot-export.yml` com `force_rotate: true` na sequência.
**Pronto:** teste de contrato executa o bloco real do workflow em isolamento: sem ack, falha e imprime o aviso; com ack, prossegue. Sem dispatch no ambiente de produção.
**Origem:** A2-19

#### P200-E052 · [A] · P1 · Recibo tem de distinguir aplicação de registro — ✅ concluída em 2026-10-29
**Arquivo:** `.github/workflows/db-apply-migration.yml:300-308`, `scripts/append-migration-receipt.mjs`
**Fazer:** o job `receipt` grava `--metodo="E15" --status="aplicada"` sem olhar `inputs.mode`, então um `repair-only` (zero SQL executado) produz recibo indistinguível de aplicação real. Propagar `inputs.mode` e gravar `método=repair` + `status=registrada-sem-aplicar`.
**Pronto:** teste de contrato executa o bloco real de recibo em diretório temporário nos modos `repair-only` e `apply`, comprovando método/status distintos sem tocar no ledger canônico.
**Origem:** A2-20

#### P200-E053 · [C] · P1 · Fechar as 179 versões aguardando `repair`
**Arquivo:** `supabase/MIGRATIONS_SYNC_LOG.md:729`, `docs/PACOTE_APROVACAO_1_2026-09-16.md`
**Fazer:** 179 versões aguardam `migration repair` com status "proposto, aguardando aprovação PO" desde 2026-09-16 — 179 objetos aplicados em produção sem linha no ledger. Perguntar ao PO: *"179 migrations estão aplicadas no banco mas sem registro no ledger desde 16/09. Aprovo o registro delas?"* Se aprovado, repair **por versão explícita**, nunca em lote sem versão (REGRA #8).
**Pronto:** o campo "aguardando aprovação PO" não existe mais na linha 729, com a decisão registrada
**Origem:** A2-23

#### P200-E054 · [B] · P1 · Registrar as 10 migrations do incidente de 2026-10-13
**Arquivo:** `supabase/MIGRATIONS_SYNC_LOG.md:784-800`, `docs/db/POLITICA_DDL.md`
**Fazer:** 10 migrations foram aplicadas por MCP `apply_migration` sem o `migration repair` que a condição (c) da `POLITICA_DDL` exige **no mesmo dia**; a reconciliação de 2026-10-15 foi feita só no repositório. Registrar a exceção (a)/(b)/(c) a posteriori e garantir CLI Supabase disponível em qualquer sessão autorizada a aplicar DDL.
**Pronto:** as 10 versões aparecem em `schema_migrations` e o log registra a exceção com data
**Origem:** A2-21, A5-44

#### P200-E055 · [A] · P1 · Gate: migration aplicada sem recibo em 24h reprova
**Arquivo:** `scripts/check-migration-receipts.mjs` (novo), `deploy-gates.yml`
**Fazer:** promover o detector de DDL fora de banda de advisory para bloqueante no caso específico de migration aplicada sem recibo há mais de 24h. É o controle que teria pegado E054 no dia.
**Pronto:** o gate reprova com uma versão em `schema_migrations` sem linha correspondente no `MIGRATIONS_SYNC_LOG.md` há >24h
**Origem:** A5-44, A2-21

#### P200-E056 · [A] · P1 · Bloquear DDL por `execute_sql` em sessão de agente ✅
**Arquivo:** `CLAUDE.md` (corolário da REGRA #8), `supabase/migrations/20261015120000_reconcilia_oob_incidente_2026_10_13.sql:22-60`
**Fazer:** a policy `variant_stocks_select_org` e 7 `cron.alter_job` foram aplicados por `execute_sql` fora de migration e fora do ledger em 2026-10-13, só virando migration espelho 2 dias depois. Escrever no `CLAUDE.md` que `execute_sql` com DDL é proibido em sessão de agente, e que toda mudança de `cron.job` nasce como migration no mesmo PR.
**Pronto:** `grep -c "execute_sql" CLAUDE.md` inclui a proibição explícita de DDL
**Origem:** A2-22

#### P200-E057 · [A] · P1 · Tirar do caminho os 68 arquivos que não são migration
**Arquivo:** `supabase/migrations/` → `supabase/sql-legacy/`
**Fazer:** 68 arquivos `.sql` fora do padrão `^\d{14}_` (`001_…`, `20260602_001_…`, `2026062311292414001_…`, `gravacao_fix3_…`) são invisíveis ao CLI Supabase, ao `migration list` e ao replay. Mover para `supabase/sql-legacy/` com manifesto de "SQL histórico não-migration", **ou** renomear com versão canônica + repair. `supabase/migrations/` deve conter só o que o CLI enxerga.
**Pronto:** `ls supabase/migrations/*.sql | grep -vcE '/[0-9]{14}_'` → `0`
**Origem:** A2-24

#### P200-E058 · [A] · P1 · Resolver os 37 prefixos de versão duplicados
**Arquivo:** `supabase/migrations/`, `.github/workflows/db-apply-migration.yml:160-166`
**Fazer:** 37 prefixos aparecem em 2+ arquivos, e o workflow aborta quando o glob não devolve exatamente 1 arquivo — essas versões **não têm caminho autorizado de aplicação**. Consolidar cada colisão num arquivo só (conteúdo do ledger) ou renumerar o duplicado, atualizando a baseline de colisões legadas na mesma PR.
**Pronto:** `ls supabase/migrations/ | grep -oE '^[0-9]{14}' | sort | uniq -d | wc -l` → `0`
**Origem:** A2-25

#### P200-E059 · [B] · P1 · Triar as 477 migrations `local_only`
**Arquivo:** `supabase/migrations-snapshot/SNAPSHOT_META.json:12-18`
**Fazer:** 477 migrations nunca rodaram em produção e nenhum gate valida isso (`local_only` não bloqueia por desenho). Classificar por efeito: (1) já-aplicado-sem-ledger → repair com versão explícita, (2) nunca-aplicado e ainda necessário → fila do E15, (3) obsoleto → arquivar com razão. Nesta onda, triar as 477 e fechar o grupo (3).
**Pronto:** relatório em `docs/arquivo/2026-10/` com as 477 classificadas em 1/2/3, nenhuma sem classificação
**Origem:** A2-26

#### P200-E060 · [A] · P2 · Corrigir o falso "replay bloqueado" do snapshot
**Arquivo:** `scripts/export-schema-snapshot.mjs`, `supabase/migrations-snapshot/SNAPSHOT_META.json:16-22`
**Fazer:** o snapshot reporta `blocking_remote_only_count: 1` para `20260712`, versão que **está** em `scripts/migration-ledger-remote-only-allowlist.json`, e por isso declarou "Replay bloqueado" indevidamente. Fazer o export chamar `auditSupabaseMigrationLedger` com a mesma allowlist que `check-supabase-migration-ledger.mjs::runCli` carrega.
**Pronto:** `jq '.blocking_remote_only_count' supabase/migrations-snapshot/SNAPSHOT_META.json` → `0`
**Origem:** A2-52

> **PORTÃO DA ONDA 5:** ≥8 de 10. E053 e E054 são trilha C/B — se travarem, não bloqueiam a Onda 6.

---

### ONDA 6 — QUALIDADE DAS MIGRATIONS (E061–E070)

115 migrations na janela. Nenhuma usa `CONCURRENTLY`; 81 não têm cabeçalho de rollback; nenhuma tem `.down.sql`.

#### P200-E061 · [A] · P0 · `CREATE INDEX` em tabela grande exige `CONCURRENTLY`
**Arquivo:** `scripts/preflight-migration-apply.mjs`, `supabase/migrations/20261013172634_agente2_fase6_workmem_and_index.sql:22-24`
**Fazer:** um índice de expressão foi criado em `public.stock_snapshots` (3,6M linhas) sem `CONCURRENTLY`, aplicado por MCP durante um incidente de performance — bloqueia escrita na tabela mais quente do banco. Fazer o preflight exigir `-- transaction: none` + `CREATE INDEX CONCURRENTLY` para tabela com mais de 1M linhas, e reprovar o contrário.
**Pronto:** `node scripts/preflight-migration-apply.mjs` reprova uma migration de teste com `CREATE INDEX` sem `CONCURRENTLY` em `stock_snapshots`
**Origem:** A2-27

#### P200-E062 · [A] · P1 · Documentar e avisar sobre o opt-out de transação
**Arquivo:** `docs/db/POLITICA_DDL.md`, `scripts/preflight-migration-apply.mjs`
**Fazer:** nenhuma das 115 migrations da janela usa `CONCURRENTLY`, e os 10 `CREATE INDEX` todos tomam lock de escrita, porque o `psql -1` do E15 impede `CONCURRENTLY` sem o opt-out declarado. Documentar o opt-out como caminho **padrão** para índice e fazer o preflight avisar sempre que um `CREATE INDEX` aparecer sem ele.
**Pronto:** `grep -c "transaction: none" docs/db/POLITICA_DDL.md` ≥ 1 e o preflight emite aviso no caso descrito
**Origem:** A2-28

#### P200-E063 · [A] · P1 · Rollback como arquivo, não como comentário
**Arquivo:** `supabase/migrations/`, `scripts/preflight-migration-apply.mjs`
**Fazer:** 81 das 115 migrations recentes não têm cabeçalho `-- Rollback:` e, onde existe, é comentário em texto livre nunca executado nem testado — não há nenhum `.down.sql` no repositório. Para migrations **novas**, exigir `<version>_rollback.sql` como arquivo irmão, validado por replay no shadow do dry-run. Não backfillar as 81 (custo alto, benefício nulo): o que importa é parar a sangria.
**Pronto:** o preflight reprova migration nova sem `_rollback.sql` irmão
**Origem:** A2-29

#### P200-E064 · [A] · P0 · Remover o project-ref proibido das migrations
**Arquivo:** `supabase/migrations/20260514112149_edge_function_secrets_callers_hardening.sql:68,126,212`, `20260601140100:16`, `20260602020000:21`, `20260525113000:251`, `supabase/migrations-snapshot/ALL_IN_ONE.sql`
**Fazer:** SQL executável hardcoda `https://pqpdolkaeqlyzpdpbizo.supabase.co` em corpo de função e em `cron.schedule`. Num replay por ordem de versão, as funções passam por um estado apontando para o projeto **proibido**. O forward fix `20260619210000` já define o valor correto. Substituir o literal pelo canônico nesses arquivos e estender `validate-supabase-config.mjs` para varrer `supabase/migrations/**`.
**Pronto:** `grep -rc "pqpdolkaeqlyzpdpbizo" supabase/migrations/ supabase/migrations-snapshot/` → `0` **e** `node scripts/validate-supabase-config.mjs` cobre o diretório
**Origem:** A2-30

#### P200-E065 · [A] · P1 · Tornar a migration de reconciliação replayável
**Arquivo:** `supabase/migrations/20261015120000_reconcilia_oob_incidente_2026_10_13.sql:30-60`
**Fazer:** a migration declara servir para "ambiente novo / replay", mas usa `cron.alter_job((SELECT jobid FROM cron.job WHERE jobname=…))`: sem esses jobs o `jobid` é `NULL` e o statement falha, quebrando exatamente o replay que ela promete. Envolver cada `alter_job` em `DO` com guard `IF EXISTS`, ou criar o job com `cron.schedule` quando ausente.
**Pronto:** o replay do baseline num shadow vazio aplica essa migration sem erro
**Origem:** A2-48

#### P200-E066 · [A] · P1 · `SECURITY DEFINER` sem `pg_temp` no `search_path`
**Arquivo:** `supabase/migrations/` (64 ocorrências), migration nova
**Fazer:** 64 `SET search_path` em arquivos com 72 `SECURITY DEFINER` expõem as funções a shadowing por objeto em `pg_temp` — o mesmo defeito que `20260904140000_audit_r4_fixup_search_path_pg_temp` corrigiu apenas em parte. Listar via `pg_proc.proconfig` as SECDEF sem `pg_temp`, corrigir em lote com `ALTER FUNCTION ... SET search_path` e checar isso no gate de SECURITY DEFINER.
**Pronto:** o gate reprova uma função SECDEF nova sem `pg_temp` no `search_path`
**Origem:** A2-46

#### P200-E067 · [A] · P2 · Extensões fora do schema `extensions`
**Arquivo:** `supabase/migrations/20261013171425_incidente_2026_10_13_extensoes_diagnostico_bloat.sql:13-14`
**Fazer:** `CREATE EXTENSION IF NOT EXISTS pgstattuple` e `pg_repack` sem `WITH SCHEMA extensions` instalam objetos no schema default (lint Supabase 0014 `extension_in_public`). `ALTER EXTENSION ... SET SCHEMA extensions` em migration nova, e exigir `WITH SCHEMA extensions` no preflight.
**Pronto:** o lint 0014 não lista `pgstattuple` nem `pg_repack`; o preflight reprova `CREATE EXTENSION` sem schema
**Origem:** A2-47

#### P200-E068 · [A] · P2 · Índices faltando em FK com `ON DELETE CASCADE` ✅
**Arquivo:** migration nova; `supabase/migrations/20260911130357_kit_maker_optimistic_persistence.sql:27-32`, `20260911172000:21-28`, `20260909220000_magazine_duplicate_request_indexes.sql:4-8`
**Fazer:** `kit_save_requests` tem FK `user_id`→`auth.users` e `kit_id`→`custom_kits` com `ON DELETE CASCADE` e nenhum índice além do PK em `request_id` — todo DELETE no pai faz seq scan. Mesmo padrão em `kit_quote_requests` e em `magazine_duplicate_requests.actor_id`. Criar os índices agora, enquanto as tabelas são pequenas.
**Pronto:** os 4 índices existem e `node scripts/check-fk-indexes.mjs` (ou query de `pg_constraint` sem índice) devolve `0` para essas tabelas
**Origem:** A2-43, A2-44

#### P200-E069 · [A] · P2 · Dropar o índice redundante por prefixo
**Arquivo:** migration nova; `supabase/migrations/20261013171601_agente2_fase3_00_index_only.sql:9`
**Fazer:** o novo `idx_user_organizations_user_org_covering (user_id, organization_id)` torna `idx_user_organizations_user (user_id)` redundante por prefixo, e o antigo não foi dropado — duas árvores mantidas em toda escrita. Dropar o antigo **após** confirmar `idx_scan` em `pg_stat_user_indexes`.
**Pronto:** `idx_user_organizations_user` não existe mais e o covering tem `idx_scan` > 0
**Origem:** A2-45

#### P200-E070 · [A] · P2 · Purga dos ledgers de idempotência
**Arquivo:** migration nova; `20260911130357`, `20260911172000`, `20260909200000`
**Fazer:** `kit_save_requests`, `kit_quote_requests` e `magazine_duplicate_requests` são ledgers de idempotência que crescem sem purga — só `anon_insert_rate` tem cron (`20260905033100:90`). Agendar um `pg_cron` de purga por janela (>30 dias) para os três numa migration só, no padrão já existente.
E no mesmo relatório, priorizar a política de soft-delete: `.soft-delete-baseline.json` mostra **582 tabelas** criadas em migrations sem `deleted_at`/`archived_at`, e `docs/db/POLITICA_SOFT_DELETE.md:7-10` é explicitamente forward-only, sem plano de retenção para o estoque existente. Priorizar pelo crescimento medido em `ops.table_size_history` (que E177 reativa) e acrescentar `deleted_at` + arquivamento nas 10 primeiras.
**Pronto:** `cron.job` tem a entrada de purga, o inventário de E037 a registra, e as 10 tabelas de maior crescimento têm `deleted_at`
**Origem:** A2-49, A2-50

> **PORTÃO DA ONDA 6:** ≥8 de 10. E064 é obrigatória no portão (REGRA #1).

---

### ONDA 7 — BACKUP, RECUPERAÇÃO E DETECÇÃO (E071–E080)

Não existe backup de dados conhecido. O que está versionado é um dump schema-only de 2026-09-16.

#### P200-E071 · [C] · P0 · Confirmar PITR e retenção
**Arquivo:** `docs/db/BACKUP_STATUS.md:9-18`
**Fazer:** PITR e backup automático estão `⏳ PENDENTE` com os 4 checkboxes do PO em branco desde 2026-09-16, e ~21 migrations foram aplicadas em produção nesse intervalo. Perguntar ao PO, em uma linha: *"Preciso que você confirme no painel: PITR está ligado? Qual a retenção? Qual a data do último backup? Qual o RPO aceitável?"* Registrar as 4 respostas no arquivo.
**Pronto:** os 4 checkboxes de `BACKUP_STATUS.md` estão preenchidos com data e valor
**Origem:** A2-03

#### P200-E072 · [B] · P1 · Rotação automática do dump de recuperação
**Arquivo:** `.github/workflows/schema-snapshot-export.yml`
**Fazer:** os únicos artefatos de recuperação versionados (`docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql`, `docs/db/LEDGER_DATA_2026-09-16.sql`) são de setembro, schema-only, sem rotação — já não refletem o schema pós-incidente. Acrescentar ao export a regeneração semanal de dump schema-only + ledger + `cron.job` com checksum, na mesma PR do baseline.
**Pronto:** existe artefato com data da semana corrente e checksum conferido
**Origem:** A2-34

#### P200-E073 · [B] · P1 · Executar um restore de verdade ✅
**Arquivo:** `docs/DISASTER_RECOVERY.md:76-78`
**Fazer:** o runbook pede teste de restore pelo menos trimestral e **não há nenhum registro de teste executado**; o RTO de banco está "a definir após confirmação do PO". Restaurar o dump schema-only num projeto descartável, medir a duração e registrar no runbook.
**Pronto:** `grep -c "Último teste de restore: 2026-" docs/DISASTER_RECOVERY.md` ≥ 1 com duração medida
**Origem:** A2-33

#### P200-E074 · [A] · P1 · Agendar o drill trimestral
**Arquivo:** `.github/workflows/dr-drill-reminder.yml` (novo)
**Fazer:** workflow de cron trimestral que abre issue com o checklist do `DISASTER_RECOVERY.md` e atribui ao PO. Lembrete, não execução — restaurar sem supervisão é pior que não restaurar.
**Pronto:** `actionlint` sai `0` e a issue é criada no primeiro dispatch
**Origem:** A2-33

#### P200-E075 · [A] · P1 · Criar o destino do relatório de DDL fora de banda ✅
**Arquivo:** `docs/ci/DDL_OUT_OF_BAND_REPORT.md` (ausente), `.github/workflows/ddl-out-of-band-detector.yml`
**Fazer:** o arquivo que o `CLAUDE.md` aponta como registro de divergência do detector E12 **não existe**, então nenhuma divergência detectada tem destino persistente. Criar o arquivo e fazer o detector escrever nele via PR de bot, ou corrigir o `CLAUDE.md` para apontar só para a issue rotulada. Escolher um dos dois.
**Pronto:** o arquivo existe e tem linha gerada pelo detector, **ou** o `CLAUDE.md` não o menciona mais
**Origem:** A2-31

#### P200-E076 · [A] · P1 · Detector de DDL tem de ver policy, trigger e cron
**Arquivo:** `docs/db/POLITICA_DDL.md:51-66`, `fn_check_schema_signature_drift()`
**Fazer:** o detector cruza apenas tabelas e colunas de `information_schema.columns` com o ledger, logo é cego a policy, GRANT, trigger, função e `cron.job` — a classe **exata** do incidente de 2026-10-13. Estender para um hash de `pg_policies` + `cron.job` + `pg_proc.prosrc`, usando o `policies-baseline.json` que já existe como insumo.
**Pronto:** o detector acusa divergência ao se alterar uma policy fora de migration num ambiente de teste
**Origem:** A2-32

#### P200-E077 · [A] · P2 · Pinar a major do PostgreSQL de fonte única
**Arquivo:** `scripts/drift-baseline.mjs:30`
**Fazer:** `SHADOW_MAJOR_VERSION = 17` é literal. Quando produção subir de PG 17.6, o shadow divergirá da versão real sem nenhum alerta. Ler a major de fonte única (`supabase/config.toml` ou `.pgversion`) e reprovar o drift-check se divergir da versão reportada pela Management API.
**Pronto:** `grep -c "SHADOW_MAJOR_VERSION = 17" scripts/drift-baseline.mjs` → `0`
**Origem:** A2-37

#### P200-E078 · [A] · P2 · Timeouts do apply não podem se perder no pooler
**Arquivo:** `.github/workflows/db-apply-migration.yml:218-224`
**Fazer:** no branch `transaction: none`, o `SET lock_timeout`/`statement_timeout` só persiste com o pooler em modo session (porta 5432); se `secrets.PGPORT` for 6543 os timeouts são silenciosamente perdidos — o comentário no arquivo reconhece o risco e nada o impede. Reprovar o step quando `PGPORT != 5432` e `NO_TX=true`, ou reemitir os `SET` junto de cada statement.
**Pronto:** dispatch de teste com `PGPORT=6543` e `transaction: none` reprova antes de aplicar
**Origem:** A2-51

#### P200-E079 · [A] · P2 · Comparar `Functions` no drift de `types.ts`
**Arquivo:** `scripts/check-types-inventory-drift.mjs:88`
**Fazer:** `LIVE_COMPARABLE_CATEGORIES` exclui `Functions` deliberadamente, e o diff live compara só `public` e só na direção "existe no banco e falta em types.ts". Acrescentar `Functions` com normalização de assinatura, e a direção inversa como aviso — é ela que pega `types.ts` gerado de outro projeto.
**Pronto:** o gate acusa quando `types.ts` declara uma function que não existe no banco
**Origem:** A2-42

#### P200-E080 · [C] · P1 · Desfazer as 13 entradas falsas da allowlist de remoção
**Arquivo:** `docs/TYPES_INVENTORY_REMOVAL_ALLOWLIST.json`
**Fazer:** 13 das 16 entradas justificam remover tabelas de `types.ts` por um DROP (`20261013180500`) que **não foi aplicado** e que o `MIGRATIONS_SYNC_LOG` marca "não recomendada". Resultado: `types.ts` já não declara tabelas que seguem vivas e com policies em produção. Perguntar ao PO: *"Essas 14 tabelas de backup estão vivas no banco mas foram removidas do types.ts por causa de um DROP que nunca aplicamos. Removo do banco de verdade (com export dos dados antes) ou restauro no types.ts?"*
**Pronto:** as 13 entradas foram removidas e `types.ts` regenerado, **ou** o DROP foi aplicado com export prévio e recibo
**Origem:** A2-17, A5-45

> **PORTÃO DA ONDA 7:** ≥8 de 10. E071 é trilha C e pode travar — reporte, não contorne.

---

### ONDA 8 — EDGE FUNCTIONS: AUTORIZAÇÃO E EXPOSIÇÃO DE DADOS (E081–E090)

#### P200-E081 · [A] · P1 · `crm-db-bridge` — escopo de ownership na leitura de PII
**Arquivo:** `supabase/functions/crm-db-bridge/index.ts:338-350`, `:553-593`
**Fazer:** qualquer usuário autenticado — inclusive o role default `vendedor` — faz select paginado (`limit ≤ 1000` + offset livre) em `companies`, `contacts`, `customers`, `contact_emails` e `contact_phones` do CRM externo, com a service_role e **sem escopo de ownership**. Filtrar por owner do chamador na própria query e exigir `requireRole: 'supervisor'` para leitura ampla.
**Pronto:** um token de `vendedor` só recebe registros dos quais é owner; leitura ampla sem `supervisor` → 403
**Origem:** A4-10

#### P200-E082 · [A] · P1 · `crm-db-bridge` — fechar o embedding do PostREST
**Arquivo:** `supabase/functions/crm-db-bridge/index.ts:731`, `:736`, `:555`
**Fazer:** `select`, `relations` e `returning` são `z.string().max(2000)` sem validação de formato, então um embedding do PostgREST (`"*,outra_tabela(*)"`) lê tabelas fora de `ALLOWED_TABLES`. Validar contra regex de colunas + allowlist de embeds, ou fixar os selects server-side por tabela.
**Pronto:** payload com `select="*,user_roles(*)"` → 400, não 200
**Origem:** A4-11

#### P200-E083 · [A] · P1 · `crm-db-bridge` — checagem única de tabela e role fail-closed
**Arquivo:** `supabase/functions/crm-db-bridge/index.ts:756-762`, `:346-349`
**Fazer:** duas coisas. A operação `batch` retorna **antes** do check de `ALLOWED_TABLES` e depende de um segundo check duplicado em `handleBatch:447` — mover o check para antes do dispatch, com um único ponto de decisão. E `roleData?.role || "vendedor"` com `.single()`: 0 ou 2+ linhas em `user_roles` erram e caem no role default — usar `.select()` sem `single`, computar a role mais alta e devolver 403 sem nenhuma.
**Pronto:** `batch` com tabela fora da allowlist → 400 no primeiro check; usuário sem linha em `user_roles` → 403
**Origem:** A4-36, A4-37

#### P200-E084 · [A] · P1 · `crm-db-bridge` — rate limit e filtros restritos
**Arquivo:** `supabase/functions/crm-db-bridge/index.ts:375-398`, `:603`
**Fazer:** o endpoint que mais expõe PII do projeto (791 linhas, service_role) não tem rate limit nenhum. E `applyFilters` aceita qualquer coluna com `.ilike(column, '%term%')` e `term` livre de 500 chars — extração cega de colunas fora do select e varredura por prefixo. Aplicar `applyRateLimit` com `failClosed` por `user_id`, restringir as colunas filtráveis por tabela e escapar `%`/`_` no termo.
**Pronto:** 101ª requisição no minuto → 429; filtro em coluna fora da lista → 400
**Origem:** A4-38, A4-40

#### P200-E085 · [A] · P1 · Corrigir `getClientIp` em todo o projeto
**Arquivo:** `supabase/functions/_shared/bot-protection.ts:70`
**Fazer:** `getClientIp` usa `xff.split(',')[0]`, que é **fornecido pelo cliente** — contrariando a nota SEC_0001 em `check-login/index.ts:58-67`, onde o mesmo problema já foi resolvido usando o último elemento. Isso derruba rate limit e bloqueio por IP de `image-proxy`, `webhook-inbound`, `external-db-inspect` e `get-visitor-info` de uma vez. Usar o **último** elemento do `x-forwarded-for`, como `check-login` e `log-login-attempt` já fazem.
**Pronto:** `grep -c "split(',')\[0\]" supabase/functions/_shared/bot-protection.ts` → `0`; teste com `x-forwarded-for: 1.2.3.4, <ip real>` usa o real
**Origem:** A4-12

#### P200-E086 · [A] · P1 · `webhook-inbound` — allowlist de IP não forjável
**Arquivo:** `supabase/functions/webhook-inbound/index.ts:293-299`
**Fazer:** `allowed_ips` é comparado contra `xff[0]`, forjável por header — a allowlist de IP do webhook é spoofável. Comparar contra `xff[last]` (depende de E085).
**Pronto:** requisição com `x-forwarded-for` manipulado não passa a allowlist
**Origem:** A4-13

#### P200-E087 · [A] · P1 · `webhook-inbound` — remover o bypass de HMAC
**Arquivo:** `supabase/functions/webhook-inbound/index.ts:206-209`, `:325-341`
**Fazer:** `x-internal-call: true` + `Authorization: Bearer SERVICE_ROLE_KEY` pula HMAC **e** bot protection, contrariando o que `supabase/functions/README.md:201-204` documenta. Remover o bypass e autenticar chamada interna com HMAC própria ou `x-dispatcher-secret` (a infra de `_shared/dispatcher-auth.ts` já existe e é fail-closed).
**Pronto:** `grep -c "x-internal-call" supabase/functions/webhook-inbound/index.ts` → `0`
**Origem:** A4-14

#### P200-E088 · [A] · P1 · `webhook-inbound` — limitar corpo e `hmac_secret_ref`
**Arquivo:** `supabase/functions/webhook-inbound/index.ts:243-254`, `:300`
**Fazer:** `readCredential` cai em `Deno.env.get(name)` com `name` vindo da **coluna** `endpoint.hmac_secret_ref` — leitura de variável de ambiente dirigida por conteúdo do banco. Restringir `hmac_secret_ref` a um prefixo fixo (`WEBHOOK_HMAC_*`) e eliminar o fallback por env. E `await req.text()` sem limite de tamanho num endpoint `verify_jwt=false`: checar `Content-Length` e abortar acima de ~1 MB antes de materializar o corpo.
**Pronto:** `hmac_secret_ref` fora do prefixo → erro de configuração; corpo de 2 MB → 413
**Origem:** A4-43, A4-44

#### P200-E089 · [A] · P1 · `external-db-inspect` e `sync-external-db` — allowlist de tabela
**Arquivo:** `supabase/functions/external-db-inspect/index.ts:93`, `supabase/functions/_shared/contracts/schemas/sync-external-db.ts:12`
**Fazer:** em `external-db-inspect`, `tableName` do cliente vai direto para `.from(tableName).select('*')` no projeto externo com service_role e devolve `sampleRow` completo — e a allowlist estática já existe no próprio arquivo (`tablesToTest`), só não é usada. Em `sync-external-db`, `table` é `z.string().min(1).max(100)` sem allowlist, e a função copia/upserta 1000 linhas entre dois projetos com service_role nos dois lados, protegida só pelo `CRON_SECRET`. Validar contra a allowlist nos dois; trocar por `z.enum([...])` no segundo.
**Pronto:** tabela fora da allowlist → 400 nas duas funções
**Origem:** A4-23, A4-24

#### P200-E090 · [A] · P2 · `magazine-reader-state` — fingerprint derivado no servidor
**Arquivo:** `supabase/functions/magazine-reader-state-read/index.ts:43-44`, `:81-83`, `magazine-reader-state-write/index.ts:57`, `:84-88`
**Fazer:** `viewer_fingerprint` é o único segredo que separa um leitor do outro, vem do cliente com `min(8)` e é chave de leitura **e** escrita com service_role — IDOR de bookmarks entre visitantes. Além disso trafega na query string do GET, entrando em logs de acesso e `Referer`. E o rate limit (5/s) é chaveado no próprio fingerprint, então rotacionar o campo dá escrita ilimitada. Derivar o fingerprint server-side (HMAC de token + IP + UA com segredo de servidor), exigir ≥32 chars, mover para POST com corpo JSON e chavear o rate limit no IP + token da revista.
No mesmo PR, remover o fallback hardcoded de `MAGAZINE_IP_SALT` em `magazine-public-react/index.ts:32`: com o salt versionado e o IP truncado em /24 (~2^24 candidatos), o `ip_hash` é reversível por força bruta e a pseudonimização LGPD deixa de existir silenciosamente. Sem a env var: 503.
**Pronto:** fingerprint de 8 chars → 400; GET com fingerprint na query → 405; rotação do campo não zera o rate limit; sem `MAGAZINE_IP_SALT` a função responde 503
**Origem:** A4-41, A4-42, A4-22, A4-21

> **PORTÃO DA ONDA 8:** ≥8 de 10. E085 antes de E086 (dependência).

---

### ONDA 9 — EDGE FUNCTIONS: FAIL-OPEN, CORS E TIMEOUTS (E091–E100)

#### P200-E091 · [A] · P1 · Timeout em `fetchWithBreaker`
**Arquivo:** `supabase/functions/_shared/external-fetch.ts:45-68`
**Fazer:** `fetchWithBreaker` não tem `AbortSignal` nem timeout, e o breaker só abre com falha **registrada** — um upstream que pendura nunca registra falha, então o breaker nunca abre. Acrescentar `signal: AbortSignal.timeout(n)`, default 10s, configurável por serviço. Esta etapa vem antes de E092 porque é a correção central.
**Pronto:** `grep -c "AbortSignal.timeout" supabase/functions/_shared/external-fetch.ts` ≥ 1; upstream que pendura devolve erro em ≤10s
**Origem:** A4-27

#### P200-E092 · [A] · P1 · Timeout nas 10 funções que chamam LLM e API externa
**Arquivo:** `expert-chat`, `ai-recommendations`, `bi-copilot`, `comparison-ai-advisor`, `kit-identity-suggest`, `market-intelligence-insights`, `process-scheduled-reports`, `send-scheduled-reports`, `send-transactional-email`, `visual-search`
**Fazer:** as 10 chamam LLM ou API externa sem `AbortController` — é exatamente a classe do incidente `kit-ai-builder` de 2026-09-23, cujo timeout de 20s foi implementado direto em produção e nunca commitado. Aplicar o padrão de `kit-ai-builder/index.ts:94-95`, de preferência centralizado no `fetchWithBreaker` de E091.
**Pronto:** `grep -rlc "AbortSignal\|AbortController" supabase/functions/{expert-chat,ai-recommendations,bi-copilot,comparison-ai-advisor,kit-identity-suggest,market-intelligence-insights,process-scheduled-reports,send-scheduled-reports,send-transactional-email,visual-search}/index.ts` → 10 arquivos
**Origem:** A4-28

#### P200-E093 · [A] · P1 · Restringir os padrões de origem do CORS
**Arquivo:** `supabase/functions/_shared/cors.ts:35-42`
**Fazer:** `ALLOWED_ORIGIN_PATTERNS` libera `*.vercel.app`, `*.lovable.app` e `*.lovableproject.com` — hospedagem compartilhada, onde qualquer pessoa provisiona um subdomínio. `image-proxy/index.ts:46` já resolveu o mesmo problema com padrão de time e comenta a razão. Trocar pelos padrões restritos de `image-proxy`, ou mover para `EXACT_ALLOWED_ORIGINS`.
**Pronto:** `curl -H "Origin: https://qualquer-coisa.vercel.app"` não recebe `Access-Control-Allow-Origin`
**Origem:** A4-33

#### P200-E094 · [A] · P2 · `Allow-Origin: *` só em rota realmente anônima
**Arquivo:** `supabase/functions/_shared/cors.ts:197-210`, `supabase/functions/asia-ingestion/index.ts`
**Fazer:** `buildPublicCorsHeaders` devolve `Access-Control-Allow-Origin: *` e é usada por ~30 funções que leem ou escrevem dado autenticado com service_role — entre elas `bulk-random-passwords`, `audit-suite`, `e2e-cleanup`, `crm-callback-reprocess`, `process-queue`, `send-digest` e as 4 `magazine-*`. Reservar o helper para rotas anônimas de verdade e usar `getCorsHeaders` nas demais. E `asia-ingestion` escreve o header literal fora do helper, o que o torna invisível a qualquer auditoria que grepe `buildPublicCorsHeaders` — passar a usar o helper.
**Pronto:** `grep -rc "buildPublicCorsHeaders" supabase/functions/{bulk-random-passwords,audit-suite,e2e-cleanup}/index.ts` → `0`; nenhum `'Access-Control-Allow-Origin': '*'` literal em `supabase/functions/`
**Origem:** A4-45, A4-46

#### P200-E095 · [A] · P2 · Ligar o snapshot de CORS a um gate
**Arquivo:** `supabase/functions/_shared/cors-snapshot.json`, `scripts/build-cors-snapshot.mjs`, `deploy-gates.yml`
**Fazer:** o snapshot de 19 KB é gerado mas **nenhum workflow o consome** — snapshot sem gate não detecta regressão. Acrescentar step de comparação no `deploy-gates.yml`, no modelo do `types-inventory-drift`. Só depois de E093 e E094, para o snapshot já nascer com o estado correto.
**Pronto:** o gate reprova ao se afrouxar um origin em `cors.ts` sem regenerar o snapshot
**Origem:** A4-47

#### P200-E096 · [A] · P2 · `image-proxy` — anti-hotlink fail-closed e sem open redirect ✅
**Arquivo:** `supabase/functions/image-proxy/index.ts:81`, `:117`
**Fazer:** `if (referer && !isAllowedReferer(referer))` — requisição **sem** header `Referer` passa, o que anula a proteção anti-hotlink inteira. Exigir `Referer`/`Origin` presente e válido. E `fetchWithBreaker` sem `redirect: 'manual'`: um open redirect em CDN de fornecedor allowlistado leva o proxy a destino arbitrário — passar `redirect: 'manual'` e revalidar o `Location` com `validateExternalUrl`.
**Pronto:** `curl` sem `Referer` → 403; CDN que responde 302 para host externo não é seguido
**Origem:** A4-49, A4-50

#### P200-E097 · [A] · P2 · `get-visitor-info` — HTTPS, IP validado e breaker
**Arquivo:** `supabase/functions/get-visitor-info/index.ts:31`
**Fazer:** faz `fetch` em `http://` (texto claro) para `ip-api.com`, fora do `fetchWithBreaker`, com o IP vindo de `xff[0]` (forjável) interpolado no path. A cidade resultante alimenta a city-whitelist do `check-login`, então o controle de login depende de um dado que o cliente escolhe. Usar `https`, validar o IP com regex IPv4/IPv6 e passar pelo `fetchWithBreaker`.
**Pronto:** `grep -c "http://" supabase/functions/get-visitor-info/index.ts` → `0`; IP inválido → 400
**Origem:** A4-51

#### P200-E098 · [C] · P1 · Mover o enforcement de login para Auth Hook
**Arquivo:** `supabase/functions/check-login/index.ts:119` e arquitetura
**Fazer:** duas coisas na mesma função. `if (TURNSTILE_SECRET)` — sem a secret o Turnstile é pulado e o login fica sem bot protection, sem alerta: fail-closed, ou no mínimo log de severidade alta + métrica. E o problema de fundo: lockout, city-whitelist e Turnstile são **advisory**, porque o login real é `supabase.auth.signInWithPassword`, que não consulta nada disso — chamar `/auth/v1/token` direto contorna o controle inteiro. Perguntar ao PO: *"Os controles de login (lockout, cidade, captcha) podem ser contornados chamando a API de auth direto. Mover o enforcement para um Auth Hook no Postgres é mudança de arquitetura — autoriza?"*
**Pronto:** sem `TURNSTILE_SECRET` a função reprova ou alerta; a decisão sobre o Auth Hook está registrada
**Origem:** A4-52, A4-53

#### P200-E099 · [A] · P2 · Parar de vazar erro do Postgres ao cliente ✅
**Arquivo:** `crm-db-bridge:548,591,611,783`; `external-db-inspect:100,114,186`; `sync-external-db:126`; `bulk-random-passwords:225`; `crm-callback-reprocess:128`
**Fazer:** 9 pontos devolvem `error.message` do Postgres ao cliente, expondo coluna, constraint e código PG. `_shared/log-safety.ts` e `_shared/error-response.ts` **existem** e não são usados aí. Trocar por `safeErrorResponse`/`safeErrorFields`, com mensagem pública genérica + `request_id`.
**Pronto:** nenhuma resposta de erro dessas funções contém nome de coluna ou código PG; o `request_id` correlaciona com o log
**Origem:** A4-39

#### P200-E100 · [A] · P1 · Pinar as dependências Deno das 4 funções públicas
**Arquivo:** `receive-crm-callback/index.ts:23`, `crm-callback-alerts/index.ts:21`, `crm-callback-reprocess/index.ts:16`, `quote-sync-promo-champions/index.ts:6-7`
**Fazer:** `npm:@supabase/supabase-js@2` e `npm:zod@3` (major flutuante) em 4 funções `verify_jwt=false` de produção — qualquer release upstream entra no próximo cold start, sem revisão. Pinar em `@2.49.4`/`@3.23.8`, como as outras 83 funções já fazem.
**Pronto:** `grep -rcE "npm:(@supabase/supabase-js|zod)@[0-9]+\"" supabase/functions/` → `0`
**Origem:** A4-35

---

## ⏸ CHECKPOINT 2 — APÓS E100

Metade do plano. `npm run plan:status` e três decisões:

1. **Corte** (R11). O que não fechou em 100 etapas não vai fechar por insistência. Mova P2 e P3 abertos para o fim e reavalie se ainda importam.
2. **Reavalie a trilha C.** Se E001 (rotação da chave), E005 (bypass), E071 (PITR) e E080 (tabelas de backup) seguem abertas, o plano está entregando hardening sobre uma base que não tem backup confirmado, com credencial vazada ainda válida e bypass aberto. Isso é pior que não executar: dá sensação de progresso. Escale ao PO antes da Onda 10.
3. **Confira o edge-functions drift.** Depois de 40 etapas mexendo em edge function, rode o `edge-functions-drift-check.yml` e confirme que o git e o canônico não divergiram.

---

### ONDA 10 — A SUÍTE DE TESTES ESTÁ VERMELHA (E101–E110)

`TZ=America/Sao_Paulo npx vitest run` sai **exit 1**: 11 testes em 4 arquivos falhando, 1201 arquivos passando, 1146 de 26658 testes skipped, 934,87s. Nenhum gate novo de teste faz sentido antes de a suíte fechar verde.

#### P200-E101 · [D] · P0 · Consertar o lockfile apontando para registry privado ✅
**Arquivo:** `package-lock.json:13905`
**Fazer:** 1 de 1273 entradas `resolved` aponta para `europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/pngjs/-/pngjs-7.0.0.tgz` — registry privado da Lovable, que entrou em `517581693` (PR do dependabot #2055). `npm ci` falha com 403 fora do sandbox da Lovable, e uma dependência de build de produção vem de um registry que o time não controla. (O CI do GitHub hoje consegue instalar, então isso não é o que quebra a esteira — é risco de cadeia de suprimento e de ambiente local.) Reinstalar `pngjs` com `--registry=https://registry.npmjs.org` e commitar o lock com host público.
**Pronto:** `grep -c "pkg.dev" package-lock.json` → `0` **e** `npm ci` completa num container limpo
**Origem:** A3-01

#### P200-E102 · [D] · P0 · Mockar a rede nos testes de edge function ✅
**Arquivo:** `tests/edge-functions/catalog-integration.test.ts:4`
**Fazer:** `BASE_URL = https://nmojwpihnslkssljowjh.supabase.co` com `fetch` de rede **real** (falha `ENOTFOUND`). Esse é um terceiro project-ref, nem o canônico nem o proibido, e está hardcoded em 36 arquivos de `tests/` contra 27 com o canônico. Mockar o `fetch` e trocar o ref pelo canônico nos 36.
**Pronto:** `grep -rc "nmojwpihnslkssljowjh" tests/` → `0` **e** o arquivo passa sem rede
**Origem:** A3-03

#### P200-E103 · [D] · P0 · Corrigir o teste de contrato do `MockupProductSelector` ✅
**Arquivo:** `tests/components/mockup/MockupProductSelector.test.tsx`
**Fazer:** 7 de 7 testes do bloco "grade responsiva e honestidade" falham — `waitFor` estoura esperando `getAllByTestId('mockup-product-row')`, porque o componente nunca renderiza linhas no jsdom. Pela REGRA #5 do `CLAUDE.md`: o componente mudou de propósito, então corrija o teste de **contrato**, não persiga o snapshot.
**Pronto:** `npx vitest run tests/components/mockup/MockupProductSelector.test.tsx` → exit `0`
**Origem:** A3-23

#### P200-E104 · [D] · P1 · Atualizar o teste do gate de bundle ✅
**Arquivo:** `scripts/__tests__/check-bundle-size.test.ts:196`
**Fazer:** `expected 100000 to be 180000` — o teste assere `maxBytes === atual × 1.2`, mas o script faz `min(atual × 1.2, prev)` desde o hardening E04. O teste está defasado e deixa a suíte vermelha. Atualizar a asserção para o invariante E04.
**Pronto:** `npx vitest run scripts/__tests__/check-bundle-size.test.ts` → exit `0`
**Origem:** A3-24

#### P200-E105 · [D] · P2 · Timeout local no fuzz de limite de carrinho ✅
**Arquivo:** `src/components/cart/__tests__/CartLimitExhaustive.test.tsx:187`
**Fazer:** fuzz de 200 seeds × até 120 itens estoura o `testTimeout: 15000` global. Reduzir `SEEDS` ou passar timeout local no `it` — não subir o timeout global, que esconderia regressão de tempo nos outros 26 mil testes.
**Pronto:** o arquivo passa com o `testTimeout` global intacto em 15000
**Origem:** A3-25

#### P200-E106 · [D] · P1 · A suíte não pode escrever em arquivo versionado ✅
**Arquivo:** `src/components/pdf/proposal/__tests__/pdfContrastReport.test.ts`, `tests/simulation/daily-flows.harness.test.ts`, teste do schema SSOT, `tests/setup-strict-side-effects.ts`
**Fazer:** a suíte unitária escreve em 4 arquivos versionados (`public/schemas/ssot-report*.schema.json`, `versions.json`, `qa/reports/pdf-contrast-report.md`) e cria 2 arquivos novos por dia (`daily-flows-simulation-<data>.{json,md}`). Toda rodada local suja a árvore de trabalho. Escrever em tmpdir ou mockar `fs`, e estender `setup-strict-side-effects.ts` para pegar escrita em disco.
**Pronto:** `npx vitest run && git status --porcelain` → saída vazia
**Origem:** A3-20, C-10

#### P200-E107 · [D] · P1 · Decidir o destino dos 39 testes P0 vazios ✅
**Arquivo:** `tests/p0/` (5 arquivos)
**Fazer:** 39 testes marcados **P0** — auth recovery, RLS, webhooks Bitrix e n8n, integrações externas — são todos `it.skip` com corpo `expect(true).toBe(true)`. A cobertura P0 executável é **zero**, e o diretório existe simulando o contrário. Implementar os 39 ou remover o diretório. Não deixar como está.
**Pronto:** `grep -rc "expect(true).toBe(true)" tests/p0/` → `0` (implementados ou diretório removido)
**Origem:** A3-11

#### P200-E108 · [D] · P1 · E2E com dataset vazio deve reprovar, não pular ✅
**Arquivo:** `e2e/` (207 ocorrências em 97 arquivos)
**Fazer:** 207 `test.skip(true, 'sem dados no dataset')` sob guard de catálogo vazio: num ambiente sem seed, a suíte e2e fica **verde** sem testar nada. Reprovar (não pular) quando a pré-condição de dataset estiver vazia — o skip silencioso é a mesma classe de falso verde da Onda 1.
**Pronto:** uma execução contra catálogo vazio reprova com mensagem clara, em vez de passar
**Origem:** A3-13

#### P200-E109 · [D] · P1 · `--min` proporcional no guard de testes executados ✅
**Arquivo:** `scripts/check-min-tests-executed.mjs:16`
**Fazer:** o guard que existe exatamente contra E108 tem default `--min=1` — passa com **1** spec executado. Default proporcional ao número de specs do projeto, e `--min` explícito em cada invocação.
**Pronto:** `grep -c "min=1" scripts/check-min-tests-executed.mjs` → `0`; o guard reprova com 1 spec de 97 executado
**Origem:** A3-14

#### P200-E110 · [D] · P1 · Fechar a suíte verde e travar ✅
**Arquivo:** `package.json`, `.github/workflows/deploy-gates.yml`
**Fazer:** com E101–E109 fechadas, rodar a suíte inteira e confirmar exit 0. Só então apontar o Gate 2 para ela (ver E116). Esta etapa é o portão da onda: sem suíte verde, as ondas de frontend seguintes não têm rede de segurança.
**Pronto:** `TZ=America/Sao_Paulo npx vitest run` → exit `0`, com `0 failed`
**Origem:** A3-02

> **PORTÃO DA ONDA 10:** E110 é obrigatória. Sem suíte verde, não abra a Onda 11.

---

### ONDA 11 — GATES DE FRONTEND QUE NÃO RODAM (E111–E120)

14 scripts `check:*` existem, funcionam, e **nada os invoca**. Gate que não executa é documentação.

#### P200-E111 · [D] · P0 · Fazer o Gate 1.1 realmente checar o tipo `Product` ✅
**Arquivo:** `scripts/check-product-type-fields.mjs:80-90`
**Fazer:** o gate da REGRA #2 grepa um blob concatenado que **inclui** `types.ts` (64.840 linhas, 19 colunas `sale_price`) com regex case-insensitive. Resultado: passa mesmo se `interface Product` for apagada inteira. O gate que protege a cicatriz de junho não protege nada. Parsear a interface via TypeScript Compiler API, como já foi feito no gate de types-inventory (E41).
**Pronto:** o gate reprova ao se remover `sale_price` de `src/types/product-catalog.ts`, com `types.ts` intacto
**Origem:** A3-04

#### P200-E112 · [D] · P1 · Fazer `npm run lint` rodar o ESLint ✅
**Arquivo:** `package.json` (`scripts.lint`, `scripts.typecheck`)
**Fazer:** os dois são `node scripts/check-tsc-baseline.mjs` — `npm run lint` **não roda ESLint**. O entrypoint real é `lint:check`/`lint:baseline`. Apontar `lint` para `lint:baseline` e `typecheck` para `typecheck:full`. Verificar o que o `deploy-gates.yml` invoca e corrigir junto.
**Pronto:** `npm run lint 2>&1 | grep -c eslint` ≥ 1
**Origem:** A3-07

#### P200-E113 · [D] · P1 · Ligar o gate de vazamento de toast e corrigir as 2 regressões ✅
**Arquivo:** `scripts/check-toast-leaks.mjs`, `src/components/admin/suppliers-manager/useSuppliersManager.ts:530`, `src/pages/products/SellerCartsPage.tsx:229`
**Fazer:** o gate funciona, está **exit 1 em `main`** com 2 regressões, e nenhum workflow o chama — a regressão entrou porque o gate nunca roda. Em `useSuppliersManager.ts:530`, `toast.error(err instanceof Error && err.message ? err.message : hay)` vaza mensagem técnica de edge function direto na UI; trocar por copy amigável + `description: sanitizeError(err)`. Em `SellerCartsPage.tsx:229`, passar `decision.message` por `sanitizeError`. Depois adicionar o gate ao `deploy-gates.yml`.
**Pronto:** `node scripts/check-toast-leaks.mjs` → exit `0` **e** o gate aparece no `deploy-gates.yml`
**Origem:** A3-08, A3-09, A3-10

#### P200-E114 · [D] · P1 · Proibir aumento do baseline de bundle sem label ✅
**Arquivo:** `scripts/check-bundle-size.mjs`, `bundle-size-baseline.json`
**Fazer:** em `95c1a1f4e` (2026-10-05) uma PR de redação de PII subiu `maxTotalBytes` em +292.840 (13.493.936 → 13.786.776) e `maxChunkBytes` em +81.935 (953.362 → 1.035.297), furando o invariante E04 "ratchet só desce" que o próprio script implementa em `check-bundle-size.mjs:146-148`. Reprovar aumento de limite sem label `ratchet-override`, no mesmo molde do Gate 1.7.
**Pronto:** PR que sobe `maxTotalBytes` sem o label reprova
**Origem:** A3-05

#### P200-E115 · [D] · P2 · Corrigir a chave morta do teto de ícones ✅
**Arquivo:** `bundle-size-baseline.json` (`criticalChunks.icons-vendor`), `vite.config.ts:86`
**Fazer:** o teto de 250 KB para `lucide-react` **nunca avalia**: o grupo em `vite.config.ts:86` se chama `critical-icons` e `grep -c icons-vendor vite.config.ts` devolve `0`. O gate imprime "não encontrado no build" como info e segue. Renomear a chave para `critical-icons` (o chunk real tem 8,5 KB).
**Pronto:** `node scripts/check-bundle-size.mjs` avalia o chunk em vez de reportar "não encontrado"
**Origem:** A3-26

#### P200-E116 · [D] · P1 · Apontar o Gate 2 para a suíte de verdade ✅
**Arquivo:** `package.json` (`test:deploy-gate`), `.github/workflows/deploy-gates.yml:276`
**Fazer:** o gate de deploy roda **3 de 1358** arquivos de teste (0,22%); `test:ci-core` roda 27. Apontar o Gate 2 para a suíte completa, ou no mínimo para `test:ci-core`. Só depois de E110 (suíte verde), senão o required check vira vermelho permanente. Se a suíte completa levar os 934s medidos, shardear — mas não reduzir a cobertura para caber no tempo.
**Pronto:** o Gate 2 executa ≥27 arquivos de teste e o run fica dentro do `timeout-minutes`
**Origem:** A3-12, A1-27

#### P200-E117 · [D] · P1 · Typecheck que inclua testes, com baseline próprio ✅
**Arquivo:** `tsconfig.app.json` (bloco `exclude`), `package.json`
**Fazer:** o único typecheck de CI exclui todos os testes. `npx tsc --noEmit -p tsconfig.eslint.json` (src + tests + e2e + scripts) dá **836 erros** — TS2339 173, TS2345 116, TS7006 91, TS2322 81, TS2307 38 — em ~1358 arquivos que nunca passam por `tsc`. Criar `typecheck:tests` com baseline próprio (descendente) e ligar o `test.typecheck`. Não tentar zerar os 836 nesta etapa: travar o número e drenar.
**Pronto:** `npm run typecheck:tests` sai `0` contra o baseline de 836 e reprova em 837
**Origem:** A3-06

#### P200-E118 · [D] · P2 · Ligar ou apagar os 14 gates órfãos ✅
**Arquivo:** `package.json` (14 scripts `check:*`), `.github/workflows/`
**Fazer:** `doc-refs`, `schema-reference-drift`, `seller-scope`, `route-error-element`, `aschild-nesting`, `route-ref-usage`, `client-structured-logging`, `no-inline-cors`, `summary-color-tokens`, `critical-coverage`, `observability`, `toast-leaks` (já em E113), `proposed-configs` e `public-views-drift` existem, rodam e nada os invoca. Para cada um: ligar no CI **ou** deletar. Gate não executado é pior que gate ausente, porque sugere cobertura.
**Pronto:** `node scripts/plan-status.mjs --orphan-gates` → `0` scripts `check:*` sem invocação em `.github/workflows/`
**Origem:** A3-37

#### P200-E119 · [D] · P2 · Unificar as 15 definições de `Product`
**Arquivo:** `src/types/product.ts:4`, `src/types/product-catalog.ts:25` (+13 locais)
**Fazer:** 15 definições de `Product` no repositório. As 2 "oficiais" divergem em nullability de `sku`, `stock`, `images`, `category_id`, `minQuantity` e `stockStatus` — e o gate da REGRA #2 só olha 2 arquivos. Unificar via `Pick`/`Omit` sobre `product-catalog.ts` e proibir `interface Product` local por gate. Depende de E111.
**Pronto:** `grep -rc "interface Product\b" src/` → `1`; o gate reprova definição local nova
**Origem:** A3-27

#### P200-E120 · [D] · P3 · Atualizar o grafo do graphify
**Arquivo:** `graphify-out/GRAPH_REPORT.md`
**Fazer:** o relatório diz `Built from commit: 953dd7ce`, hash que **não existe no histórico** (`git rev-list 953dd7ce..HEAD` → exit 128). O último commit em `graphify-out/` é `bbb849782`, de 2026-10-05 — 13 dias atrás. O auto-sync via N8N "em até 15 min" que o `CLAUDE.md` promete não está rodando. Rodar `graphify update . --force` e, se o auto-sync estiver morto, dizer isso no `CLAUDE.md` em vez de prometer 15 minutos.
**Pronto:** `grep "Built from commit" graphify-out/GRAPH_REPORT.md` casa com `git rev-parse --short HEAD`
**Origem:** A3-51

> **PORTÃO DA ONDA 11:** ≥8 de 10. E111 obrigatória (protege a REGRA #2).

---

### ONDA 12 — TIPOS, CASTS E DÍVIDA CONGELADA (E121–E130)

Os 5 ratchets de dívida técnica estão todos exatamente no baseline: 889 indexed-access, 135 arquivos grandes, 51 TODO, 2227 `as <Tipo>`, 0 `as any`. Zero progresso em 500 commits. O único que mudou foi o de bundle, **para cima**. Ratchet que só congela é dívida eterna com cerimônia.

#### P200-E121 · [D] · P1 · Fechar os 3 casts em argumento de RPC ✅
**Arquivo:** `src/lib/kit-builder/persistence.ts:100-101`, `src/services/magazineService.ts:438`, `src/hooks/favorites/useFavoriteQuickAdd.ts:75`
**Fazer:** 3 ocorrências de `(x ?? null) as unknown as string|number|Json` em **argumento de RPC** que o `types.ts` declara não-nulo. Ou o `types.ts` está errado, ou é um 400/500 esperando acontecer em produção. Conferir a assinatura real no `pg_catalog` e corrigir `types.ts` ou o call site — não o cast.
**Pronto:** os 3 `as unknown as` não existem mais e a chamada compila com o tipo real do RPC
**Origem:** A3-16

#### P200-E122 · [D] · P1 · Tipar `authService` com os tipos do SDK ✅
**Arquivo:** `src/services/authService.ts:40-161`
**Fazer:** 11 casts de `supabase.auth.*` para `Promise<{data: UnknownData; error: unknown}>` escondem o tipo de retorno real do `@supabase/supabase-js@^2.117.3` — um breaking change de shape em versão **minor** compila sem erro. Remover os casts e usar os tipos do SDK. É o maior ofensor do projeto e está no caminho de autenticação.
**Pronto:** `grep -c "as unknown as" src/services/authService.ts` → `0` e `npm run typecheck:full` sai `0`
**Origem:** A3-18, A3-17

#### P200-E123 · [D] · P1 · Validar os `jsonb` do `magazineService` com zod ✅
**Arquivo:** `src/services/magazineService.ts:74,78,97,100,105,108`
**Fazer:** 9 casts de coluna `jsonb` (`row.product_snapshot`, `row.branding`, `row.page_order`) para tipo de domínio **sem nenhuma validação**. O arquivo tem 11 commits na janela e histórico de sobrescrita (`7716ae9`). Validar com zod na borda do service: `jsonb` é dado não tipado por natureza, e cast não o torna tipado.
**Pronto:** `grep -c "as unknown as" src/services/magazineService.ts` → `0`; schema zod cobre os 3 campos
**Origem:** A3-19

#### P200-E124 · [D] · P1 · Criar o ratchet de `as unknown as` ✅
**Arquivo:** `.as-unknown-baseline.json` (novo), `scripts/check-as-unknown-baseline.mjs` (novo)
**Fazer:** 276 ocorrências de `as unknown as` em `src/`, **zero** cobertas por ratchet — `check-as-assertions-baseline.mjs` exclui `as unknown` por desenho, e `as any` real já é 0. É o único escape hatch de tipo sem gate, e é por onde a dívida sai. Criar baseline **descendente** (meta de redução, não trava). Top ofensores depois de E122/E123: `useNovelties` 9, `persistence` 7.
**Pronto:** `node scripts/check-as-unknown-baseline.mjs` sai `0` no número atual e reprova em qualquer aumento
**Origem:** A3-17

#### P200-E125 · [D] · P2 · Tipar o mapper de mockup em vez de assertar campo a campo
**Arquivo:** `src/hooks/mockup/mockupGenerationService.ts`
**Fazer:** maior ofensor do ratchet de asserções: **47** `as <Tipo>` num único arquivo, seguido de `useSellerCarts.ts` (25), `useProductsByColor.ts` (20) e `raw-row.adapter.ts` (20). Tipar o retorno do mapper, em vez de assertar por campo.
**Pronto:** `grep -c " as " src/hooks/mockup/mockupGenerationService.ts` ≤ 10 e o ratchet global desce
**Origem:** A3-43

#### P200-E126 ✅ · [D] · P2 · Transformar os 5 ratchets em descendentes com meta ✅
**Arquivo:** `.indexed-access-baseline.json`, `.file-size-baseline.json`, `.todo-baseline.json`, `.as-assertions-baseline.json`, `.any-type-baseline.json`
**Fazer:** os 5 estão exatamente no baseline — 889, 135, 51, 2227, 0 — sem nenhum progresso em 500 commits. Acrescentar a cada um um campo `meta` com alvo e data, e fazer o gate semanal (`ratchet-weekly.yml`) reportar a distância do alvo. Travar sem meta é congelar.
**Pronto:** os 5 arquivos têm `meta.target` e `meta.deadline`, e o relatório semanal imprime a distância
**Origem:** A3-40, A3-41, A3-42

#### P200-E127 ✅ · [D] · P2 · Zerar o baseline de `any` que já está em zero ✅
**Arquivo:** `.any-type-baseline.json` (`productionAnyCount: 1`)
**Fazer:** o valor atual medido é **0** — as 6 linhas com `as any` em `src/` estão em JSDoc. O baseline está defasado desde 2026-07-17 e permite 1. Rodar `node scripts/update-any-type-baseline.mjs` e travar em 0.
**Pronto:** `jq '.productionAnyCount' .any-type-baseline.json` → `0`
**Origem:** A3-53

#### P200-E128 · [D] · P2 · Plano de split dos 15 arquivos acima de 1000 linhas
**Arquivo:** `.file-size-baseline.json` (135 arquivos), maior = `src/components/quotes/QuoteBuilderSummaryColumn.tsx` (1698 linhas)
**Fazer:** 135 arquivos acima de 500 linhas, 98.278 linhas acima do limite, 15 acima de 1000 e 36 acima de 800 — congelados. Nesta etapa, **só os 3 piores**, começando por `QuoteBuilderSummaryColumn.tsx`. Split por responsabilidade, não por contagem de linhas; com a suíte verde de E110 como rede.
**Pronto:** os 3 piores ficam abaixo de 800 linhas e `.file-size-baseline.json` desce
**Origem:** A3-41

#### P200-E129 · [D] · P2 · Ratchet descendente de `eslint-disable` ✅
**Arquivo:** `src/` (502 `eslint-disable`, 109 de `react-hooks/exhaustive-deps`)
**Fazer:** `react-hooks/exhaustive-deps` está silenciado 109 vezes — `useQuoteBuilderState.ts` 6, `KitLibraryPage.tsx` 4, `GlobalSearchPalette.tsx` 4, `QuoteAutoSave.tsx` 4 — num total de 502 `eslint-disable` em `src/`. **É por isso que o ESLint reporta 0 erros em 2612 arquivos.** Criar ratchet descendente.
**Pronto:** `scripts/check-eslint-disable-baseline.mjs` existe, trava no número atual e reprova aumento
**Origem:** A3-46

#### P200-E130 · [D] · P2 · Drenar o baseline de indexed-access pelos arquivos mais densos
**Arquivo:** `.indexed-access-baseline.json` (`errorCount: 889`)
**Fazer:** 889 exato, zero progresso em 500 commits, e o Gate 1.10 foi promovido a bloqueante só para congelar. Atacar os 3 arquivos de maior densidade nesta etapa e registrar a meta de redução por sprint (depende de E126).
**Pronto:** `jq '.errorCount' .indexed-access-baseline.json` < 889
**Origem:** A3-40

> **PORTÃO DA ONDA 12:** ≥8 de 10.

---

### ONDA 13 — REACT: VAZAMENTOS, RE-RENDER E ACESSIBILIDADE (E131–E140)

#### P200-E131 · [D] · P0 · Eliminar o hook condicional em `CloudStatusContext` ✅
**Arquivo:** `src/contexts/CloudStatusContext.tsx:47-53`
**Fazer:** `useCloudStatus()` é chamado **condicionalmente**, depois de `if (ctx) return ctx`, com `eslint-disable react-hooks/rules-of-hooks` por cima. A contagem de hooks muda se o provider montar ou desmontar → React #310, exatamente a classe de regressão que o `CLAUDE.md` REGRA #7 cita em `MagazineEditorPage` (2026-07-16). Dar default ao `createContext` ou expor `useCloudStatusStandalone` separado.
**Pronto:** `grep -c "rules-of-hooks" src/contexts/CloudStatusContext.tsx` → `0`; montar/desmontar o provider não lança React #310
**Origem:** A3-15

#### P200-E132 · [D] · P1 · Fechar o vazamento de listener de auth
**Arquivo:** `src/hooks/ui/useWorkspaceNotifications.tsx:320`
**Fazer:** `onAuthStateChange` sem `unsubscribe` num hook montado em 2 instâncias simultâneas (Header + Drawer, documentado no próprio arquivo) — vaza 1 listener por mount. Os canais Realtime e o `setInterval` do mesmo arquivo **são** limpos, só esse não. Retornar `() => sub.subscription.unsubscribe()`.
**Pronto:** `grep -c "unsubscribe" src/hooks/ui/useWorkspaceNotifications.tsx` ≥ 1; teste de mount/unmount não acumula listener
**Origem:** A3-30

#### P200-E133 · [D] · P1 · Limpar os 6 `setTimeout` da busca global
**Arquivo:** `src/components/search/useGlobalSearch.ts:168-217`
**Fazer:** 6 `setTimeout(…, 500)` que fazem `setQuery`, `setResults` e `navigate`, com **zero** `clearTimeout` — setState e navegação em componente desmontado. Guardar os ids em ref e limpar no unmount.
**Pronto:** `grep -c "clearTimeout" src/components/search/useGlobalSearch.ts` ≥ 1
**Origem:** A3-31

#### P200-E134 · [D] · P2 · Cleanup de `setTimeout` nos 25 arquivos restantes
**Arquivo:** `src/` — `CartHeaderButton` (2), `MockupClientSelector` (2), `OffscreenLayoutCapture` (3), `LocationPanel` (2), `useOptimizationQueue` (2) e outros
**Fazer:** 25 arquivos com `setTimeout` dentro de `useEffect` e zero `clearTimeout` no arquivo. Cleanup em cada um, e regra de lint para impedir a próxima ocorrência.
**Pronto:** regra de lint ativa e `node scripts/check-timer-cleanup.mjs` → `0`
**Origem:** A3-32

#### P200-E135 · [D] · P1 · Corrigir as deps do autosave de orçamento
**Arquivo:** `src/components/quotes/QuoteAutoSave.tsx:87,103-109,120,150`
**Fazer:** 4 `eslint-disable react-hooks/exhaustive-deps` no componente de **autosave** — stale closure aqui significa perda de dados do orçamento do cliente. E um `useEffect` sem array de deps em `:103-109`, que roda a cada render chamando `JSON.stringify(data)`: é 1 dos 5 únicos `useEffect` sem deps de todo o `src/`. Corrigir as deps de verdade, não silenciar.
**Pronto:** `grep -c "exhaustive-deps" src/components/quotes/QuoteAutoSave.tsx` → `0`; teste de autosave com edição rápida não perde alteração
**Origem:** A3-44

#### P200-E136 · [D] · P2 · `useMemo` nos 2 providers do topo da árvore
**Arquivo:** `src/contexts/CloudStatusContext.tsx:39`, `src/contexts/OnboardingContext.tsx:10`
**Fazer:** `Provider value={hookResult}` sem `useMemo` em providers montados no topo do `App.tsx` → novo objeto por render re-renderiza a árvore inteira. Os outros 7 contexts do projeto já usam `useMemo`. Envolver os 2.
**Pronto:** os 2 arquivos usam `useMemo` no `value`
**Origem:** A3-33

#### P200-E137 · [D] · P2 · `key` estável nas 7 tabelas de dados
**Arquivo:** `src/components/admin/telemetry/AppHealthDashboard.tsx:221,292,354,414`, `RlsIntegrationTestsDialog.tsx:135`, `PresentationMode.tsx:336,364`
**Fazer:** `<tr key={i}>` em 4 tabelas de dados distintas do dashboard, mais 3 ocorrências em outros dois componentes. De 265 `key={index}` no total, 143 estão fora de contexto de skeleton. Corrigir estes 7 (lista mutável) e deixar os de skeleton em paz.
**Pronto:** os 7 usam id estável
**Origem:** A3-34

#### P200-E138 · [D] · P1 · Rótulo acessível no cadastro de fornecedor
**Arquivo:** `src/components/admin/suppliers-manager/SupplierFormDialog.tsx:231,239,251,264,334,345,355,368,382`
**Fazer:** ~20 `<Label>` **irmãos** de `<Input>` sem `htmlFor` e sem `id` no input: o leitor de tela anuncia "edit text" sem rótulo em todo o cadastro de fornecedor. É o padrão em 520 dos 696 `Label` do `src/`. Corrigir este formulário e criar gate de label órfão — os gates de a11y existentes cobrem FAB e outline, não label.
**Pronto:** `node scripts/check-orphan-labels.mjs` → `0` em `SupplierFormDialog.tsx`, e o gate está no CI
**Origem:** A3-35

#### P200-E139 · [D] · P2 · Template aplicável por teclado
**Arquivo:** `src/components/mockup/TemplateSelector.tsx:109`
**Fazer:** `<div onClick={() => onApply(template)}>` dentro de `DropdownMenuItem`, sem `role`, `tabIndex` nem `onKeyDown` — aplicar template é inacessível por teclado. Usar o `onSelect` do próprio `DropdownMenuItem`.
**Pronto:** navegação por `Tab` + `Enter` aplica o template
**Origem:** A3-36

#### P200-E140 · [D] · P2 · Drenar os 520 labels órfãos restantes, lote 1
**Arquivo:** `src/` (520 de 696 `Label`)
**Fazer:** com o gate de E138 no lugar, atacar os 10 formulários de maior uso real (cadastro de produto, orçamento, carrinho, cliente). Não os 520 de uma vez: varredura mecânica em massa é o que a R8 proíbe.
**Pronto:** o gate de label órfão desce de 520 para ≤450 e nenhum formulário dos 10 tem label órfão
**Origem:** A3-35

> **PORTÃO DA ONDA 13:** ≥8 de 10. E131 obrigatória (React #310 é regressão conhecida).

---

### ONDA 14 — BUILD, BUNDLE E CÓDIGO MORTO (E141–E150)

#### P200-E141 · [D] · P1 · Tirar o visualizer do build de produção
**Arquivo:** `vite.config.ts:26-32`
**Fazer:** o `visualizer` roda em **todo** build de produção: 46,5s de 66,1s do build total (70%, confirmado por `[PLUGIN_TIMINGS]`), e grava `dist/stats.html` de 2,8 MB que **não está** em `.gitignore` nem em `.vercelignore` — ou seja, o treemap do bundle vai publicado. Condicionar a `process.env.ANALYZE === '1'`.
**Pronto:** `npm run build` não gera `dist/stats.html` e o tempo cai para ~20s; `ANALYZE=1 npm run build` gera
**Origem:** A3-21

#### P200-E142 · [D] · P1 · Decidir o destino do `lazy-client`
**Arquivo:** `src/integrations/supabase/lazy-client.ts`
**Fazer:** abstração de lazy-load inútil: 46 call sites usam `getSupabaseClient()`, mas **271 arquivos importam `@/integrations/supabase/client` estaticamente**, então o Rolldown emite `INEFFECTIVE_DYNAMIC_IMPORT` e o cliente entra no bundle inicial de qualquer jeito. Mesmo caso com `sonner` (271 estáticos contra 1 dinâmico). Migrar os 271 **ou** deletar o arquivo e assumir o import estático. Escolher um; manter os dois é pagar a complexidade sem o benefício.
**Pronto:** `npm run build 2>&1 | grep -c INEFFECTIVE_DYNAMIC_IMPORT` → `0`
**Origem:** A3-22

#### P200-E143 · [D] · P2 · Remover a config de teste morta do `vite.config.ts`
**Arquivo:** `vite.config.ts` (bloco `test:`, ~linha 200), `vite.config.ts:20`
**Fazer:** config de teste morta e divergente da real: `setupFiles: './src/test/setup.ts'` **não existe**, e os thresholds são 80/80/80/80 com `include: ['src/components/search/**']`, contra 60/60/50/60 do `vitest.config.ts` que de fato roda. Remover o bloco e o `{ test?: any }` da linha 20.
**Pronto:** `grep -c "test:" vite.config.ts` → `0` e a suíte segue verde
**Origem:** A3-28

#### P200-E144 · [D] · P2 · Corrigir a opção inválida de cobertura
**Arquivo:** `vitest.config.ts:125`
**Fazer:** `coverage.all: false` não existe em `CoverageOptions` do Vitest 4 (TS2769) — a opção é ignorada silenciosamente, então a cobertura pode não ser o que o time pensa que é. Remover `all` e revalidar os thresholds com o número real.
**Pronto:** `npx tsc --noEmit vitest.config.ts` sem TS2769 e os thresholds refletem a medida real
**Origem:** A3-29

#### P200-E145 · [D] · P2 · Quebrar o CSS render-blocking de 392 KB
**Arquivo:** `src/index.css` (2.669 linhas / 64 KB), `src/styles/` (11 arquivos, 5.244 linhas)
**Fazer:** um único CSS de 392 KB bloqueia a renderização, apesar de `cssCodeSplit: true`, porque tudo é importado da entry. Extrair o critical CSS e mover o resto para import por rota.
**Pronto:** o CSS da entry cai para <100 KB e o Lighthouse de performance sobe
**Origem:** A3-38

#### P200-E146 · [D] · P2 · Code-split a rota de catálogo antes de bater o teto
**Arquivo:** `dist/assets/products-*.js` (856,7 KB), `vite.config.ts`
**Fazer:** maior chunk de rota, a **75% do teto** de 1011 KB — o gate já emite aviso, e `query-vendor` cresceu 13,0% contra um threshold de 15%. Code-split a rota de catálogo agora, com margem, em vez de esperar o gate reprovar.
**Pronto:** `products-*.js` < 600 KB e `query-vendor` abaixo do threshold
**Origem:** A3-45

#### P200-E147 · [D] · P2 · Remover os 5 componentes mortos confirmados
**Arquivo:** `CatalogQualityDashboard.tsx`, `KitVariantsManager.tsx`, `inventory/risk/StockRiskHero.tsx`, `products/PriceHistoryChart.tsx`, `compare/ComparisonWeightsPopover.tsx`
**Fazer:** 121 de 1963 arquivos não-teste (6,2%) não têm nenhum import no repositório; uma amostra de 7 confirmou 5 mortos, mais 12 barrels `index.ts` que ninguém importa. A concentração é em `kit-builder`, o módulo mais quente da janela — refactor deixando órfãos. Remover os 5 confirmados e os 12 barrels. Os outros 116 ficam para E148.
**Pronto:** os 5 arquivos não existem e `npm run build` + suíte seguem verdes
**Origem:** A3-39

#### P200-E148 · [D] · P2 · Triar os 116 arquivos sem import restantes
**Arquivo:** `src/` (121 totais − 5 de E147)
**Fazer:** confirmar um por um antes de remover — `grep` de import não pega import dinâmico, lazy route nem referência por string. Classificar: morto (remover), usado por rota lazy (anotar), usado por teste só (mover para `tests/fixtures`). Não remover em massa.
**Pronto:** relatório em `docs/arquivo/2026-10/` com veredito por arquivo, e os classificados como mortos removidos
**Origem:** A3-39

#### P200-E149 · [D] · P3 · Corrigir `__dirname` e os globs mortos do Tailwind
**Arquivo:** `vite.config.ts:34`, `tailwind.config.ts:5`
**Fazer:** `__dirname` é incompatível com `configLoader: 'native'`, que vira default num major futuro do Vite (gera warning em todo build) — trocar por `import.meta.dirname`. E 3 dos 4 globs de `content` do Tailwind (`./pages/**`, `./components/**`, `./app/**`) não existem na raiz, porque o app está em `src/` — remover os 3.
**Pronto:** `npm run build` sem o warning de `__dirname`; `tailwind.config.ts` com 1 glob
**Origem:** A3-50, A3-52

#### P200-E150 · [D] · P3 · Limpar `package.json` e deduplicar o lock
**Arquivo:** `package.json`, `package-lock.json`
**Fazer:** três coisas pequenas. `lint-staged` e `prettier-plugin-tailwindcss` estão em `dependencies` (produção) e `lint-staged` não é invocado por script nenhum; `@types/dompurify@3.2.0` é stub deprecado — mover para `devDependencies` ou remover. 84 pacotes com mais de uma versão (29 fora de `dev`): `axe-core` em 4 versões, `react-is` 16.13.1 + 18.3.1, `semver` 6.3.1 + 7.8.0, `minimatch` 3.1.5 + 10.2.6, `pako` 1.0.11 + 2.1.0 — o campo `overrides` já existe e não foi usado para eles. E 114 de 120 deps com `^`, incluindo `react@^19.3.0`, `vite@^8.3.4`, `vitest@^4.1.11`, `@supabase/supabase-js@^2.117.3` e `react-router-dom@^7.18.4`: pinar as críticas em versão exata.
**Pronto:** `npm ls --depth=0 --prod | grep -c lint-staged` → `0`; duplicatas fora de `dev` ≤ 15; as 5 deps críticas pinadas
**Origem:** A3-47, A3-48, A3-49

---

## ⏸ CHECKPOINT 3 — APÓS E150

`npm run plan:status`. Três quartos do plano. A pergunta deste checkpoint é diferente das anteriores:

1. **As 50 etapas restantes são de custo e consolidação, não de risco.** Se o tempo apertou, elas são as primeiras a cortar — mas o corte tem de ser declarado, não por abandono. Escreva no `plan:status` o que foi cortado e por quê.
2. **Confirme que a Onda 0 não regrediu.** Rode: `jq '.bypass_actors' <ruleset>` ainda vazio? `grep pkg.dev package-lock.json` ainda zero? `.gitleaks.toml` ainda com `useDefault`? Hardening que regride sem alarme é o padrão deste repositório — foi o que aconteceu com `quality-gate.yml` em 2026-10-14.
3. **Rode a suíte completa e o build.** Depois de 50 etapas em `src/`, confirme exit 0 nos dois antes de abrir a Onda 15.

---

### ONDA 15 — CONSOLIDAR OS 127 WORKFLOWS (E151–E160)

127 workflows é o sintoma, não a doença: cada incidente virou um workflow novo em vez de um caso no workflow existente. Pela R7, consolidar **antes** de endurecer.

#### P200-E151 · [A] · P2 · Deletar 2 workflows inteiramente contidos no `e2e-cart`
**Arquivo:** `.github/workflows/e2e-cart-delete-popover.yml`, `.github/workflows/e2e-carts-undo-rpc-atomic.yml`
**Fazer:** `e2e-cart.yml` já roda `cart-delete-header-popover.spec.ts`, `cart-delete-header-popover-exhaustive.spec.ts` e `13b-carts-undo-rpc-atomic.spec.ts`. Os dois outros workflows rodam exatamente os mesmos specs — 3 runners para 3 specs duplicados em cada PR de carrinho. Deletar os dois.
**Pronto:** os 2 arquivos não existem e os 3 specs seguem executando em `e2e-cart.yml`
**Origem:** A1-33

#### P200-E152 · [A] · P2 · Desduplicar `cart-quality` e `e2e-cart`
**Arquivo:** `.github/workflows/cart-quality.yml`, `.github/workflows/e2e-cart.yml`
**Fazer:** os dois rodam os **mesmos 4 specs** (`cart-to-quote-handoff`, `cart-to-quote-handoff-persistence`, `quote-handoff-url-params`, `sidebar-no-legacy-labels`) com `paths` sobrepostos (`src/components/cart/**`, `SellerCartContext.tsx`, `useSellerCarts.ts`, `e2e/carrinhos/**`) — execução duplicada em cada PR de carrinho. Remover os 4 specs de `cart-quality.yml` e deixá-lo só com os unitários.
**Pronto:** `grep -c "cart-to-quote-handoff" .github/workflows/cart-quality.yml` → `0`
**Origem:** A1-32

#### P200-E153 · [A] · P2 · Transformar `freight-e2e-staging` em `workflow_call`
**Arquivo:** `.github/workflows/freight-quality-gates.yml`, `.github/workflows/freight-e2e-staging.yml`
**Fazer:** par redundante direto: ambos rodam só `e2e/flows/freight-quest-complete-flow.spec.ts`. Manter `freight-quality-gates.yml` para PR e transformar o de staging num `workflow_call` que reaproveita o primeiro.
**Pronto:** o spec aparece em um único lugar; o de staging chama o reusable
**Origem:** A1-34

#### P200-E154 · [A] · P2 · Consolidar os workflows de dialog visual
**Arquivo:** `.github/workflows/ui-visual-a11y.yml`, `.github/workflows/e2e-dialogs-pr-check.yml`
**Fazer:** ambos rodam `e2e/ui/alert-dialog-visual.spec.ts` e `confirm-dialog-visual.spec.ts` em PR com `--project=chromium-public` — snapshot visual duplicado. Consolidar num só.
**Pronto:** os 2 specs rodam em um único workflow
**Origem:** A1-35

#### P200-E155 · [A] · P2 · Unificar os 6 workflows de atualizar snapshot
**Arquivo:** `.github/workflows/e2e-update-*-snapshots.yml` (8 variantes: alert-dialog, calendar, confirm-dialog, dialog, magazine-ring, quote-conditions, quote-freight, quote-no-pres)
**Fazer:** workflows template-idênticos: `workflow_dispatch`, 1 spec, `contents: write`, step "Dry-run (safe mode)" com `continue-on-error`. Unificar num único `update-snapshots.yml` com inputs `spec` e `project`.
**Pronto:** existe 1 workflow de snapshot em vez de 8, e `actionlint` sai `0`
**Origem:** A1-36

#### P200-E156 · [A] · P2 · Usar o `_secrets-check.yml` nos 5 workflows que o reimplementam
**Arquivo:** `.github/workflows/{e2e-cart,e2e-focused,e2e-freight,e2e-quotes,e2e-stock}.yml`, `check-workflow-contracts.allowlist.json`
**Fazer:** os 5 reimplementam inline o job "Verify E2E secrets", que existe exatamente como reusable. A duplicação está allowlistada como C9 — allowlist escondendo duplicação. Substituir por `uses: ./.github/workflows/_secrets-check.yml` e **remover a entrada da allowlist**. Depende de E007 (que define `fail_if_missing`).
**Pronto:** `grep -c "C9" .github/workflows/check-workflow-contracts.allowlist.json` → `0`
**Origem:** A1-37

#### P200-E157 · [A] · P2 · Tirar o `_template.yml` de dentro de `workflows/`
**Arquivo:** `.github/workflows/_template.yml` → `docs/ci/_template.yml.example`
**Fazer:** o template vive dentro de `.github/workflows/`, então se registra como workflow real na UI do Actions, e referencia `secrets.EXAMPLE_API_KEY` — o que exigiu entradas dedicadas em `docs/ci/SEGREDOS.md:128` e `scripts/check-secrets-inventory.mjs:34` só para o Gate 1.14 não quebrar. Mover para `docs/ci/` e remover as 2 exceções.
**Pronto:** `ls .github/workflows/_template.yml` falha; `grep -c EXAMPLE_API_KEY docs/ci/SEGREDOS.md scripts/check-secrets-inventory.mjs` → `0` nos dois
**Origem:** A1-45

#### P200-E158 · [A] · P2 · `paths` filter no único Playwright pesado que não tem
**Arquivo:** `.github/workflows/cart-invariants-smoke.yml:22-26`
**Fazer:** é o único workflow Playwright pesado com `pull_request: branches: [main]` **sem** `paths:` — roda 8 specs em matriz de shards em **todo** PR, inclusive PR só de documentação. Acrescentar `paths` com `src/contexts/SellerCartContext.tsx`, `src/hooks/products/useSellerCarts.ts`, `e2e/carrinhos/**` e o próprio arquivo (regras R12/C13).
**Pronto:** PR que só toca `docs/` não dispara este workflow
**Origem:** A1-31

#### P200-E159 · [A] · P2 · Acabar com os 7 runners de sinal zero
**Arquivo:** `.github/workflows/e2e-focused.yml:71`
**Fazer:** `continue-on-error: true` em nível de **job** numa matriz de 7 suites: 7 runners por PR que não podem reprovar nada. Está allowlistado, o que só documenta o problema. Mover as suites instáveis para cron noturno e manter em PR apenas as com baseline completo, sem `continue-on-error`.
**Pronto:** `grep -c "continue-on-error" .github/workflows/e2e-focused.yml` → `0` e as instáveis estão no `nightly-full.yml`
**Origem:** A1-44

#### P200-E160 · [A] · P3 · Resolver o ruleset `release/*` vazio
**Arquivo:** `.github/required-checks.json` (ruleset `release`)
**Fazer:** o ruleset `release/*` está `_disabled: true` com `required_checks: []` desde o E56, porque os 3 checks apontavam para workflows com `paths:` filter e bloqueariam qualquer PR que não tocasse esses paths. Hoje branches `release/*` não têm **nenhum** check obrigatório. Criar um agregador sem `paths` filter (no molde do "Gate Final") **ou** remover o ruleset vazio, para não sugerir cobertura inexistente.
**Pronto:** o ruleset tem ≥1 check real, ou não existe mais no arquivo
**Origem:** A1-55

> **PORTÃO DA ONDA 15:** ≥8 de 10. Depois desta onda, `ls .github/workflows/*.yml | wc -l` deve estar ≤ 115.

---

### ONDA 16 — CUSTO E TEMPO DE CI (E161–E170)

#### P200-E161 · [A] · P2 · Tirar o Lighthouse de todo PR
**Arquivo:** `.github/workflows/deploy-gates.yml:390-418`
**Fazer:** o Gate 4 tem `continue-on-error: true` e está fora do `needs` do `deploy-ready`, mas roda `npm run build` completo + `lhci autorun` — 15 minutos em **todo** PR — e o resultado não é lido nem comentado em lugar nenhum. É custo puro sem sinal. Mover para cron noturno (`nightly-full.yml`) ou condicionar a `paths: ['src/**']` com comentário automático no PR.
**Pronto:** o Gate 4 não executa em PR que não toca `src/`, ou saiu do `deploy-gates.yml`
**Origem:** A1-26

#### P200-E162 · [A] · P1 · Quebrar o job que esconde 16 gates
**Arquivo:** `.github/workflows/deploy-gates.yml:114-271`
**Fazer:** os "Gates" 1.1 a 1.16 são **steps sequenciais de um único job** `lint-typecheck`, sem `continue-on-error`: o primeiro step que falha esconde todos os seguintes — uma falha de ESLint oculta os Gates 1.11, 1.13 e 1.14 — e o required check expõe um nome só. É também por isso que o job tem `timeout-minutes: 15`, 3× o limite da classe "Estático ≤5". Quebrar em 3 ou 4 jobs paralelos (`static-gates`, `drift-gates`, `security-gates`) encadeados ao `deploy-ready`, com timeout ≤5 cada.
**Pronto:** `deploy-gates.yml` tem ≥3 jobs no lugar de `lint-typecheck`, cada um com `timeout-minutes` ≤ 5, e o `deploy-ready` depende dos 3
**Origem:** A1-13, A1-28

#### P200-E163 · [A] · P2 · Reduzir o timeout do `visual-baseline`
**Arquivo:** `.github/workflows/visual-tests.yml:47`
**Fazer:** `timeout-minutes: 60` num job de 2 shards, e o nome do workflow ("Visual Baseline Tests") não contém Nightly/Weekly/Monthly/Security/Drift, logo cai fora da exceção declarada em `PADRAO_WORKFLOW.md:62`. Reduzir para ≤20 (classe "E2E leg") ou renomear/allowlistar formalmente.
**Pronto:** `timeout-minutes` ≤ 20, ou entrada formal na allowlist de E170
**Origem:** A1-29

#### P200-E164 · [A] · P2 · Reduzir o timeout do `stock-dashboard-stress`
**Arquivo:** `.github/workflows/stock-dashboard-stress.yml`
**Fazer:** job `stress` com `timeout-minutes: 60` e nome "Estoque — Stress Loop (anti-flake)" — mesma violação de classe de E163. Reduzir, ou acrescentar "Nightly" ao `name:` se de fato é job noturno.
**Pronto:** `timeout-minutes` ≤ 20, ou o nome declara que é noturno
**Origem:** A1-30

#### P200-E165 · [A] · P2 · Migrar os 49 workflows para a composite `e2e-setup`
**Arquivo:** `.github/actions/e2e-setup/action.yml` e 49 workflows
**Fazer:** só 5 dos 54 workflows com Playwright usam a composite que faz cache de `~/.cache/ms-playwright`. Outros 28 reimplementam o cache à mão e **30 não têm cache nenhum** — entre eles o `deploy-gates.yml`, que é o required check de todo PR. Pela R8, migrar em lotes de ≤10 com execução no mesmo PR, não numa varredura só.
**Pronto:** `grep -rlc "e2e-setup" .github/workflows/ | wc -l` ≥ 40 e o tempo médio do Gate 3 cai
**Origem:** A1-38

#### P200-E166 · [A] · P2 · Instalar só o browser que o job usa
**Arquivo:** `.github/workflows/visual-tests.yml:71`, `e2e-cart-delete-popover.yml:76` (se sobreviver a E151), `stock-future-stock-e2e.yml:100`
**Fazer:** `npx playwright install --with-deps` sem argumento instala chromium + firefox + webkit, mas os jobs usam só `--project=chromium-public` — 3 a 4 minutos desperdiçados por run. Especificar `chromium`.
**Pronto:** `grep -rc "playwright install --with-deps$" .github/workflows/` → `0`
**Origem:** A1-39, A1-40

#### P200-E167 · [A] · P2 · Usar a composite `setup-node-ci` nos 2 workflows sem cache
**Arquivo:** `.github/workflows/ratchet-weekly.yml:47-52`, `.github/workflows/regenerate-supabase-types.yml:63-68`
**Fazer:** os dois usam `actions/setup-node` **sem** `cache: 'npm'` seguido de `npm ci --prefer-offline` — install a frio, divergindo dos ~90 workflows que já usam a composite `setup-node-ci`. Trocar pela composite.
**Pronto:** `grep -c "setup-node-ci" .github/workflows/{ratchet-weekly,regenerate-supabase-types}.yml` → 1 em cada
**Origem:** A1-41, A1-42

#### P200-E168 · [A] · P3 · Não rodar `npm ci` inteiro para uma dependência
**Arquivo:** `.github/workflows/required-checks-guard.yml` (job `ghost-check-guard`)
**Fazer:** o step "Install js-yaml" roda `npm ci --ignore-scripts` completo para uma única dependência, num job de 5 minutos. Usar `npm i --no-save js-yaml@4.3.2` ou embutir um parser YAML mínimo em `scripts/check-required-checks.mjs`.
**Pronto:** o job não roda `npm ci` e completa em <1 min
**Origem:** A1-43

#### P200-E169 · [A] · P3 · Resolver a colisão de cron
**Arquivo:** `.github/workflows/ci-security-drift.yml`, `.github/workflows/log-login-fuzz-weekly.yml`
**Fazer:** ambos com cron `17 6 * * 1` — única colisão de slot entre os 38 schedules do repositório, contra a regra de ≥20 min de separação estabelecida em `d9d1c2566` (E89). Mover um dos dois para `37 6 * * 1`.
**Pronto:** `grep -rhoE "cron: '[^']+'" .github/workflows/ | sort | uniq -d | wc -l` → `0`
**Origem:** A1-54

#### P200-E170 · [A] · P1 · Fechar a mentira documental sobre timeout
**Arquivo:** `docs/ci/PADRAO_WORKFLOW.md:49-63`, `docs/ci/TIMEOUT_ALLOWLIST.json` (ausente)
**Fazer:** duas afirmações falsas na mesma seção. A doc diz que "o Gate CI (C15 em `check-workflow-contracts.mjs`) valida que nenhum job ultrapassa o limite da sua classe" — **falso**: C15 é a regra de `runs-on: ubuntu-24.04`, e não existe nenhuma lógica de classe de timeout no script (`grep` por `TIMEOUT_ALLOWLIST|classe|timeoutClass` devolve vazio). E o escape hatch `docs/ci/TIMEOUT_ALLOWLIST.json` que a regra R3/E24 cita **não existe**. Implementar o check de classe como C25 e criar o arquivo com as 4 exceções reais (`deploy-gates/unit-tests`, `visual-tests`, `stock-dashboard-stress`, `ci-metrics-weekly`), **ou** remover as duas afirmações da doc. Não deixar meio.
**Pronto:** `node scripts/check-workflow-contracts.mjs --gate` implementa C25 e o arquivo existe, **ou** a doc não menciona nem C15-timeout nem a allowlist
**Origem:** A1-11, A1-12

> **PORTÃO DA ONDA 16:** ≥8 de 10. E162 é a de maior retorno: ela torna visível qual gate reprovou.

---

### ONDA 17 — SEGURANÇA DE CI E MONITORES DORMENTES (E171–E180)

#### P200-E171 · [A] · P1 · Reintroduzir SAST em PR
**Arquivo:** `.github/workflows/codeql.yml:5-8`
**Fazer:** `pull_request` foi removido deliberadamente em 2026-09-27 e o próprio comentário no arquivo admite "Sem branch protection, não bloqueia nenhuma PR" — resultado: **não existe SAST bloqueante em PR neste repositório**. Reintroduzir CodeQL em PR com `paths: ['src/**','supabase/functions/**']` e agregar ao Gate Final, **ou** declarar formalmente no `CLAUDE.md` que SAST é advisory. Escolher, e escrever a escolha.
**Pronto:** CodeQL roda em PR e consta no `required-checks.json`, **ou** o `CLAUDE.md` declara SAST como advisory com a razão
**Origem:** A1-07

#### P200-E172 · [A] · P1 · Tornar o scan de segredo bloqueante
**Arquivo:** `.github/workflows/security.yml:31-45`, `.github/workflows/deploy-gates.yml`
**Fazer:** o gitleaks roda em PR, mas "Security Scan" **não está** em `.github/required-checks.json` — então uma PR com segredo vazado mostra um X não-obrigatório e pode ser mergeada. Acrescentar um job `secret-scan` dentro do `deploy-gates.yml` (ou agregar o resultado no `deploy-ready`) para torná-lo bloqueante. Depende de E003 — sem regras no gitleaks, tornar bloqueante não muda nada.
**Pronto:** PR com segredo de teste reprova o `Gate Final - Deploy Ready`
**Origem:** A1-08, C-08

#### P200-E173 · [A] · P1 · `environment: production` no deploy do Vercel
**Arquivo:** `.github/workflows/deploy-vercel.yml:35-68`
**Fazer:** deploy de produção por `workflow_dispatch` **sem** `environment:` — nenhum required reviewer. O único guard é `$GITHUB_REF == refs/heads/main` na linha 50, enquanto `db-apply-migration.yml:113` usa `environment: production` para a mesma classe de operação. Acrescentar `environment: production` ao job `deploy` e configurar required reviewers.
**Pronto:** `grep -c "environment: production" .github/workflows/deploy-vercel.yml` ≥ 1 e o dispatch fica pendente de aprovação
**Origem:** A1-09

#### P200-E174 · [A] · P1 · Devolver o SARIF do gitleaks ao Security Dashboard
**Arquivo:** `.github/workflows/gitleaks-history-audit.yml:18`
**Fazer:** `security-events: write` foi removido no E92, então o SARIF do scan histórico diário virou só artefato + issue: não alimenta o Security Dashboard nem os alertas de secret scanning. Restaurar a permissão e o upload SARIF, **ou** documentar a decisão em `SEGREDOS.md`. Depende de E003.
**Pronto:** o SARIF aparece em Security → Code scanning, **ou** a decisão está escrita em `docs/ci/SEGREDOS.md`
**Origem:** A1-23

#### P200-E175 · [B] · P1 · Resolver o token do `required-checks-guard`
**Arquivo:** `.github/workflows/required-checks-guard.yml:41`
**Fazer:** `GH_TOKEN: ${{ secrets.BRANCH_PROTECTION_READ_TOKEN || github.token }}`. O `github.token` não lê `/rulesets` sem permissão de admin, e o script sai 1 em qualquer HTTP ≠ 200 — então no fallback o guarda da proteção de branch fica **vermelho permanentemente**. Confirmar se o PAT existe em Settings → Secrets; se não existir, criar, ou degradar para `::warning::` com issue automática.
**Pronto:** o workflow conclui `success` em 2 runs consecutivos
**Origem:** A1-17

#### P200-E176 · [A] · P1 · Tornar required os 2 guardas da própria proteção
**Arquivo:** `.github/required-checks.json`, `required-checks-guard.yml`, `branch-protection-sentinel.yml`
**Fazer:** os dois únicos guardas que comprovam que o "Gate Final - Deploy Ready" está marcado como required **não são, eles mesmos, required checks**. Se a proteção for desligada, aparece só um X opcional. Acrescentar `assert-required-checks` ao conjunto required (ele não tem `paths` filter no push, então não trava), ou alertar via issue em falha. Depende de E006, que limpa a divergência entre proteção clássica e ruleset.
**Pronto:** `node scripts/check-required-checks.mjs --gate` lista o guard entre os required e o ruleset ao vivo reflete
**Origem:** A1-18, C-06

#### P200-E177 · [B] · P1 · Acordar os 3 monitores de banco com cron comentado
**Arquivo:** `.github/workflows/pgss-slo-report.yml:4-6`, `wraparound-monitor-report.yml:31-34`, `capacity-growth-report.yml:30-33`
**Fazer:** os três têm o cron **comentado**, aguardando migrations que nunca foram aplicadas: `ops.pgss_history` [DBA-E40], [DBA-E33] e `ops.table_size_history` [DBA-E30]. Dispatch-only significa que nunca rodam. Consequências: o SLO de query não é medido, a projeção de capacidade a 90 dias não existe, e — o mais grave — **o alarme de wraparound de XID está dormente**, e wraparound em PostgreSQL é falha irreversível. Aplicar as 3 migrations via `db-apply-migration.yml` e reativar os crons. Prioridade: wraparound primeiro.
**Pronto:** os 3 workflows têm cron ativo e ≥1 execução bem-sucedida cada
**Origem:** A1-19, A1-20, A1-21

#### P200-E178 · [A] · P1 · Parar de ignorar todos os majors no dependabot
**Arquivo:** `.github/dependabot.yml:33-35`
**Fazer:** `ignore: [{dependency-name: "*", update-types: ["version-update:semver-major"]}]` ignora **todos** os majors, então um major com CVE crítico nunca gera PR automático — a detecção depende só dos Gates 0.5/0.6. Restringir o ignore às deps realmente arriscadas de subir (react, vite, typescript) em vez de `*`.
**Pronto:** `grep -c 'dependency-name: "\*"' .github/dependabot.yml` → `0`
**Origem:** A1-22

#### P200-E179 · [A] · P2 · Resolver o checkout contraditório do `lovable-autoheal`
**Arquivo:** `.github/workflows/lovable-autoheal.yml:47-50`
**Fazer:** o checkout declara `persist-credentials: false` **e** `token: ${{ secrets.GITHUB_TOKEN }}` no mesmo `with:` — combinação contraditória, resíduo do sweep E32 (`64a75418c`) corrigido só em parte por `aa940e598` ("restaura git push nos 17 jobs que perderam credencial"). Remover o `token:` (inútil com `persist-credentials: false`) ou usar `persist-credentials: true` só nesse job, conforme o workflow precise ou não empurrar.
**Pronto:** o `with:` do checkout é internamente coerente e o workflow consegue (ou não) empurrar, conforme a intenção declarada em comentário
**Origem:** A1-24

#### P200-E180 · [A] · P2 · Fazer o C12 ver `permissions` em nível de job
**Arquivo:** `scripts/check-workflow-contracts.mjs` (C12), `.github/workflows/policies-baseline.yml:107-108`, `schema-snapshot-export.yml:153-154`
**Fazer:** os dois workflows têm `permissions.contents: write` em nível de **job** com trigger `pull_request`, e o C12 só inspeciona `permissions` top-level — a regra R11 não cobre esse caso. Os dois já têm fork-guard, então o risco imediato é baixo; o problema é a regra ser cega. Estender o C12 para percorrer `jobs.*.permissions`.
**Pronto:** o C12 acusa um `jobs.*.permissions.contents: write` novo em workflow com trigger `pull_request`
**Origem:** A1-25

> **PORTÃO DA ONDA 17:** ≥8 de 10. E177 (wraparound) tem prioridade sobre as outras 9 desta onda.

---

### ONDA 18 — GOVERNANÇA E TRABALHO MULTIAGENTE (E181–E190)

Seis agentes escrevem na mesma `main` (Claude, Codex, Devin, Lovable, github-actions, cline) e o único protocolo de ownership entre eles está em rascunho há 47 dias.

#### P200-E181 · [C] · P0 · PR obrigatório para arquivo de governança, inclusive do dono
**Arquivo:** ruleset `16764622`, `CLAUDE.md`
**Fazer:** complemento de E005 e E009. Pedir ao PO um ruleset adicional (ou condição no existente) que exija PR para `.github/**`, `CODEOWNERS`, `supabase/migrations/**`, `scripts/check-*` e `.gitleaks.toml`, **sem bypass de admin nesses paths**. O caso que motiva: as 100 etapas do `PLANO_WORKFLOWS_CI_V2` entraram em `main` em ~28h como merge local de 84 commits, 172 arquivos, 11.458 linhas, tocando `CODEOWNERS`, `deploy-gates.yml` e `db-apply-migration.yml`, sem nenhuma revisão (PR #2149, aberta e mergeada em 11 segundos).
**Pronto:** push direto em `.github/` é recusado pelo GitHub, mesmo para admin
**Origem:** A5-11, A5-55, A5-39, C-01

#### P200-E182 · [C] · P1 · Um segundo CODEOWNER
**Arquivo:** `.github/CODEOWNERS`
**Fazer:** **52 referências, todas `@adm01-debug`**, em 51 regras. Dono único em 100% das regras significa que ninguém no repositório pode revisar quem revisa tudo — e `adm01-debug` + `Joaquim` somam 332 de 503 commits (66%) do mesmo domínio, com Joaquim cessando em 2026-09-12. Bus factor nominal 2, efetivo 1. Pedir ao PO um segundo CODEOWNER (ex.: `ti@`) para workflows, migrations e o próprio `CODEOWNERS`.
**Pronto:** `grep -c "@adm01-debug" .github/CODEOWNERS` < 52 e ≥1 regra tem 2 owners
**Origem:** A5-56, A5-57, A5-58

#### P200-E183 · [A] · P1 · `CODEOWNERS` tem de cobrir `src/types/` e ter catch-all
**Arquivo:** `.github/CODEOWNERS`
**Fazer:** `grep -c 'src/types' .github/CODEOWNERS` → **0**. O tipo `Product` vive em `src/types/product-catalog.ts`, que é o arquivo da REGRA #2 e já sofreu a regressão de junho — e **não tem CODEOWNER**. Sem regra catch-all `*`, `src/components`, `src/hooks` e `src/pages` também estão descobertos. Acrescentar `src/types/` e um `*` no fim.
E usar o `CODEOWNERS` para particionar domínio entre os 6 agentes que escrevem aqui (Claude, Codex, Devin, Lovable, github-actions, cline): hoje todos escrevem em qualquer diretório sem atribuição, e 9 dos 15 merges da janela vêm de branches `codex/*`.
**Pronto:** `gh api repos/adm01-debug/Promo_Gifts_V4/codeowners/errors --jq '.errors|length'` → `0`; `src/types/product-catalog.ts` tem owner; o arquivo tem regra catch-all `*`
**Origem:** A5-31, A5-38

#### P200-E184 · [A] · P1 · `commitlint` com lista fechada de tipos e escopos
**Arquivo:** `commitlint.config.js` (novo ou existente), `.husky/`
**Fazer:** commits fora da REGRA #6 na janela: `a5ca5e7a5` (`security:`), `4a8e54c2b` (`fix+ci(...)`), `c307c81f3` (`perf+security(...)`), `33475f483` (sem tipo), além de `Work in progress` e `Update plan`. E o vocabulário de escopo não tem contrato: `fix(revisão)`/`fix(auditoria)` convivem com `fix(security)`, e `ci`/`workflows`/`gates`/`governanca` nomeiam a mesma coisa — o que subconta qualquer agrupamento por escopo. Ligar o commitlint com a lista fechada da REGRA #6 e uma lista fechada de escopos.
**Pronto:** commit com tipo `perf+security` é recusado pelo hook
**Origem:** A5-18, A5-19

#### P200-E185 · [A] · P1 · Gate de tamanho de PR
**Arquivo:** `.github/workflows/pr-size-guard.yml` (novo)
**Fazer:** 30 commits da janela têm mais de 50 arquivos ou mais de 5.000 linhas, inclusive em escopo de segurança: `06461a457`/`2d5fe16b1` (1.256 arquivos, 90.675 linhas), `8fcce4703` (47.468 linhas), `33475f483` (136 arquivos, **747.111 linhas**, levando os 2 workflows mais críticos de governança junto com 6 migrations, uma auditoria tripla e um plano de 50 etapas). PR acima de 50 arquivos exige label `large-pr-approved` + razão no corpo. Workflow crítico nunca viaja com migration ou plano (R4).
**Pronto:** PR de teste com 60 arquivos reprova sem o label
**Origem:** A5-46, A5-47, A5-17

#### P200-E186 · [C] · P1 · Aprovar ou matar o protocolo multiagente
**Arquivo:** `docs/PROTOCOLO_MULTIAGENTE_2026-08-29.md`
**Fazer:** "v0.1 RASCUNHO, aguardando [VALIDAÇÃO PO]", 1 único commit (`87028e01a`, 2026-08-30), 47 dias parado. É a **única** regra de ownership entre os 6 agentes que escrevem neste repositório, e rascunho é pior que nada: ninguém segue e todos podem alegar que seguiram. Perguntar ao PO: *"Aprovo esse protocolo como regra ou apago o arquivo?"*
**Pronto:** o arquivo não contém mais "RASCUNHO" nem "aguardando", **ou** foi removido
**Origem:** A5-34

#### P200-E187 · [A] · P1 · Expirar ou abandonar o ledger de reservas
**Arquivo:** `docs/coordenacao/reservas-ativas.md`
**Fazer:** último commit 2026-09-27, listando 11 reservas com TTL de 48h e início entre 22 e 27/09 **como ativas** — e zero reservas nos 110 commits de 14–15/10, que é justamente quando mais agentes escreveram em paralelo. Das 11 reservas, **todas** são do agente `Codex`: Claude e Devin nunca usaram o protocolo. Pela R9: expirar por script no CI (reserva com TTL vencido sai da lista automaticamente) e fazer a reserva ser campo obrigatório do PR — o campo já existe no template e não é preenchido — **ou** apagar o arquivo e dizer que não há protocolo de reserva.
**Pronto:** nenhuma reserva com TTL vencido aparece como ativa, **ou** o arquivo não existe
**Origem:** A5-36, A5-37

#### P200-E188 · [A] · P1 · Ligar o ledger de conflitos a um gate
**Arquivo:** `docs/coordenacao/conflitos-semanticos.md`
**Fazer:** a seção "Registros" é literalmente `_(vazio)_`, último commit 2026-08-30, com **7 resoluções de conflito e 10+ reverts na janela** — metade dos reverts restaurando proteção de CI que o próprio time removeu. O ledger exigido pela REGRA #3 §4 nunca recebeu um único registro. Gate: commit com 2 pais e conflito resolvido, ou assunto `merge(pr-...)`, exige linha nova no arquivo. Todo revert também. E exigir o formato `merge(pr-NNN): resolve conflitos — …` que a REGRA #3 define e só `46d36b6d6` usou.
**Pronto:** merge com conflito sem linha no ledger reprova o CI
**Origem:** A5-35, A5-20, A5-49

#### P200-E189 · [A] · P1 · Proibir merge entre branches de agentes diferentes fora de PR
**Arquivo:** `CLAUDE.md`, `scripts/sentinel-check.sh`
**Fazer:** `9ffb69651` e `bd59a447d` (2026-08-31) mergearam uma branch do Claude e uma do Codex **dentro** de outra branch do Codex, sem PR e sem registro. Escrever a proibição no `CLAUDE.md` e fazer o sentinel recusar merge commit cujos dois pais vêm de branches de prefixos de agente diferentes sem PR.
**Pronto:** o sentinel recusa um merge cross-agente de teste sem referência de PR
**Origem:** A5-33

#### P200-E190 · [A] · P1 · Regra R9 do padrão E12: varredura mecânica exige execução
**Arquivo:** `docs/ci/PADRAO_WORKFLOW.md`, `scripts/check-workflow-contracts.mjs`
**Fazer:** escrever no padrão E12 o que a R8 deste plano determina, e implementar como contrato: mudança em mais de 10 workflows no mesmo commit exige execução do workflow alterado no mesmo PR. E a ordem: deleção/consolidação **antes** de hardening no mesmo arquivo. O padrão "editar N workflows → fix imediato" repetiu em 3 ondas independentes na janela (`202f76148` 120 workflows → `7e74a8734`; `6b880a059` 83 → `a79944b53`; `64a75418c` 101 → 5 commits de correção em 28h). E tratar mais de 5 `fix(ci)` por mês como incidente de processo, não como trabalho normal — foram 35 na janela.
**Pronto:** `docs/ci/PADRAO_WORKFLOW.md` documenta R9/R10 e o contrato correspondente existe em `check-workflow-contracts.mjs`
**Origem:** A5-14, A5-15, A5-16, A5-13

> **PORTÃO DA ONDA 18:** ≥8 de 10. E181 e E182 são trilha C e não bloqueiam as outras 8.

---

### ONDA 19 — DOCUMENTAÇÃO QUE INDUZ ERRO (E191–E200)

442 arquivos `.md` em `docs/`, 187 (42%) com data no nome, e uma amostra de 25 `AUDITORIA*`/`E*.md` com **um único commit cada** — escritos uma vez, nunca revisitados. O problema não é volume: é que o documento que todo agente lê ao iniciar contém erros.

#### P200-E191 · [A] · P1 · Gerar a tabela de gates por script ✅
**Arquivo:** `CLAUDE.md:342-345`, `.github/workflows/deploy-gates.yml:7-33`
**Fazer:** a tabela de gates do `CLAUDE.md` — o documento que todo agente lê ao iniciar a sessão — **duplica o Gate 1.13** (linhas 342 e 344, mesmo gate com dois textos, com o 1.14 encravado entre as duas) e **omite os Gates 1.15 e 1.16**, criados no mesmo commit E15 que ela cita. O cabeçalho do YAML, por sua vez, omite o Gate 1.6 (bundle size, que está no job `build`), o 1.15 e o 1.16, diz "1.10 advisory" quando o step é bloqueante desde o E15, e diz "C10–C24" onde o `CLAUDE.md` diz "C10–C23" e o script implementa C1–C24. A numeração é mantida à mão em 3 lugares sem nenhum gate de consistência — e 3 commits de "fix de comentário" (`1ab295e5c`, `84f81b63f`, `1aa1792ca`) não resolveram. Gerar o índice a partir dos `name:` dos steps e reprovar o CI quando os 3 divergirem.
**Pronto:** `node scripts/check-gates-table.mjs` sai `0` e reprova ao se remover um gate do YAML sem atualizar o `CLAUDE.md`
**Origem:** A5-51, A1-14, A1-15, A1-49, A1-50, A1-51

#### P200-E192 · [A] · P2 · Deixar claro o que é job e o que é step ✅
**Arquivo:** `CLAUDE.md` (seção CI), `.github/workflows/deploy-gates.yml`
**Fazer:** `deploy-gates.yml` tem 13 jobs com `name:`, mas os "Gates 1.1 a 1.16" são **steps dentro** do job "Gate 1" — a tabela faz 20 gates parecerem checks independentes, quando no GitHub eles são invisíveis. Explicitar a distinção na tabela, ou promover os bloqueantes a jobs. Depende de E162, que já quebra o job em 3.
**Pronto:** a tabela do `CLAUDE.md` marca cada linha como job ou step, batendo com o YAML
**Origem:** A5-52, A1-13

#### P200-E193 · [A] · P2 · Unificar os limites de timeout e a regra de nome de job ✅
**Arquivo:** `CLAUDE.md` (R3), `docs/ci/_template.yml.example` (R8), `docs/ci/PADRAO_WORKFLOW.md:49-63,156-164`
**Fazer:** três versões conflitantes dos limites de timeout: `CLAUDE.md` e o template dizem "gates ≤10, E2E ≤30, crons ≤60"; a tabela E24 do `PADRAO_WORKFLOW` diz "Estático ≤5 / Unitário ≤10 / E2E leg ≤20 / Full ≤60". Alinhar à tabela E24, que é a mais recente. E a R8 exige job id em `snake_case`, mas a contagem real nos 127 arquivos é **144 ids kebab-case contra 16 snake_case** e 68 de palavra única — e o `check-workflow-contracts.mjs` nem implementa R8. O `deploy-gates.yml` usa kebab nos 13 jobs. Reescrever a R8 para aceitar kebab-case (a convenção de fato) e implementar o check, enfatizando o que importa de verdade: a **estabilidade** do id, porque mudá-lo quebra required checks em silêncio.
**Pronto:** os 3 arquivos citam os mesmos limites; a R8 descreve kebab-case e tem check implementado
**Origem:** A1-52, A1-53

#### P200-E194 · [A] · P1 · Inventário de segredos cobrindo as edge functions ✅
**Arquivo:** `docs/ci/SEGREDOS.md:19,21,22`, `scripts/check-secrets-inventory.mjs`
**Fazer:** duas lacunas. A SSOT cita `ci.yml` como consumidor de `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` e `SUPABASE_URL` — arquivo renomeado para `ci-security-drift.yml` no E15, e o gate valida segredo→doc mas nunca doc→workflow existente. E mais grave: o Gate 1.14 valida só `secrets.*`/`vars.*` de workflows, então **35 dos 44 `Deno.env.get()` das edge functions não têm dono, escopo nem rotação documentados em lugar nenhum** — entre eles `ADMIN_BATCH_TOKEN`, `WEBHOOK_DISPATCHER_SECRET`, `TURNSTILE_SECRET_KEY`, `CF_ORIGIN_SECRET`, `CSRF_SECRET`, `SIMULATION_BYPASS_KEY`, `MAGAZINE_IP_SALT` e `EXTERNAL_*_SERVICE_ROLE_KEY`. Corrigir as 3 linhas, estender o script para varrer `Deno.env.get` em `supabase/functions/`, criar a seção "Segredos de Edge Function" e acrescentar a validação inversa (todo `.yml` citado deve existir).
**Pronto:** `node scripts/check-secrets-inventory.mjs --gate` sai `0` cobrindo os 44 `Deno.env.get` e reprova um `.yml` inexistente citado na doc
**Origem:** A1-46, A4-34

#### P200-E195 · [A] · P2 · Apagar as referências mortas ✅
**Arquivo:** `.github/workflows/deploy-gates.yml:225`, `prod-health.yml:151`, `.lovableignore`, `CLAUDE.md` (REGRA #3 §3)
**Fazer:** quatro ponteiros para coisas que não existem. (1) `deploy-gates.yml:225` diz "aqui e no quality-gate.yml (2.3.5/2.3.6)" enquanto a linha 263 do **mesmo arquivo** diz "quality-gate.yml (agora removido)" — contradição interna. (2) `prod-health.yml:151` instrui, num runbook de incidente de produção, "Verificar se o Gate 0 do quality-gate passou no PR anterior" — orientação operacional morta; trocar por `deploy-gates.yml`. (3) `.lovableignore` lista `.github/workflows/quality-gate.yml`, apagado em `eb2d7aec2`; remover e varrer o arquivo por paths inexistentes num gate. (4) A REGRA #3 §3 do `CLAUDE.md` usa `envPointsToForbidden` como exemplo canônico de "nunca classifique como dead code sem verificar" — e `grep -rn envPointsToForbidden src/ scripts/ supabase/functions/` devolve **0**: a função não existe. Trocar por `validateEnv`/`guard-canonical-project.mjs`, ou remover a linha. O exemplo que ensina a não apagar código vivo não pode apontar para código que não existe.
**Pronto:** `grep -rc "quality-gate.yml" .github/ .lovableignore` → `0` e `grep -c envPointsToForbidden CLAUDE.md` → `0`
**Origem:** A1-47, A1-48, A5-30, A5-24

#### P200-E196 · [A] · P1 · Proteger a classe "arquivo gerado", não o arquivo após o incidente ✅
**Arquivo:** `.lovableignore`, `scripts/check-generated-files-protected.mjs` (novo)
**Fazer:** `types.ts` foi destruído **duas vezes**: em `7716ae9` (2026-07-16, incidente da REGRA #4) e de novo dentro desta janela, em `ad3ef0351` e `23d4b3ff1` (2026-08-31), caindo de 63.167 para 8.223 linhas — menos 60.726 linhas cada, com as mensagens "Work in progress" e "Update plan". O arquivo só entrou no `.lovableignore` em `1c2aa28af` (2026-09-27): **27 dias após a reincidência e 2,5 meses após a primeira vez**. E o Gate 1.2, que o detectaria, nasceu em `33475f483` (2026-09-17), 17 dias **depois** da reincidência. O padrão é consistente: a proteção chega depois do incidente, nomeando o arquivo específico. Proteger a **classe**: todo arquivo gerado (`types.ts`, baselines, snapshots, `cors-snapshot.json`) entra no `.lovableignore` e num gate que reprova redução de mais de 20% de linhas sem label. Nota de método: `.lovableignore` **não é barreira** — o bot tocou `client.ts` depois de `fa6ee116b` protegê-lo, no mesmo dia; o gate é a defesa real.
Acrescentar também um workflow que anote o commit do bot com um resumo do diff, ou abra issue quando ele tocar arquivo protegido: 100% das mensagens do Lovable são não-descritivas (`Changes` ×30+, `Work in progress`, `Update plan`, `Visual edit in Lovable`), então auditar o que ele fez exige abrir o diff à mão — foi assim que a destruição de `types.ts` passou duas vezes.
**Pronto:** o gate reprova uma redução de 30% em `types.ts` sem label; todos os arquivos gerados estão no `.lovableignore`; commit do bot em arquivo protegido gera issue
**Origem:** A5-25, A5-26, A5-27, A5-21, A5-32

#### P200-E197 · [A] · P2 · Baratear a governança por recibo ✅
**Arquivo:** `.github/workflows/` (os que abrem PR de recibo)
**Fazer:** 41 commits de `github-actions` na janela, a maioria recibos E15/E66, com 10 PRs de recibo em um único dia (#2062–#2071); e um PR só de documentação dispara 68 runs em 21 workflows. A governança por recibo-em-PR está certa na intenção e caríssima na execução. Agregar os recibos num PR diário e acrescentar `paths-ignore` para mudanças só de documentação.
**Pronto:** PR só de `docs/` dispara ≤10 workflows; os recibos do dia entram num PR só
**Origem:** A5-48, A1-26

#### P200-E198 · [A] · P2 · Usar o template de postmortem ✅
**Arquivo:** `docs/postmortems/`, `POSMORTEM_COMMITS_LOCAIS_2026-09-17.md` (raiz), `POSTMORTEM_TEMPLATE.md`
**Fazer:** `docs/postmortems/` contém **apenas** `_TEMPLATE.md` — zero postmortems arquivados, inclusive para o incidente de produção de 2026-10-13 (que gerou as PRs #2141–#2145) e para a destruição de `types.ts` em 31/08. E há duas grafias ("POSMORTEM"/"POSTMORTEM") em três locais para a mesma coisa. Um local, uma grafia, um template; e postmortem obrigatório para todo incidente que gere 2+ PRs no mesmo dia. Escrever os 2 postmortems em atraso, com o que os documentos de incidente já registram.
**Pronto:** `ls docs/postmortems/*.md | wc -l` ≥ 3 e não existe arquivo de postmortem fora do diretório
**Origem:** A5-42, A5-43

#### P200-E199 · [A] · P2 · Separar documento vivo de arquivo morto ✅
**Arquivo:** `docs/` (442 `.md`), `docs/vivos/`, `docs/arquivo/<ano-mes>/`
**Fazer:** 187 dos 442 têm data no nome e a amostra mostra um commit cada — relatórios escritos uma vez. Pior: a própria auditoria de 2026-10-11 §8 catalogou **11 contradições** que induzem erro (ADR 0001 "Accepted" com bridge retornando 410; `medallion/README` mandando rodar camada removida; PLANO-20-ETAPAS registrando 11/20 contra 19/20; RBAC_MATRIX 108 contra 110; design-system-audit "15/15" com 3 revertidas) e **nenhuma foi corrigida desde então**. E `docs/RUNBOOK.md`, que define SLA e fluxo de ownership, tem último commit em 2026-05-25 — 5 meses defasado num repositório que trocou de processo 3 vezes. Mover o datado para `docs/arquivo/<ano-mes>/`, manter em `docs/` só documento vivo com dono e data de revisão, corrigir as 11 contradições (uma por commit, com o comando de verificação), e marcar o `RUNBOOK.md` como revisado ou `[DESATUALIZADO]` no topo. Arquivar também os 2 planos em 0% (`PLANO_PENDENCIAS...2026-08-29`, 47 dias; `KIT_MAKER_PLANO_CORRECOES...2026-09-27`).
**Pronto:** `ls docs/*.md | wc -l` ≤ 40; as 11 contradições fechadas; os 2 planos em `docs/plans/arquivados/`
**Origem:** A5-50, A5-54, A5-53, A5-03, A5-04

#### P200-E200 · [A] · P1 · Registro único de dívida crônica, on-call e release ✅
**Arquivo:** `docs/DIVIDA_CRONICA.md` (novo, único `.md` novo autorizado por este plano), `docs/ONCALL.md`, `docs/RELEASE.md`
**Fazer:** três buracos de cobertura, medidos. (1) **Dívida crônica:** 10 temas reaparecem plano após plano sem fechar — "conta de teste E2E" aparece em **8 planos** desde 2026-09-09 (e é um segredo, não um projeto); "lockfile duplo" em 8 documentos; "staging inexistente" desde 2026-08-26. Esses itens não pertencem a plano numerado nenhum: criar um registro único, fora de plano, com dono e data de revisão por item. (2) **On-call:** `docs/ONCALL.md` não existe; criar com 2 nomes e a rotação. (3) **Release:** `docs/RELEASE.md` não existe, e `git tag` devolve vazio neste clone embora o CHANGELOG registre releases 1.0.x e 1.1.0 — confirmar com `git fetch --tags` se as tags existem no remoto e, se não existirem, religar a criação de tag no release-please. Escrever a política apontando para o release-please em vez de descrever o processo à mão.
**Pronto:** os 3 arquivos existem com conteúdo real (dono nomeado, não "a definir"); `git ls-remote --tags origin | wc -l` > 0
**Origem:** A5-05, A5-06, A5-59, A5-60

> **PORTÃO FINAL:** ≥8 de 10. Depois de E200, rode `npm run plan:status` e escreva o placar final em `docs/arquivo/2026-10/`.

---

## §5 — RASTREABILIDADE: ACHADO → ETAPA

Todo achado das 5 auditorias tem destino. A tabela permite ir do achado para a etapa e vice-versa; nenhum achado foi descartado em silêncio.

| Auditoria | Achados | Com etapa | Cobertos por regra ou sem ação |
|---|---:|---:|---|
| Coordenação (config ao vivo) | 10 | 10 | — |
| CI/CD e workflows | 55 | 55 | — |
| Banco, migrations e RLS | 52 | 52 | — |
| Frontend e TypeScript | 53 | 53 | — |
| Edge functions e segurança | 54 | 54 | — |
| Histórico e processo | 61 | 51 | A5-02, A5-09, A5-10, A5-12 (regras R2/R3/R6) · A5-29 (Onda 0 inteira) · A5-22, A5-23, A5-28, A5-40, A5-61 (nada a fazer — ver §1) |
| **Total** | **285** | **275** | **10** |

### Mapa completo

**Coordenação (config ao vivo)**  
C-01 → E005/E181 · C-02 → E005 · C-03 → E006 · C-04 → E009 · C-05 → E006 · C-06 → E176 · C-07 → E004 · C-08 → E003/E172 · C-09 → E001/E002 · C-10 → E106

**CI/CD e workflows**  
A1-01 → E007 · A1-02 → E008 · A1-03 → E011 · A1-04 → E012 · A1-05 → E013 · A1-06 → E017 · A1-07 → E171 · A1-08 → E172 · A1-09 → E173 · A1-10 → E016 · A1-11 → E170 · A1-12 → E170 · A1-13 → E162/E192 · A1-14 → E191 · A1-15 → E007/E191 · A1-16 → E015 · A1-17 → E175 · A1-18 → E176 · A1-19 → E177 · A1-20 → E177 · A1-21 → E177 · A1-22 → E178 · A1-23 → E174 · A1-24 → E179 · A1-25 → E180 · A1-26 → E161/E197 · A1-27 → E116 · A1-28 → E162 · A1-29 → E163 · A1-30 → E164 · A1-31 → E158 · A1-32 → E152 · A1-33 → E151 · A1-34 → E153 · A1-35 → E154 · A1-36 → E155 · A1-37 → E156 · A1-38 → E165 · A1-39 → E166 · A1-40 → E166 · A1-41 → E167 · A1-42 → E167 · A1-43 → E168 · A1-44 → E159 · A1-45 → E157 · A1-46 → E194 · A1-47 → E195 · A1-48 → E195 · A1-49 → E191 · A1-50 → E191 · A1-51 → E191 · A1-52 → E193 · A1-53 → E193 · A1-54 → E169 · A1-55 → E160

**Banco, migrations e RLS**  
A2-01 → E033 · A2-02 → E031/E032/E034 · A2-03 → E071 · A2-04 → E040 · A2-05 → E035 · A2-06 → E036 · A2-07 → E037 · A2-08 → E038 · A2-09 → E039 · A2-10 → E008 · A2-11 → E044 · A2-12 → E041 · A2-13 → E042/E043 · A2-14 → E045 · A2-15 → E046 · A2-16 → E050 · A2-17 → E080 · A2-18 → E014 · A2-19 → E051 · A2-20 → E052 · A2-21 → E054/E055 · A2-22 → E056 · A2-23 → E053 · A2-24 → E057 · A2-25 → E058 · A2-26 → E059 · A2-27 → E061 · A2-28 → E062 · A2-29 → E063 · A2-30 → E064 · A2-31 → E075 · A2-32 → E076 · A2-33 → E073/E074 · A2-34 → E072 · A2-35 → E038 · A2-36 → E038 · A2-37 → E077 · A2-38 → E048 · A2-39 → E049 · A2-40 → E047 · A2-41 → E008 · A2-42 → E079 · A2-43 → E068 · A2-44 → E068 · A2-45 → E069 · A2-46 → E066 · A2-47 → E067 · A2-48 → E065 · A2-49 → E070 · A2-50 → E070 · A2-51 → E078 · A2-52 → E060

**Frontend e TypeScript**  
A3-01 → E101 · A3-02 → E110 · A3-03 → E102 · A3-04 → E111 · A3-05 → E114 · A3-06 → E117 · A3-07 → E112 · A3-08 → E113 · A3-09 → E113 · A3-10 → E113 · A3-11 → E107 · A3-12 → E116 · A3-13 → E108 · A3-14 → E109 · A3-15 → E131 · A3-16 → E121 · A3-17 → E122/E124 · A3-18 → E122 · A3-19 → E123 · A3-20 → E106 · A3-21 → E141 · A3-22 → E142 · A3-23 → E103 · A3-24 → E104 · A3-25 → E105 · A3-26 → E115 · A3-27 → E119 · A3-28 → E143 · A3-29 → E144 · A3-30 → E132 · A3-31 → E133 · A3-32 → E134 · A3-33 → E136 · A3-34 → E137 · A3-35 → E138/E140 · A3-36 → E139 · A3-37 → E118 · A3-38 → E145 · A3-39 → E147/E148 · A3-40 → E126/E130 · A3-41 → E126/E128 · A3-42 → E126 · A3-43 → E125 · A3-44 → E135 · A3-45 → E146 · A3-46 → E129 · A3-47 → E150 · A3-48 → E150 · A3-49 → E150 · A3-50 → E149 · A3-51 → E120 · A3-52 → E149 · A3-53 → E127

**Edge functions e segurança**  
A4-01 → E001/E002 · A4-02 → E021 · A4-03 → E021 · A4-04 → E022 · A4-05 → E024 · A4-06 → E024 · A4-07 → E025 · A4-08 → E026 · A4-09 → E027 · A4-10 → E081 · A4-11 → E082 · A4-12 → E085 · A4-13 → E086 · A4-14 → E087 · A4-15 → E019 · A4-16 → E020 · A4-17 → E020 · A4-18 → E020 · A4-19 → E028 · A4-20 → E029 · A4-21 → E090 · A4-22 → E090 · A4-23 → E089 · A4-24 → E089 · A4-25 → E018 · A4-26 → E018 · A4-27 → E091 · A4-28 → E092 · A4-29 → E030 · A4-30 → E030 · A4-31 → E030 · A4-32 → E030 · A4-33 → E093 · A4-34 → E194 · A4-35 → E100 · A4-36 → E083 · A4-37 → E083 · A4-38 → E084 · A4-39 → E099 · A4-40 → E084 · A4-41 → E090 · A4-42 → E090 · A4-43 → E088 · A4-44 → E088 · A4-45 → E094 · A4-46 → E094 · A4-47 → E095 · A4-48 → E030 · A4-49 → E096 · A4-50 → E096 · A4-51 → E097 · A4-52 → E098 · A4-53 → E098 · A4-54 → E023

**Histórico e processo**  
A5-01 → E010 · A5-03 → E199 · A5-04 → E199 · A5-05 → E200 · A5-06 → E200 · A5-07 → E010 · A5-08 → E010 · A5-11 → E005/E181 · A5-13 → E190 · A5-14 → E190 · A5-15 → E190 · A5-16 → E190 · A5-17 → E185 · A5-18 → E184 · A5-19 → E184 · A5-20 → E188 · A5-21 → E196 · A5-24 → E195 · A5-25 → E196 · A5-26 → E196 · A5-27 → E196 · A5-30 → E195 · A5-31 → E183 · A5-32 → E196 · A5-33 → E189 · A5-34 → E186 · A5-35 → E188 · A5-36 → E187 · A5-37 → E187 · A5-38 → E183 · A5-39 → E181 · A5-41 → E005/E009 · A5-42 → E198 · A5-43 → E198 · A5-44 → E054/E055 · A5-45 → E080 · A5-46 → E185 · A5-47 → E185 · A5-48 → E197 · A5-49 → E188 · A5-50 → E199 · A5-51 → E191 · A5-52 → E192 · A5-53 → E199 · A5-54 → E199 · A5-55 → E009/E181 · A5-56 → E182 · A5-57 → E182 · A5-58 → E182 · A5-59 → E200 · A5-60 → E200

---

## §6 — O QUE FICOU DELIBERADAMENTE DE FORA

Um plano que não declara o que não fez convida o executor a inventar escopo.

**Não entrou porque é decisão de negócio, não de engenharia:**
- Tornar o repositório privado. O vazamento da `service_role` (E001) é consumado: o commit `b5e044f45` está no histórico público e permanece lá depois de qualquer correção de código. Fechar o repositório reduz exposição futura, não a passada, e é decisão do PO — não uma etapa.
- Criar ou contratar staging. "Staging inexistente" aparece em documentos desde 2026-08-26 e é citado como causa em vários planos. É custo de infraestrutura recorrente, então entra no registro de dívida crônica de E200, não como etapa executável.
- Reduzir o número de agentes de IA escrevendo na mesma `main`. Seis agentes num repositório com um CODEOWNER é um problema de organização, não de configuração. E181 a E190 reduzem o dano; a decisão de consolidar é do PO.

**Não entrou porque o custo supera o benefício medido:**
- Backfillar cabeçalho de rollback nas 81 migrations antigas (A2-29). E063 exige rollback só para migrations novas: reescrever o passado produz comentário que ninguém executa, que é exatamente o problema atual.
- Zerar os 836 erros de TypeScript em `tests/` (A3-06). E117 trava o número e cria baseline descendente. Zerar de uma vez seria a varredura mecânica que a R8 proíbe.
- Corrigir os 520 `Label` sem `htmlFor` de uma vez (A3-35). E138 e E140 fazem gate + os 10 formulários de maior uso. O resto drena pelo gate.
- Migrar os 271 imports estáticos de `client.ts` (A3-22). E142 deixa a escolha explícita entre migrar e deletar a abstração — porque manter as duas é o único cenário que custa sem entregar.
- Remover os 116 arquivos sem import de uma vez (A3-39). E148 exige verificação individual: `grep` de import não enxerga import dinâmico, rota lazy nem referência por string.

**Não entrou porque já está correto** (ver §1, "o que está certo e não deve ser mexido"): SSOT do `client.ts`, os 5 campos do `Product`, as 8 tabelas da REGRA #4, a conformidade sintática R1/R2/R4/R5/R7 dos 127 workflows, a infra de autorização de `_shared/`, o template de PR e o `CONTRIBUTING`, e o registro de incidentes do Lovable no `CLAUDE.md` — cujos 7 hashes todos resolvem no repositório e que é o maior ativo de processo daqui.

**Não entrou porque é consequência, não causa:** nenhuma etapa deste plano adiciona um gate novo a um workflow que ainda não fecha verde. Foi o que os 20 planos anteriores fizeram, e é por isso que 1.387 etapas renderam 409.

---

## §7 — RESUMO EXECUTIVO

| | |
|---|---|
| **Etapas** | 200 (`P200-E001` a `P200-E200`), em 20 ondas de 10 |
| **Prioridade** | 34 P0 · 98 P1 · 62 P2 · 6 P3 |
| **Trilhas** | A 127 (executor sozinho) · D 50 (executor, frontend) · B 11 (precisa secret/dispatch) · C 12 (precisa o PO) |
| **Achados de origem** | 285, de 5 auditorias paralelas + verificação da configuração ao vivo |
| **Bloqueante** | Onda 0 (E001–E010). Sem ela, as outras 19 entregam zero. |
| **Checkpoints** | E050, E100, E150 — para **cortar** escopo, não acelerar |

### As 12 etapas que dependem do PO

Se nenhuma outra coisa deste plano for lida, que seja esta lista. Elas não podem ser executadas por agente nenhum:

| Etapa | O que pedir |
|---|---|
| **E001** | Rotar a `service_role` de produção — está commitada em repositório público e vale até 2036 |
| **E005** | Remover o `bypass_actors` do ruleset e exigir 1 aprovação |
| **E006** | Apagar a branch protection clássica e o ruleset duplicado |
| **E021** | Deletar a edge function `load-test` do canônico, ou autorizar o hardening |
| **E046** | Aplicar ou arquivar a migration de negação explícita de RLS |
| **E053** | Aprovar o registro das 179 migrations fora do ledger |
| **E071** | Confirmar PITR, retenção, último backup e RPO |
| **E080** | Decidir o destino das 14 tabelas de backup vivas mas removidas do `types.ts` |
| **E098** | Autorizar (ou não) mover o enforcement de login para Auth Hook |
| **E181** | Exigir PR para `.github/**` sem bypass de admin |
| **E182** | Nomear um segundo CODEOWNER |
| **E186** | Aprovar ou apagar o protocolo multiagente, parado em rascunho há 47 dias |

### Onde o plano começa

`P200-E001`. Não `P200-E002`.

---

*Auditoria conduzida em 2026-10-18 sobre `d6cdb442a`. 5 agentes especializados em paralelo, 285 achados, configuração ao vivo do GitHub verificada pela API. Relatórios completos por auditoria em `docs/arquivo/2026-10/` quando commitados; este documento é autossuficiente.*
