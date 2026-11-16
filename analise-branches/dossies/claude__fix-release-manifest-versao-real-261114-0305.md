# origin/claude/fix-release-manifest-versao-real-261114-0305

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** conserta o contador de versao do sistema, que hoje diz "1.1.0" quando a versao real ja publicada e a 1.8.1 — enquanto isso, toda tentativa de publicar uma versao nova falha.
- **Tip / merge-base / main:** tip `b8d025f7647f5b21c0a67311787b1dd9ea8ae196` · merge-base `c49e8e770b922e52f8c177ac3f3e41b4dba87700` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c` (2026-11-15)

## O que a branch quis fazer

Um unico commit (`b8d025f764`, 2026-11-14). Diagnostico do agente, na propria mensagem do commit:

1. O numero de versao do projeto **regrediu**: o manifesto (`.release-please-manifest.json`) e o `package.json` voltaram para `1.1.0` no commit `bcba4c29a0` ("chore(main): release 1.1.0"), apesar de a tag `v1.8.1` (`87fe8cd9b7`) ja existir no main.
2. Causa-raiz apontada: `.github/workflows/release-please.yml` passa o input `release-type: node` para a `release-please-action@v5`. Com esse input a action ignora `release-please-config.json` e `.release-please-manifest.json` e recalcula a versao so pelas PRs de release mergeadas — por isso reabre eternamente "release 1.2.0" (PRs #3503, #3524, #3566), versao cuja tag ja existe, e todo merge de Release PR quebra com `already_exists`.
3. Correcao aplicada pela branch: remover a linha `release-type: node` do workflow (o `release-please-config.json` ja declara `"release-type": "node"`) e realinhar `.release-please-manifest.json`, `package.json` e `package-lock.json` em `1.8.1`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Remover o input `release-type: node` do workflow | **NAO ESTA** — a linha continua no main | `git show origin/main:.github/workflows/release-please.yml` ultima linha: `          release-type: node` (linha 36, apos `token: ${{ secrets.RELEASE_PLEASE_TOKEN \|\| secrets.GITHUB_TOKEN }}`) |
| Manifesto de versao de volta em `1.8.1` | **NAO ESTA** — main esta em `1.1.0` | `git show origin/main:.release-please-manifest.json` → `{ ".": "1.1.0" }` |
| `package.json` em `1.8.1` | **NAO ESTA** — main esta em `1.1.0` | `git show origin/main:package.json` linha 4: `"version": "1.1.0"` |
| `package-lock.json` em `1.8.1` | **NAO ESTA** — main esta em `1.1.0` (duas ocorrencias) | diff (B) do pacote: main tem `"version": "1.1.0"` nas linhas 3 e 9 do lock |
| A premissa do diagnostico (config ja declara o tipo) | **confirmada no main** | `git show origin/main:release-please-config.json` → `"release-type": "node"` |
| A regressao de versao que a branch quis consertar | **confirmada e ainda viva no main** | `git log origin/main -- .release-please-manifest.json`: `87fe8cd9b7` 1.8.0→**1.8.1** (08/11) · `5a4ad7211d` "release 1.9.0 (#3210)" escreveu **1.8.1→1.0.0** (13/11) · `bcba4c29a0` "release 1.1.0" escreveu **1.0.0→1.1.0** (13/11). Tags existentes vao de `v1.0.0` a `v1.8.1` (`git tag --list 'v1*'`), e `git show v1.8.1:.release-please-manifest.json` → `"1.8.1"` |
| Nunca houve PR desta branch | confirmado | `gh api "repos/adm01-debug/Promo_Gifts_V4/pulls?state=all&head=adm01-debug:claude/fix-release-manifest-versao-real-261114-0305"` → vazio (nenhuma PR, nem aberta nem fechada) |
| O proprio repo reconhece o defeito como aberto | sim, em documento de plano no main | `docs/faxina-261114/05-plano-workflows.md:81` ("Produto quebrado: manifest 1.1.0 vs tags até v1.8.1; merges falham `already_exists`"), `:773` e `:1130` |

Conclusao factual: **nada do que esta branch fez entrou no main**. Nao e defasagem nem refatoracao: os quatro arquivos no main continuam exatamente no estado anterior ao da branch, e o defeito que ela atacou continua ativo.

## A resgatar

Existe conteudo proprio e util, 100% fora do main. Porem o resgate **nao pode ser o diff da branch inteiro**, porque o main andou nesses mesmos arquivos por outros motivos (ver "Risco"). O resgate correto e cirurgico:

1. `.github/workflows/release-please.yml` — remover a linha `release-type: node` (linha 36). **Por que importa:** e a causa-raiz apontada; sem isso o robo de release continua ignorando o manifesto e reabrindo uma versao que ja existe. **Porta-se como mudanca de workflow → Git 7/Git 10: PR fica aberta e chama o dono.**
2. `.release-please-manifest.json` — `"."` de `1.1.0` para `1.8.1`. **Por que importa:** e o numero que o robo usa para decidir a proxima versao; errado, nenhuma publicacao fecha.
3. `package.json` — `"version"` de `1.1.0` para `1.8.1`, **somente essa linha** (a linha 4). **Por que importa:** e a versao que o sistema reporta; hoje diz menos do que o que ja esta no ar.
4. `package-lock.json` — `"version"` de `1.1.0` para `1.8.1` nas duas ocorrencias do topo, **somente elas**. **Por que importa:** o guarda `scripts/check-lockfile-sync.mjs` compara `package.json` com o lock; mexer em um sem o outro derruba a CI.

Item adicional que a branch **nao** cobriu e que o resgate precisa decidir junto: o `CHANGELOG.md` do main tambem foi contaminado pelas duas "releases" falsas — tem secoes `## [1.1.0] ... (2026-11-13)` (linha 8) e `## 1.0.0 (2026-11-13)` (linha 263) **acima** de `## [1.8.1] ... (2026-11-08)` (linha 519). Trocar so o manifesto deixa o historico de versoes publicado fora de ordem.

## Risco de fechar esta branch

Fechar sem resgatar **nao causa perda de funcionalidade para o cliente** — nada aqui aparece na loja ou no painel. O que se perde e o diagnostico: a causa-raiz exata de por que o sistema de publicacao de versoes esta travado. Consequencias de deixar como esta:

- O sistema continua se identificando como "1.1.0" quando o que esta no ar e a 1.8.1. Qualquer conversa sobre "qual versao esta em producao" fica sem resposta confiavel.
- Toda tentativa automatica de fechar uma versao nova falha (colisao com tag ja existente), e as PRs de release (#3503, #3524, #3566) ficam se acumulando abertas e inuteis.
- O historico de mudancas (CHANGELOG) continua fora de ordem, com duas versoes inventadas na frente das reais.

Risco de **aplicar** o resgate (motivo do veredito DECISAO_HUMANA, nao RESGATAR_PARCIAL direto):

- Mexe em arquivo de workflow (`.github/**`), que por regra do repo (AGENTS.md, Git 7 e Git 10) nao se mergeia sozinho: PR fica aberta e chama o dono.
- Existe uma **segunda solucao valida e documentada no proprio repo** que contradiz em parte a desta branch: `docs/faxina-261114/05-plano-workflows.md:773-776` propoe corrigir o manifesto para 1.8.1 **ou** usar `bootstrap-sha`/`last-release-sha` = `87fe8cd9b7`, trocar `on: push(main)` por `schedule` + `workflow_dispatch` e **criar o segredo novo `RELEASE_PLEASE_TOKEN`** (segredo novo = Git 7, decisao do dono). Escolher entre os dois caminhos e decisao de dono, nao de agente.
- Qual numero adotar como "versao real" (1.8.1, ou pular para 1.9.0 ja que existe um commit "release 1.9.0" no main sem tag correspondente) tem efeito no que o cliente/parceiro ve como versao do produto — e escolha de negocio.
- Aplicar o diff da branch como esta **regrediria o main**: no `package.json` a branch e mais antiga e sobrescreveria `framer-motion ^14.11.1` → `^14.10.0`, apagaria o override `"braces": ">=3.0.3"` (patch de seguranca) e apagaria ~20 testes de mockup adicionados ao script `test:ci-core`; no `package-lock.json`, reverteria `framer-motion`/`motion-dom` 14.11.1 → 14.10.0 (diffs (B) do pacote de evidencia). Por isso o resgate tem de ser linha a linha, nao cherry-pick/merge.

## Nao verificado

- Se as PRs de release #3503/#3524/#3566 continuam abertas hoje: nao consegui listar PRs por busca — `gh pr list` e qualquer chamada GraphQL retornam `HTTP 403: GitHub GraphQL is not available from Claude Code sessions`. O que esta verificado por REST e apenas que **esta branch nunca teve PR**.
- Se remover `release-type: node` basta, na pratica, para a `release-please-action@v5` passar a ler `release-please-config.json` + manifesto: isso e o comportamento declarado pela action e a leitura do agente autor; **nao foi executado** nesta analise (exigiria rodar o workflow). Afirmacao do commit, nao evidencia minha.
- Os resultados de guarda citados pelo commit original (`check-lockfile-sync.mjs` ok, `check-workflow-contracts --gate` exit 0, `check-required-checks` ok) nao foram reexecutados aqui: a tarefa e somente leitura.
- Arquivos sem leitura por truncamento: 0 (o pacote de evidencia trouxe os 4 arquivos com os dois diffs, sem marca de TRUNCADO).
