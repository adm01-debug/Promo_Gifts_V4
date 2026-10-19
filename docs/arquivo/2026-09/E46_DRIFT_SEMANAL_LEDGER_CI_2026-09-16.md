# E46 — Drift check live semanal + comparação ledger ↔ arquivos no CI

> Etapa E46 de `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`
> (Fase 6 — Observabilidade e governança contínua). Executada em 2026-09-16.
> Escopo `[GIT]` — só arquivos versionados (workflow, script, docs). Nenhuma
> escrita no Supabase, nenhuma DDL, nenhum `git add`/`git commit` feito por
> esta etapa (working tree deixado como está para revisão humana).

## Problema

O drift check existente (`.github/workflows/db-schema-drift-check.yml`, desde
o PR #1864) só roda quando alguém dispara manualmente ou no cron diário — e é
**fail-closed** por depender de `supabase db diff --linked --schema public`,
que faz replay de todas as ~2.988 migrations locais contra um shadow DB. A E02
confirmou que esse replay **trava** nesta base (DDL out-of-band histórica
quebra a sequência).

**Correção sobre uma "evidência adicional" que este documento chegou a citar
numa versão anterior:** cheguei a apontar `gh run list` no workflow
`schema-snapshot-export.yml` mostrando uma execução de ~601s (10m01s) com
conclusão `cancelled` como sinal de que o job `export` bateu no
`timeout-minutes: 10` por causa do `db diff`. **Verifiquei o log bruto dessa
execução (`gh run view <id> --log`) nesta revisão e isso está errado**: a
mensagem no log é `The operation was canceled.` (cancelamento explícito, típico
de `concurrency.cancel-in-progress`), não a mensagem que o Actions emite para
timeout de job (`...has exceeded the maximum execution time...`). Os
timestamps confirmam: o job só começou a rodar às 13:48:15 (ficou ~6 min
enfileirado atrás de outra execução no mesmo `concurrency.group`) e foi
cancelado às 13:52:14 — o step "Generate snapshot" rodou só ~3m45s antes do
cancelamento, bem abaixo dos 10 minutos. Os 601s eram tempo de fila + execução
combinados, não o job estourando o timeout. Não encontrei, nas 100 execuções
mais recentes desse workflow, nenhuma com a mensagem de timeout real. Portanto
**não há evidência de CI corroborando o travamento do `db diff` além da E02**
— a E02 continua sendo a única fonte para essa conclusão, e é suficiente por
si só (não precisa dessa corroboração, que não se sustentou).

O manifesto do ledger reconciliado (E06,
`docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json`) também só existe
como artefato local/pontual — nada compara o ledger vivo contra ele
continuamente.

## Decisão de arquitetura

### 1. Onde entra o `schedule:` — `schema-snapshot-export.yml`, não `db-schema-drift-check.yml`

Conforme o texto da E46 e a lição da E02: **não criar um segundo mecanismo
fail-closed que dependa do mesmo `db diff` quebrado.**
`db-schema-drift-check.yml` continua exatamente como está — fail-closed,
manual/diário, sinalizando "não calculável" honestamente (é o comportamento
correto dado o estado atual: se `db diff` trava, o gate deve travar/falhar
visivelmente, não mentir "verde").

O cron semanal (`0 6 * * 1` — segunda 06:00 UTC / 03:00 BRT, literal do texto
da E46) foi adicionado ao `on:` de `schema-snapshot-export.yml`, que já existe
e já sabe gerar `SCHEMA_LIVE.sql` via `supabase db dump` (dump puro,
**sem replay**, portanto imune ao mesmo travamento).

### 2. Mecanismo de diff: git history, não um artefato novo

`supabase/migrations-snapshot/SCHEMA_LIVE.sql` **já é versionado no git**
(commit `b6fab6ee2`, E14) e o próprio `supabase/migrations-snapshot/README.md`
já recomenda esse workaround ("diffe dois `SCHEMA_LIVE.sql` de datas
diferentes em vez de esperar `SCHEMA_DRIFT.sql`"). Construir uma comparação
artefato-contra-artefato (baixar o artifact da semana anterior, etc.) seria
reinventar o que o git já faz de graça e de forma auditável: o job
`weekly-live-drift` sobrescreve o `SCHEMA_LIVE.sql` commitado com a captura de
hoje e roda `git diff --quiet` sobre ele. Se mudou, abre PR — **o diff do
próprio PR é o drift textual**, revisável linha a linha, com histórico
permanente em `git log -- supabase/migrations-snapshot/SCHEMA_LIVE.sql`.
Padrão de PR-a-partir-de-Actions copiado de
`.github/workflows/regenerate-supabase-types.yml` (já usado neste repo, então
já confirmado que PRs criados por Actions são aceitos nas configurações do
repo).

Importante: o job **nunca chama `db diff`**. Só `db dump` (Parte 1) e uma
consulta SQL somente-leitura via Management API (Parte 2, abaixo). Ambos
independentes do replay que trava.

### 3. Comparação ledger ↔ arquivos: script novo, não `npm run ledger:manifest`

O texto da E46 menciona `npm run ledger:manifest` — **esse script não existe**
em `package.json` (confirmado por leitura completa do arquivo). O pipeline
real da E06 é `scripts/build-migration-ledger-manifest.mjs`, mas ele **não é
seguro rodar em CI**: consome um "ledger sanitizado" cujos hashes por
statement foram calculados **dentro do banco** (`extensions.digest`, via MCP
`execute_sql`, ato manual único da E06). Reproduzir esse hash do lado do
cliente em Actions arriscaria divergência silenciosa do hash canônico — pior
que não ter o gate.

Em vez disso, criei `scripts/check-ledger-manifest-drift.mjs`, que cobre o
**objetivo real** da E46 ("alertar quando surge uma versão nova fora do que
já foi investigado") com uma checagem mais barata e 100% automatizável:

- Busca `SELECT version, name FROM supabase_migrations.schema_migrations`
  via Management API read-only (`scripts/supabase-read-only-query.mjs`,
  mesmo padrão de `scripts/check-ddl-out-of-band.mjs` da E12 — só
  `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF`, sem senha de DB).
- Compara contra as versões declaradas nos nomes de arquivo em
  `supabase/migrations/**` (mesma regex `declaredVersionOf` de
  `scripts/build-local-migrations-manifest.mjs`).
- Usa o manifesto da E06 como **allowlist do que já é dívida conhecida**:
  `local_versioned_files_without_ledger_version` (arquivo sem ledger) e
  `entries[].reconciliation === 'ledger_only_version'` (ledger sem arquivo).
- Só reporta (e falha) quando aparece uma versão **nova**, fora dessas duas
  listas.

O relatório chama os achados de **"candidatos"** a `aplicada-sem-ledger` /
`registrada-sem-arquivo` — não a classificação final. A classificação
autoritativa (`docs/CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json`,
E07) verifica cada migration **por objeto** no `pg_catalog`, uma checagem cara
demais pra rodar toda semana. Sinalizar o candidato e pedir revisão manual
(mesmo tratamento da E12 para DDL out-of-band) é o comportamento certo aqui —
o script nunca decide sozinho, nunca aplica `migration repair`.

Quando (e se) a dívida histórica de E07/E08 fechar o suficiente para `db diff`
completar, o texto da E46 já prevê promover de volta ao mecanismo original
como verificação **adicional** — este mecanismo fica como está até lá.

### Nota de honestidade sobre os números do baseline E06

`docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json` reporta
`local_versioned_files_without_ledger_version` = **543** — mas esse número
conta **arquivos**, não **versões distintas**. Confirmado nesta etapa
(`python3` sobre o JSON): dos 543 arquivos, só **486** têm prefixo de versão
distinto — 35 prefixos aparecem duplicados, cobrindo 57 arquivos extras
(543 − 486 = 57), consistente com o achado já documentado no plano ("31
prefixos de versão duplicados (~62 arquivos)"; a contagem exata varia um
pouco conforme o corte, mas a ordem de grandeza bate). `scripts/check-ledger-manifest-drift.mjs`
compara por **versão** (é essa a chave do ledger — `supabase_migrations.schema_migrations.version`),
então usa um `Set` de 486 versões como allowlist, não 543 linhas. Isso é o
comportamento correto para este caso de uso (duas migrations com o mesmo
prefixo de versão são, para efeito de "essa versão está no ledger?", o mesmo
caso), mas é documentado aqui para que ninguém estranhe o número 486 vs. 543
em relatórios futuros.

## O que foi implementado

- `.github/workflows/schema-snapshot-export.yml`:
  - `schedule: '0 6 * * 1'` adicionado ao `on:` (mantendo `pull_request`,
    `push`, `workflow_dispatch` como estavam).
  - `concurrency.group` passou a incluir `${{ github.event_name }}` — sem
    isso, um push pra `main` durante a janela do cron semanal cancelaria o
    job semanal no meio (mesmo group, `cancel-in-progress: true`), podendo
    deixar branch/PR pela metade. Efeito colateral zero para o job `export`
    existente (continua um group por ref, só que agora também segmentado por
    evento).
  - Novo job `weekly-live-drift`, **standalone** (não `needs: export` —
    deliberado, para nunca herdar o risco de timeout do `computeDrift()` do
    job `export`), gated por
    `if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'`,
    com `permissions: contents: write, pull-requests: write, issues: write`
    no nível do job (o job `export` continua só `contents: read`, herdado do
    workflow):
    - Parte 1: `supabase link` + `supabase db dump --linked --schema public`
      direto (não chama `scripts/export-schema-snapshot.mjs`, que também
      chamaria `computeDrift()`/`db diff` internamente) → sobrescreve
      `supabase/migrations-snapshot/SCHEMA_LIVE.sql` → `git diff --quiet` →
      se mudou, abre PR em branch
      `chore/schema-live-weekly-snapshot-YYYYMMDD` (dedup via
      `gh pr list --head ... --state open`), mesmo padrão de
      `regenerate-supabase-types.yml`. Sem `SUPABASE_ACCESS_TOKEN`/
      `SUPABASE_DB_PASSWORD`, a Parte 1 é pulada com `::warning::` (mesmo
      contrato safe-by-default do job `export` já existente).
    - Parte 2: `node scripts/check-ledger-manifest-drift.mjs
      --out=/tmp/ledger-manifest-drift.json` com `continue-on-error: true` →
      upload do relatório como artifact (90 dias) → se `FAILED`/`INCONCLUSIVE`,
      abre ou comenta (dedup por label) uma issue `ledger-manifest-drift` via
      `actions/github-script@ed597411d8f924073f98dfc5c65a23a2325f34cd # v8`,
      mesmo padrão de `.github/workflows/ddl-out-of-band-detector.yml` (E12).
      Não quebra o build (`::warning::`, advisory).
- `scripts/check-ledger-manifest-drift.mjs` (novo): ver seção 3 acima para o
  desenho. Testado localmente sem credenciais: `static-pass` (exit 0) por
  padrão, `inconclusive` (exit 2) com `--require-live`. Testada também a
  lógica de allowlist/diff contra o baseline real (fora do script, num
  reimplementação ad-hoc de verificação) — usando o próprio conjunto de
  versões do baseline como um "ledger" simulado, o resultado aponta como
  "candidatas novas" exatamente as migrations criadas hoje (2026-09-16, nesta
  mesma sessão de trabalho: `20260916193000`, `20260916200000`,
  `20260916201000`, `20260916202000`) — sinal de que a lógica de comparação
  funciona como esperado (arquivo local recém-criado, ainda sem linha
  correspondente no ledger vivo, é exatamente o tipo de caso que o script deve
  sinalizar).
- `package.json`: adicionado `"check:ledger-manifest-drift": "node
  scripts/check-ledger-manifest-drift.mjs"`, seguindo a convenção `check:*`
  já usada por `check:ddl-out-of-band` etc.
- `supabase/MIGRATIONS_SYNC_LOG.md`: nova seção `## 2026-09-16` (append,
  conteúdo anterior intocado) documentando o formato do relatório e o novo
  mecanismo.
- Evidência inserida em `docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md`
  logo após `### E46`, mesmo padrão das blockquotes `### E12`/`### E44`.

## O que fica pendente — só comprovável pós-merge

**Não afirmo que o workflow já rodou verde 2 vezes — isso não aconteceu.**
Esta etapa só pôde:

- Validar sintaxe YAML (`python3 -c "import yaml; yaml.safe_load(...)"` —
  passou).
- Testar `check-ledger-manifest-drift.mjs` localmente sem credenciais
  (`static-pass`/`inconclusive`, comportamento esperado).
- Validar a lógica de allowlist/diff contra dados reais do baseline (fora do
  ambiente de Actions, sem tocar o banco).

O que só pode ser confirmado depois do merge, com o cron rodando de fato:

- A execução real do job `weekly-live-drift` (primeira janela do cron:
  segunda 2026-09-21 06:00 UTC, assumindo merge antes disso).
- Que `check-ledger-manifest-drift.mjs`, com credenciais reais de CI
  (`SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF` como secret/var do repo),
  retorna `live` da Management API e não `missing-config`/`network-error`.
- Que a criação de PR (Parte 1) e de issue (Parte 2) funcionam de fato dentro
  do runner do Actions (permissions, `GITHUB_TOKEN`, `gh` CLI) — o padrão foi
  copiado de workflows já em produção (`regenerate-supabase-types.yml`,
  `ddl-out-of-band-detector.yml`), mas nunca rodou nesta forma específica.
  Portanto o item de checklist "2 execuções semanais consecutivas" (E46,
  plano) **fica não marcado** — só pode ser marcado depois de observar 2
  segundas-feiras seguidas com o job concluído (verde ou com PR/issue aberta
  de forma esperada, não com erro de infraestrutura).
