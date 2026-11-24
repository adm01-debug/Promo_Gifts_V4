# Auditoria das branches restantes — 2026-11-24

Base: `main` em `c6581c06` (2026-11-24 16:04 UTC). Regra do dono: nenhuma branch é apagada sem certeza
byte a byte de que o trabalho já está na `main` ou ficou obsoleto. Com o SHA do topo registrado aqui,
qualquer apagamento é reversível por `git branch <nome> <sha>`.

## Método

1. `git rev-list --count origin/main..<branch>` — commits que a branch tem e a `main` não tem.
2. `git diff --name-only origin/main...<branch>` — arquivos que a branch mudou desde a divergência.
3. Leitura do diff de cada arquivo divergente. O caminho sozinho mente: o que decide é o
   comportamento que existe na branch e não existe na `main`.

## Resultado

| branch | topo | commits à frente | veredicto |
| --- | --- | --- | --- |
| `origin` (main) | `c6581c06` | 0 | é a própria `main` |
| `chore/ratchet-lower-20261123-0859` | `c21ad4cd` | 1 | tem PR aberta (rotina de baseline) |
| `ci-metrics/2026-W48` | `906b43e2` | 1 | tem PR aberta (rotina de métricas) |
| `dependabot/*` (6 branches) | `d8b6a75d`, `78d8737a`, `a621ab2c`, `903b102b`, `7abdee0a`, `92b8ed31` | 1 cada | têm PR aberta (bot) |
| `docs/graphify-report-0.9.115` | `92c138ea` | 1 | tem PR aberta (relatório) |
| `inventario/estado-2026-W48` | `d021b2bf` | 1 | tem PR aberta (inventário) |
| `release-please--branches--main--components--gifts-store` | `cbae6572` | 1 | tem PR aberta (release 1.20.0) |
| `claude/chore-qa-etapa-001-compras-261123-1100` | `c5445e01` | 1 | PR #4003 fechada; conteúdo resgatado em #4044 (`c6581c06`) |
| `claude/fix-qa-etapa-002-mask-compras-catalogo-261123-1100` | `7e8f88c3` | 1 | PR #4004 fechada; máscara rejeitada (quebra ordem de compra) |
| `claude/fix-qa-etapa-003-mask-compras-faixa-261123-1115` | `53088da7` | 2 | PR #4005 fechada; máscara rejeitada (`unit_cost` = preço da faixa) |
| `claude/fix-qa-etapa-004-revoke-variante-anon-261123-1130` | `6d299f97` | 2 | PR #4006 fechada; superada pela `20261124140000` aplicada |
| `claude/fix-qa-etapa-005-open-view-gate-261123-1200` | `d7523182` | 2 | PR #4007 fechada; medição do bloqueio em #4044 |
| `claude/fix-qa-etapa-007-view-faixa-public-261123-1300` | `1fed190f` | 1 | PR #4009 fechada; premissa refutada (detalhe abaixo) |
| `e15-receipt-20261124140000-45414013226` | `cc98e795` | 1 | obsoleto: a linha do recibo já está na `main` (`supabase/MIGRATIONS_SYNC_LOG.md:1658`) |
| `claude/chore-fix-e40-drift-normalization-261122-2350` | `ba4c7fb0` | 2 | **draft não mergeado, 208 linhas** (detalhe abaixo) |
| `contexto` | `b3822823` | 777 | linhagem separada, gerada por automação (14.560 arquivos; a fonte é a `main`) |
| `gh-pages` | `2c27030e` | 3.073 | branch de publicação do site (história separada, parada em 2026-10-02) |

Nenhuma branch ficou órfã: todo trabalho de agente que existia nas branches acima tinha PR, e as PRs
fechadas nesta rodada e na anterior foram fechadas com o motivo e o destino do conteúdo registrados.

## Achado 1 — `claude/chore-fix-e40-drift-normalization-261122-2350`: draft de 208 linhas, não mergeado

Topo `ba4c7fb0` (inclui merge da `main`); o commit de trabalho é `82ecb785`
*"chore: generalizar normalizacao do Gate E40 para views/matviews/policies"*: +207 linhas em
`scripts/drift-baseline.mjs` — nova função exportada `dropDumpLossyViewsPolicies`, ligada no `runCli`
(linha 1466 da branch) e **sem teste**.

O que ela faz: para cada par `DROP`+`CREATE` de view/matview/policy no diff, compara o texto normalizado
com o objeto correspondente do baseline e, se idêntico, remove o par do resíduo — inclusive apagando a
qualificação de schema (`"public"."x"` → `x`) dos 8 esquemas monitorados.

Por que **não** foi mergeada:

1. A `main` já normaliza esse round-trip pela #4035 (`7468ec85`) e o gate está verde no dump de 24/11 —
   run `45429498524` em `c6581c06`, `completed / success`, resíduo vazio (`schema_drift.clean` com 0 byte).
2. É um mecanismo mais amplo que o da #4035, num gate de segurança: uma função que apaga objetos do
   resíduo comparando texto normalizado pode esconder drift real (ex.: view que perdeu
   `security_invoker=true`), e o trecho de fusão de spans re-insere objetos legítimos por reescrita do
   texto do diff. Sem teste, o risco não é verificável.

Veredicto: mantida parada, reversível pelo SHA `ba4c7fb0`. Se o gate voltar a acusar ruído de
views/policies, esta branch é o ponto de partida — com teste antes de entrar.

## Achado 2 — `claude/fix-qa-etapa-007-view-faixa-public-261123-1300`: melhoria com uma parte proibida

Topo `1fed190f`. Conteúdo: migration `20261123130000_view_tabela_preco_gravacao_oficial_faixa_public.sql`
(cria view `SECURITY DEFINER` com as colunas de venda, sem `organizacao_id`; `GRANT SELECT` para
`anon`/`authenticated`; **revoga `SELECT` de `anon` na tabela bruta**) + rollback, e redireciona o alias
`customization_price_tiers` para a view nova em `src/lib/db/postgrest.ts:56`,
`src/lib/external-db/rest-native.ts:170` e `:653`, `src/lib/supabase-direct.ts:9`.

Três medições que impedem o merge como está:

1. A view **não existe em produção** (`grep -c v_tabela_preco_gravacao_oficial_faixa_public
   supabase/migrations-snapshot/SCHEMA_LIVE.sql` → `0`). O redirect sozinho quebraria
   `customization_price_tiers` em todo consumidor anônimo.
2. A revogação contradiz o próprio banco: `public.fn_verify_anon_catalog_grants()` exige `anon SELECT` em
   `tabela_preco_gravacao_oficial_faixa` — `SCHEMA_LIVE.sql:53373`, na lista comentada como
   *"faixa de preço de venda OK"*. Depois da revogação, essa verificação passa a reportar
   `FALTA anon SELECT`.
3. A leitura anônima é decisão vigente: policy `tabela_preco_gravacao_oficial_faixa_public_read`
   (`FOR SELECT TO authenticated, anon USING (true)`, `SCHEMA_LIVE.sql:110626`) e `preco_unitario` é
   preço de **venda** desde `20260717173348_*`.

Veredicto: etapa 007 = premissa refutada, não se aplica a revogação. A criação da view, isolada, não
agrega (o caminho de leitura do `anon` é intencional e a tabela não expõe custo) e criaria mais uma
superfície pública fora do contrato de views públicas.