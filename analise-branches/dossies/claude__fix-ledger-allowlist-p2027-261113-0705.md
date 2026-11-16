# origin/claude/fix-ledger-allowlist-p2027-261113-0705

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada a mais hoje — o alarme diario que apontava "o banco de producao esta fora de sincronia com o codigo" ja parou de disparar sozinho, por uma correcao melhor que entrou na main; esta branch resolvia o mesmo alarme abrindo uma excecao manual que nao e mais necessaria.
- **Tip / merge-base / main:** tip `f835bb46817219722584c6c4cdcab2179cf279bc` / merge-base `0b1766de405f3a2543986bca0d0e17fd0dedf481` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit (`f835bb4681`, 2026-11-13), um unico arquivo
(`scripts/migration-ledger-remote-only-allowlist.json`), uma unica entrada nova na lista:
`"20261104100000"`, mais um paragrafo em `reason` e um aditivo em `approved_by`.

Motivo declarado na mensagem do commit:

> O db-schema-drift-check (run 43192632271) bloqueia com blocking_remote_only_count=1, unica versao
> 20261104100000, que tem arquivo no repo e ja esta no ledger canonico.

Ou seja: a verificacao diaria de paridade entre as migrations do repositorio e as aplicadas no banco de
producao estava vermelha por causa de **uma** migration
(`supabase/migrations/20261104100000_partitions_supplier_products_raw_history_2027.sql`) que existe no
repo **e** esta aplicada em producao, mas que o Supabase CLI listava como "so existe no banco". A saida
escolhida pela branch foi a mesma das revisoes anteriores: colocar a versao na allowlist de excecoes.

A propria PR (#3491) foi aberta como **rascunho** e com a ressalva de que nao seria mergeada por conta
propria, porque a allowlist relaxa um portao de paridade de banco e exige autorizacao explicita do
mantenedor. A PR foi **fechada sem merge** em 2026-11-13T10:33:52Z (`merged_at: null`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Entrada `20261104100000` na allowlist de excecoes | **NAO ESTA** (e nao precisa estar) | `git show origin/main:scripts/migration-ledger-remote-only-allowlist.json` → 681 versoes, `'20261104100000' in versions == False`; na branch sao 682 |
| A intencao: destravar o `db-schema-drift-check` para a versao `20261104100000` | **ESTA na main**, por outro mecanismo — a logica `pairedLate` em `scripts/check-supabase-migration-ledger.mjs` (linhas 67-86) passou a tratar como *alinhada* a versao que a CLI lista nas duas colunas (local-only e remote-only) por desalinhamento sequencial | comentario em `scripts/check-supabase-migration-ledger.mjs:68-71` citando o caso exato: "visto em 2026-11-12: 20261104100000 nas duas colunas... conta como alinhada, nao como drift" |
| A versao `20261104100000` reconhecida pelo portao | **ESTA**, com teste na main | `tests/scripts/check-supabase-migration-ledger.test.mjs:128-129`, `:139`, `:142` (`blocking_remote_only_sample` esperado) e `:160` usam literalmente `20261104100000` |
| A migration em si aplicada em producao | **ESTA** no banco oficial `doufsxqlfjyuvxuezpln` | `select version, name from supabase_migrations.schema_migrations` → `20261104100000 / partitions_supplier_products_raw_history_2027` |
| O efeito pratico (portao verde) | **ESTA** | runs agendadas do `db-schema-drift-check.yml` na main: `43192632271` 2026-11-12 **failure** (a run citada pela branch) → `43402325601` 11-13 **success**, `43581142603` 11-14 **success**, `43699827072` 11-15 **success**. No run 11-15 o passo proprio esta verde: `Ledger parity (repo x canonical) = success` |
| Quando a correcao melhor entrou | main, 2026-11-12 (um dia antes da branch) | `git log -S"pairedLate" origin/main -- scripts/check-supabase-migration-ledger.mjs` → `03b9fb2335 2026-11-12 fix(ci): ledger parity tolera o pareamento sequencial da CLI` e `c7680be6c0 2026-11-12 ... ledger por contagem` |

### Por que a saida da main e melhor que a desta branch

A branch resolvia **uma** versao abrindo **uma** excecao; a main resolveu a **classe** do problema. Prova:
as migrations aplicadas depois (`20261108001500`, `20261112011000`, `20261112130000`) estao em producao
(query a `supabase_migrations.schema_migrations`), tem arquivo local na main
(`git ls-tree origin/main -- supabase/migrations` acha 1 arquivo para cada) e **nao** estao na allowlist
(lista vazia na consulta) — e mesmo assim os runs de 11-14 e 11-15 ficaram verdes. Com a abordagem da
branch, cada uma delas exigiria uma nova PR e uma nova autorizacao do mantenedor (a propria PR #3491
previa isso no campo "Provavel proxima revisao").

## A resgatar

Nada. A entrada `20261104100000` na allowlist **nao deve** ser resgatada: aplicar o diff desta branch hoje
relaxaria um portao de paridade de banco de producao sem necessidade (o portao ja esta verde sem ela) e
reintroduziria no campo `approved_by` do arquivo a marca "aguarda aprovacao do mantenedor", que e
exatamente o motivo pelo qual a PR #3491 foi deixada em rascunho e depois fechada.

## Risco de fechar esta branch

Nenhum risco pratico. A verificacao diaria que a branch queria destravar esta verde na main ha tres dias
seguidos (13, 14 e 15 de novembro), sem a excecao que a branch propunha, e a migration que gerou o alarme
esta aplicada em producao e versionada no repositorio. Fechar nao apaga nada do banco e nao toca producao.

Risco contrario (de aproveitar a branch): mergear este diff aumentaria a lista de excecoes do portao de
seguranca do banco para um caso que o sistema ja sabe tratar sozinho — menos protecao, nenhum ganho.

## Nao verificado

- Nao foi reexecutado localmente o `scripts/check-supabase-migration-ledger.mjs` contra a saida real da
  CLI; a conclusao de que o portao esta verde vem dos runs agendados do GitHub Actions na main
  (`43402325601`, `43581142603`, `43699827072`) e do passo "Ledger parity (repo x canonical) = success" no
  run `43699827072`, nao de execucao local.
- Nao foi auditado se existe algum cenario futuro em que a CLI volte a listar `20261104100000` **apenas**
  na coluna remota (sem a linha local). Nesse caso hipotetico o pareamento `pairedLate` nao se aplicaria e
  o portao poderia bloquear de novo — mas isso seria um defeito novo do portao, nao trabalho perdido desta
  branch.
- Arquivos sem leitura por truncamento: 0 (a branch mexeu em 1 arquivo e o pacote traz os dois diffs
  completos dele).
