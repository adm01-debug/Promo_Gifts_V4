# origin/claude/fix-schema-snapshot-export-cancelled-skip-261101-2344

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** destrava o botao de emergencia que regrava a "foto oficial" do banco de dados — hoje, quando algo e cancelado no meio do caminho, o botao e ignorado em silencio e a foto nao e atualizada.
- **Tip / merge-base / main:** tip `35d25259e8be43bf3ee7e4560615a27e3a1e7ce7` · merge-base `ec06a45724e7b907315d7b454cea63a7a38fdc91` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`35d25259e8`, 2026-11-01), um unico arquivo: `.github/workflows/schema-snapshot-export.yml`.

O workflow `schema-snapshot-export` gera a "foto oficial" do schema de producao (baseline do
drift-check + `ALL_IN_ONE.sql`/`SCHEMA_LIVE.sql`) e a commita na branch `bot/schema-snapshot`. Antes de
girar o baseline ele roda um portao (`drift-gate`, que chama `db-schema-drift-check.yml`): sem esse portao
o baseline novo absorveria um objeto criado fora de migration e o drift-check pararia de acusa-lo
(`.github/workflows/schema-snapshot-export.yml:17-20` na main). O input `force_rotate` do dispatch existe
para pular essa trava em emergencia (ex.: replay quebrado por `repair-only`) — e e exigido pelo proprio
`db-apply-migration.yml:43` como contrapartida obrigatoria do modo `repair-only`.

A branch constatou que, com `force_rotate=true`, o job `export` era **pulado** e nada era gerado, porque
a condicao comecava com `!cancelled()` e qualquer job cancelado na execucao propaga esse estado. Fez duas
mudancas na condicao do job `export`:

1. primeira clausula: `!cancelled()` → `(inputs.force_rotate == true || !cancelled())`;
2. terceira clausula: aceitou `needs.drift-gate.result == 'cancelled'` como resultado valido.

Reproducao citada no commit e confirmada por mim na API do GitHub — run #2758 (id 41363217079,
2026-11-01): `Drift gate... = cancelled`, `Export schema snapshot = skipped`,
`Commit snapshot to bot/schema-snapshot = skipped`. O run seguinte, #2760 (id 41364632681), repete o
padrao: o portao ficou 57 min na fila, terminou em `failure`/`cancelled` e `export` saiu `skipped`.
**Nenhum dos 14 dispatches historicos deste workflow terminou em sucesso** (todos `cancelled`) — a saida
de emergencia nunca funcionou ponta a ponta.

A PR correspondente, [#3016](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3016), foi **fechada sem
merge** em 2026-11-07, sem nenhum comentario de revisao ou justificativa tecnica registrada na timeline.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| 1. `export` roda com `force_rotate=true` mesmo apos job cancelado (1a clausula `inputs.force_rotate == true \|\| !cancelled()`) | **NAO ESTA** | main `.github/workflows/schema-snapshot-export.yml:79` ainda e `!cancelled() &&` (`git grep -n "cancelled" origin/main -- .github/workflows/schema-snapshot-export.yml` → `:79 !cancelled() &&`). Diff (B) do pacote mostra a main removendo exatamente essa clausula. |
| 2. `drift-gate` com resultado `cancelled` aceito na 3a clausula | **NAO ESTA** | main `:80-82` lista so `'success'`, `'skipped'` e `(workflow_dispatch && inputs.force_rotate)`; nao ha `'cancelled'`. |
| 3. Mesma intencao aplicada ao job seguinte (`commit-snapshot`) | **ESTA na main, por outro caminho** | `6f94e35201 fix(ci): reconcile E40 ledger and forced rotation (#3113)`, 2026-11-06, adicionou `!cancelled() &&` ao `if` do `commit-snapshot` ("permit a successful explicitly forced schema export to publish its snapshot"); hoje em `:257`. Ou seja: a main consertou o 2o estagio e deixou o 1o (`export`) quebrado. |
| 4. Linha de changelog no cabecalho (`# 2026-11-01: fix export job skipped...`) | **NAO ESTA** (irrelevante) | O cabecalho foi reescrito em `9e656a39b9` (wf-consolida, 2026-11-13), que tirou `pull_request`/`push` do workflow. Puro comentario. |

Nota de diagnostico: a premissa do commit ("quando `force_rotate=true` o drift-gate termina com
`conclusion=cancelled`") **nao se sustenta como causa**. Na main o `drift-gate` nao olha `force_rotate`
(`:62` → `if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'`), portanto
`force_rotate` nao cancela nada. O `cancelled` dos runs de 01/11 e compativel com disputa de fila: 8
dispatches em 50 minutos no mesmo grupo de concorrencia `db-schema-drift-${{ github.workflow }}-${{ github.ref }}`
com `cancel-in-progress: false` (`.github/workflows/db-schema-drift-check.yml:88-92`) — execucoes em
espera sao descartadas quando chega outra. O **sintoma** (export pulado) e real e esta vivo; a **explicacao**
do commit esta errada, e isso muda qual correcao e a certa.

## A resgatar

1. **`.github/workflows/schema-snapshot-export.yml:79` — `export` pulado com `force_rotate=true`.**
   Defeito vivo na main: a saida de emergencia do baseline nao funciona se qualquer job da execucao for
   cancelado. Importa porque `db-apply-migration.yml:43` obriga a prometer essa rotacao apos um
   `repair-only`; se ela falha calada, o baseline do drift-check envelhece e o guarda-chuva que detecta
   mudanca de banco feita fora de migration para de valer. A correcao do item 1 da branch resolve isso.
2. **`.github/workflows/schema-snapshot-export.yml:80-82` — aceitar `drift-gate = cancelled`.**
   Como a branch escreveu, vale para **qualquer** evento, inclusive o agendamento semanal. Isso autoriza
   girar o baseline sem o portao de drift ter passado — exatamente o que o portao existe para impedir
   (`:17-20`). Se for adotado, precisa ficar restrito a `github.event_name == 'workflow_dispatch' && inputs.force_rotate`.

## Risco de fechar esta branch

Fechar sem portar o item 1 mantem na producao um botao de emergencia que nao funciona: depois de um
`repair-only` no banco, a "foto oficial" do schema nao e regravada e ninguem e avisado — a execucao
aparece como pulada, nao como falha. Com o baseline velho, a checagem semanal que denuncia alteracao de
banco feita por fora deixa de acusar. Nada de visivel ao cliente quebra; o risco e perder a rede de
protecao do banco, e so se percebe quando ja ha divergencia acumulada.

Por que **DECISAO_HUMANA** e nao resgate direto: (a) e arquivo de workflow de CI — pela regra Git 7 do
AGENTS.md, PR que toca `.github/**` fica aberta e chama o dono; (b) a main escolheu deliberadamente outro
caminho (PR #3113 consertou so o `commit-snapshot`) e a PR #3016 foi fechada sem motivo registrado — duas
decisoes conscientes que o resgate contradiz; (c) o item 2, como esta escrito, afrouxa um guarda de
producao (giro de baseline sem portao de drift) e so deve entrar com escopo reduzido. O que eu recomendo
levar ao dono: portar **so o item 1** e, se quiser o item 2, com a condicao restrita ao dispatch com
`force_rotate`.

## Nao verificado

- Nao consegui ler os **inputs** do run #2758 (id 41363217079) pela API, isto e, nao confirmei por fonte
  independente que aquele dispatch foi feito com `force_rotate=true`; isso consta apenas do corpo do
  commit e da PR #3016.
- A correcao da branch **nunca foi executada**: nao existe nenhum run de `schema-snapshot-export` na
  branch `claude/fix-...-261101-2344` (todos os 14 dispatches historicos sao em `main`). Portanto o
  comportamento corrigido e analise de condicao YAML + logs dos runs quebrados, nao teste.
- Nao reproduzi a causa do `cancelled` (disputa de fila na concorrencia) com um experimento proprio —
  a conclusao vem do `cancel-in-progress: false` no grupo compartilhado e dos 57 min de fila do run #2760.
