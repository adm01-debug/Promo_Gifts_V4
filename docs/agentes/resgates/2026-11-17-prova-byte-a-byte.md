# Prova byte a byte das branches fechadas

Gerado em 17/11/2026. Responde a uma cobranca legitima: o fechamento anterior afirmava
"fechadas com prova" sem publicar a comparacao. Aqui esta a comparacao, reproduzivel.

## Metodo

Nenhuma branch foi apagada sem antes virar **pai de um commit em `salvo/*`**, logo todo
conteudo segue alcancavel por `git show <tip>:<arquivo>`. Para cada tip preservado:

```bash
mb=$(git merge-base origin/main <tip>)          # trabalho PROPRIO da branch
git diff --name-only $mb <tip>                   # arquivos que ela tocou
git cat-file -e origin/main:<arquivo>            # existe na main?
git rev-parse <tip>:<arquivo> vs origin/main:<arquivo>   # mesmo blob?
```

`git rev-parse` compara o **hash do blob**: igual = byte a byte identico.
Nunca `origin/main..branch` (dois pontos), que esconde o trabalho proprio de branch antiga.

## Resultado agregado

| medida | arquivos |
|---|---|
| comparados | **1324** |
| byte a byte identicos a main | 362 |
| diferentes da main | 667 |
| ausentes da main | 295 |

"Diferente" quase sempre significa que a **main evoluiu depois** do tip, nao que a branch
tinha algo a mais. "Ausente" exigiu o segundo teste, abaixo.

## O teste de basename: 51 dos "ausentes" sao arquivos MOVIDOS

A main reorganizou pastas. Antes de chamar qualquer arquivo de perdido, o basename foi
procurado em toda a arvore (`git ls-tree -r --name-only origin/main`). De **245 caminhos**
ausentes unicos, **51 existem na main em outra pasta** — mesmo arquivo, caminho novo:

| no tip preservado | na main hoje |
|---|---|
| `.github/workflows/migrations-sync-log-gate.yml` | `recovery/workflows-aposentados/migrations-sync-log-gate.yml` |
| _docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md_ | `docs/arquivo/2026-09/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md` |
| _docs/E11_LEDGER_STATEMENTS_2026-09-16.md_ | `docs/arquivo/2026-09/E11_LEDGER_STATEMENTS_2026-09-16.md` |
| _docs/CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json_ | `docs/arquivo/2026-09/` (mesmo nome) |

Sobraram **194 realmente ausentes**. Desses, **119 sao artefato**, nao sistema:
48 em `analise-prs/dossies`, 45 em `recovery/src-legacy`, 17 em
`docs/prod-readiness-evidencias`, e o resto em `docs/` e `scripts/graphify`.

## Os 75 que importam: adjudicados um por um

Codigo, teste e banco. Cada um recebeu veredito com evidencia.

| grupo | arquivos | resgatar | o resto |
|---|---|---|---|
| banco | 9 | **0** | 5 ja na main renumerados, 1 decisao do dono (P06), 3 obsoletos |
| `src/` | 28 | **0** | 26 obsoletos, 2 ja na main renomeados |
| `tests/` | 42 | **1** | 40 obsoletos, 1 ja na main |
| **total** | **79\*** | **1** | |

\* 79 linhas de veredito para 75 caminhos: 4 arquivos aparecem em mais de um tip.

### Banco: as provas

Comparacao por **md5 do corpo normalizado** (sem comentarios e espaco), nao por olho:

- `20261107143505_fix_sb0003_...` -> a main tem `20261112011000_fix_sb0003_fn_get_rupture_alerts.sql`.
  Unica diferenca real: a ordem do `search_path`. **Producao ja esta com a da main**
  (`pg_proc.proconfig = search_path=public, pg_catalog, pg_temp`), e essa versao esta no ledger.
- `20261107143509_fn_global_search_clamp_limit_hardened.sql` -> `20261115130300_*`, md5 do corpo
  **identico** (`2f5e7e10f189484cd442227cfa22714a`). A propria main declara o renome no
  cabecalho (`:11`).
- `20261107143505_rollback.sql` -> `20261112011000_rollback.sql`, md5 normalizado identico
  (`7dcd74011c9f3d934bc5a8a7620f570b`). Zero delta.
- `20261108132000_reconcile_e2e_cleanup_audit.sql` -> e a renumeracao de
  `20261108001500_*`, que a main tem. **Todo o DDL e byte-identico**; o diff e 7 linhas de
  comentario. O estado ja esta em producao com 375 linhas na tabela, e o ledger registra
  `20261108001500` e **nao** `20261108132000` — trazer o arquivo criaria drift.
- `20261108221502_ft088_fn_check_item_fits.sql` -> a main tem `20261108030200_*`, corpo do
  `CREATE OR REPLACE` md5-identico. A funcao esta no ar e o `GRANT EXECUTE` exclusivo do
  arquivo preservado **ja esta satisfeito** em producao.

**Dois arquivos de banco seriam regressao se resgatados:**

1. _supabase/rollbacks/20261108221502_rollback.sql_ (ausente da main) da `DROP FUNCTION public.fn_check_item_fits`.
   A funcao esta em producao e tem consumidor na main
   (`src/hooks/kit-builder/useKitFitsValidation.ts`). A main rejeitou isso **de proposito**:
   `supabase/rollbacks/20261108030200_rollback.sql` guarda o DROP so como comentario e termina
   em `SELECT 1;`, dizendo que "derrubar esses objetos seria uma regressao em producao".
   Resgatar daria ao operador um roteiro que apaga funcao em uso.
2. _supabase/migrations-snapshot/SCHEMA_DRIFT.sql_ (ausente da main) e foto vazia de 16/09 (2.844 bytes, **zero
   DDL**, so um comentario dizendo que nao foi possivel calcular). A main o aposentou em
   18/10 e a propria ferramenta o apaga a cada rodada
   (`scripts/export-schema-snapshot.mjs:218`), entao restaurar seria desfeito no snapshot
   seguinte.

### `src/`: por que 26 de 28 sao obsoletos

A maioria sao `*.types.ts` e `*state-types.ts` extraidos de componentes e hooks — artefato de
um refactor que a **main rejeitou**, mantendo os tipos inline. Zero consumidores. Os com
prefixo `Legacy` (`LegacyCartInsights`, `LegacyFavoritesAdapters`) sao adaptadores de uma
migracao ja concluida.

### `tests/`: o unico resgate de toda a auditoria

Os 42 foram **executados** contra a main, nao julgados por leitura:

- **23 reprovam** porque medem um design que a main rejeitou (marcador em `COLUMN COMMENT`,
  rollback que recusa) — sao especificacao de outro desenho, nao defeito encontrado;
- **11 nao carregam**: importam modulo que nao existe na main;
- **2** sao de `quote_comments`, feature cancelada com gate de CI proprio;
- **1 ja esta na main** com outro nome;
- **1 passa 2/2 e cobre contrato vivo sem cobertura** -> resgatado na PR #3759.

## Como reproduzir

Os 28 refs `salvo/*` estao no remoto. Para qualquer um:

```bash
git fetch origin "+refs/heads/salvo/*:refs/remotes/origin/salvo/*"
git log -1 origin/salvo/261117-decisoes-finais-7      # o veredito de cada branch
git rev-list --parents -n 1 origin/salvo/261117-decisoes-finais-7   # os tips preservados
```

O commit de cada ref `salvo/*` tem arvore **igual a da main** (nao muda codigo) e um pai por
branch preservada; a mensagem carrega o veredito e a medida de cada uma.


---

## Anexo: comparação POR BRANCH das duas fechadas sem tabela publicada

As duas branches abaixo foram fechadas antes de eu publicar este relatório. A ordem foi essa, e
registro o fato: apaguei primeiro e publiquei a prova depois. O conteúdo nunca ficou
inalcançável — cada tip é pai de um commit em `salvo/*` — mas a tabela por branch só existe agora.

### Como reproduzir, para cada uma

```bash
git merge-base --is-ancestor <tip> origin/<ref salvo>   # o tip é alcançável pelo ref?
mb=$(git merge-base origin/main <tip>)
git diff --name-only $mb <tip>                           # o trabalho próprio da branch
git rev-parse <tip>:<arquivo>  vs  origin/main:<arquivo> # mesmo blob?
```

### `fix/e2e-url-state-defaults-20261030`

tip `3de80569c`, alcançável por `origin/salvo/261117-decisoes-finais-7`
(`--is-ancestor` → 0). merge-base com a main: `ec06a4572`.

**10 arquivos, 0 ausentes da main, 10 em versão diferente:**

| arquivo | adjudicação |
|---|---|
| `supabase/rollbacks/20261101140001_rollback.sql` | **resgatado** em #3756, com o aviso corrigido para tokens de sessão, não só PII |
| `src/components/inventory/StockDashboard.tsx` | a main já tem a mesma correção, melhor fatorada em `src/components/inventory/stockTabDefault.ts`; aceitar o lado da branch reverteria o refactor |
| `scripts/check-dependency-audit.mjs` | a main é **mais restritiva**: a validação vive dentro do ramo nomeado de `minimatch`; a versão da branch a tornaria genérica |
| `tests/scripts/check-dependency-audit.test.mjs` | acompanha o item acima |
| `docs/security/ALLOWLISTS_MEMORY.md` | a branch **duplica** entradas (`cleanup_expired_auth_sessions` 2×, `perf002` 2×) |
| `supabase/MIGRATIONS_SYNC_LOG.md` | a branch está ~900 linhas atrás dos recibos de produção |
| `.security/lint-0029-allowlist.json` | baseline que a main mantém atualizado |
| `PENDENCIAS.md`, `RELATORIO_CI.md` | a main regenerou os dois depois do merge-base |
| `analise-branches/dossies/devin-probe-e184-legacy-refs.md` | dossiê de análise, artefato |

### `codex/fix-e2e-ci-pressure-261107-0238`

tip `6746bd9cc`, alcançável por `origin/salvo/261117-e2e-ci-pressure`
(`--is-ancestor` → 0). merge-base com a main: `6065eb7ad`.

**15 arquivos, 0 ausentes da main, 15 em versão diferente:**

| arquivo | adjudicação |
|---|---|
| `e2e/protected-routes.spec.ts` | **resgatado** em #3755 — a main estava errada, o teste não podia passar |
| `e2e/flows/sidebar-tooltips.spec.ts` | **resgatado** em #3755 (helper anti-flake), sem a remoção do `requireAuth()` |
| `playwright.config.ts` | recusado: o `testMatch` novo casa ~11 de 567 specs, e a main tem a mais o modo `E2E_SERVER_MODE=preview` |
| `.github/workflows/e2e.yml` | recusado: reintroduz o gatilho `pull_request` removido de propósito, apaga 10 paths de infra e os fallbacks `E2E_SELLER_*` |
| `.github/workflows/e2e-flows.yml`, `e2e-stock.yml` | a main já tem `min: '9'` e os secrets de admin |
| `e2e/catalog/helpers/swatch-view.ts` | a main resolveu melhor: `scrollIntoViewIfNeeded + focus + Enter`, com comentário rejeitando `force` |
| `e2e/helpers/swatch-catalog-mocks.ts` | o `options.force` instalaria auth mockada sobre sessão real |
| `e2e/sidebar-logo.spec.ts` | contrato de 24px já está na main |
| `src/components/products/list-item/ListItemActions.tsx` | único arquivo de `src/`; a mudança não é fix de produto |
| os 5 specs restantes | reformatação prettier que a main já tem (`3b2deef1d`) |

### O que essas duas tabelas provam

**Zero arquivos ausentes em 25.** Não havia nada nessas branches que não exista na `main` — só
versões diferentes, e cada uma recebeu veredito com a medida. Os 2 itens que a `main` não tinha
foram resgatados (#3755, #3756) antes de o conteúdo sair do alcance, e não saiu: os dois tips
seguem alcançáveis pelos refs `salvo/*`, verificado agora com `--is-ancestor`.
