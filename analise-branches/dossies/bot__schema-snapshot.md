# origin/bot/schema-snapshot

- **Veredito:** DECISAO_HUMANA  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada que o cliente, o vendedor ou o site vejam — e uma "fotografia" automatica do desenho do banco de producao, tirada por um robo em 07/11, que serve so para o sistema conferir depois se alguem mexeu no banco por fora do processo.
- **Tip / merge-base / main:** tip `f641a88b5e735e55b027f232f67d73b78fe1270d` · merge-base `897cc4c1026c483b5b23d7d6a80058d228c0a620` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Um unico commit, de robo: `a71524e999 github-actions[bot] 2026-11-07 chore(schema-snapshot): snapshot semanal 2026-W45 (run 42319487374)`, corpo "Auto-gerado por schema-snapshot-export.yml (E84). Snapshot do schema canonico doufsxqlfjyuvxuezpln."

Nao e trabalho de engenharia: e a rotina semanal do workflow `.github/workflows/schema-snapshot-export.yml`, que (comentario do proprio arquivo na main, linhas 15-18) "commita o snapshot na branch fixa `bot/schema-snapshot` (force-push) e abre/reutiliza uma unica PR". O conteudo e 100% gerado por maquina:

- `git diff --name-status 897cc4c1 origin/bot/schema-snapshot` da exatamente 5 linhas: `R099` e `R097` renomeando o baseline de `20261015140000_*` para `20261101232022_*`, e `M` nos tres arquivos de `supabase/migrations-snapshot/`. Nenhum arquivo de codigo, rota, tela, migration, policy ou teste.
- O proprio cabecalho do arquivo diz que nao e migration: `supabase/baseline/20261101232022_baseline_schema.sql:4-6` — "NAO e migration: nao aplicar em producao, nao copiar para supabase/migrations/".
- `supabase/migrations-snapshot/ALL_IN_ONE.sql` e declarado artefato descartavel na main: `scripts/validate-supabase-config.mjs:160` ("ALL_IN_ONE.sql e artefato REGENERADO a partir das migrations") e `.github/workflows/deploy-gates.yml:304` o exclui do check de tamanho/diff.

A PR correspondente ja existiu e foi fechada sem merge pelo dono: [#3117](https://github.com/adm01-debug/Promo_Gifts_V4/pull/3117), aberta 2026-11-07T00:48:27Z, fechada por `adm01-debug` em 2026-11-07T04:06:57Z (`mergedAt: null`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
| --- | --- | --- |
| Rotina que gera este snapshot | ESTA na main, mas **desligada** | `.github/workflows/schema-snapshot-export.yml` existe em `origin/main`; API do GitHub: `"state":"disabled_manually"`, `updated_at 2026-11-14T14:06:46-03:00` |
| Baseline do schema de producao (foto do banco) | ESTA, em versao anterior: `supabase/baseline/20261015140000_baseline_schema.sql` | `git ls-tree -r --name-only origin/main -- supabase/baseline/` |
| Foto da **versao 20261101232022** (a desta branch) | NAO ESTA | mesma listagem acima nao tem `20261101232022_*`; so a branch tem |
| Lista de versoes do ledger que acompanha o baseline | ESTA e e **mantida a mao, mais atual que a da branch**: 2884 versoes | `git log -1 origin/main -- supabase/baseline/20261015140000_ledger_versions.json` → `ee13f748c0 2026-11-14 ... ledger P09 ... (#3618)`; contagem = 2884 |
| `supabase/migrations-snapshot/*` (ALL_IN_ONE, SCHEMA_LIVE, SNAPSHOT_META) | ESTA, em versao de 18/10 | `SNAPSHOT_META.json` da main: `"generated_at": "2026-10-18T17:57:19.066Z"`, `"migrations_count": 2974`; da branch: `2026-11-07T00:48:04.891Z`, `3042` |
| Ultimo snapshot semanal que entrou na main | W42, 18/10 (PR #2169, MERGED) | `git log origin/main -- supabase/migrations-snapshot/` → `7ca069a0a8 2026-10-18 github-actions[bot] ... (#2169)` |
| O portao que consome o baseline funciona sem esta branch | SIM, verde | `db-schema-drift-check.yml`, run `43699827072`, 2026-11-15T09:33:34Z, event `schedule`, branch `main`, conclusion **success** |

Conclusao da verificacao: nada de autoria humana ou de outro agente ficou de fora. O unico conteudo exclusivo da branch e a foto de 07/11 — e ela **esta pior que a da main**, nao melhor:

- A lista de versoes da branch tem **2576** entradas; a da main tem **2884**; o banco de producao tem **2973** aplicadas hoje (`select count(*) from supabase_migrations.schema_migrations` → `2973`, maior = `20261115230000`).
- Comparando os dois arquivos: **360 versoes que estao na lista da main faltam na lista da branch** (e 52 so na branch). Amostra das 360 faltantes: `20260511235900, 20260512000000, 20260525232003, 20260526103000, 20260526141234, 20260915113458, 20261022100020-22, 20261101220000`.
- Essas 360 **continuam aplicadas em producao**: consulta nas 10 da amostra retornou `presentes_dos_10_exemplos: 10`.
- Pelo criterio do replay (`scripts/drift-baseline.mjs`, `selectReplayMigrations`, L327-335: replaya toda versao aplicada que nao esta na lista do baseline), adotar a foto da branch faria a conferencia tentar reaplicar ~400 migrations em cima de um dump que **ja contem** esses objetos, em vez das ~90 de hoje. Nunca foi testado: no commit `f641a88` nao rodou nenhum check de drift (rollup `FAILURE` so por `Supabase Preview`, que o proprio bot do Supabase explicou na PR: "ignored ... due to reaching the limit of concurrent preview branches").
- Reforcando que trocar o baseline nao e inocente, o comentario do proprio workflow (`schema-snapshot-export.yml`, job `drift-gate`): "Baseline novo so depois de provar que o atual nao tem drift: sem isto o dump semanal absorveria objeto criado fora de migration e o drift-check deixaria de acusa-lo." O run que gerou esta branch (42319487374) foi apagado — a API responde 404 —, portanto **nao da para provar** que o gate estava verde quando a foto foi tirada.

## A resgatar

Nada de codigo. Um unico item, condicional, e por isso o veredito e DECISAO_HUMANA e nao fechamento puro:

| o que | arquivo | por que importa | condicao |
| --- | --- | --- | --- |
| Girar o baseline da conferencia para uma foto recente | `supabase/baseline/20261101232022_baseline_schema.sql` + `_ledger_versions.json` | a main esta congelada na foto de 15/10; cada semana a conferencia tem mais migrations para reexecutar, ficando mais lenta e mais fragil | **nao mergear estes arquivos como estao** (lista de versoes 360 itens menor que a realidade); so faz sentido gerar uma foto nova, com a lista correta, pelo proprio workflow — que esta desligado desde 14/11 |

## Risco de fechar esta branch

Para o negocio, zero: nenhuma tela, preco, permissao, pedido ou integracao depende destes arquivos, e a conferencia automatica do banco rodou e **passou** em 15/11 com a foto antiga que ja esta na main (run `43699827072`). Fechar a branch nao apaga trabalho de ninguem — o conteudo e gerado por maquina e pode ser refeito a qualquer momento a partir do banco.

O que fica aberto, e precisa da sua decisao, e outra coisa: **o robo que tira essa foto esta desligado desde 14/11** e, na ultima vez que rodou, entregou uma lista de versoes furada (360 a menos). Se continuar assim, a conferencia que avisa quando alguem mexe no banco por fora vai ficando mais lenta a cada semana e, um dia, trava. As duas saidas:

1. **Recomendado:** fechar esta branch, corrigir a geracao da lista de versoes e so depois religar o robo semanal (ele gera foto nova e passa pelo proprio gate de seguranca). Custo: uma correcao pequena + ~30 min de CI por semana.
2. Mergear esta foto de 07/11 como esta. Nao recomendo: joga a lista de versoes 360 itens para tras, pode deixar a conferencia vermelha ou, pior, cega, e nao existe prova de que o gate estava verde quando ela foi tirada (run apagado).

## Nao verificado

- Se o gate de drift estava verde no momento em que a foto foi gerada: run `42319487374` nao existe mais (API: 404), e nao houve check de drift no commit `f641a88`.
- Se a conferencia realmente quebraria com a foto da branch: a conclusao vem da leitura de `selectReplayMigrations` em `scripts/drift-baseline.mjs` somada as contagens (2576 vs 2884 vs 2973 aplicadas) e a confirmacao de que a amostra das versoes faltantes esta aplicada em producao. Nao executei o replay — seria escrita/CI, fora do permitido nesta tarefa.
- Por que a lista do robo veio com 360 versoes a menos (defeito na leitura do ledger em `scripts/export-schema-snapshot.mjs:readLedger` vs ledger de producao em reparo na epoca): nao investigado a fundo; e o que precisa ser olhado antes de religar o workflow.
- Conteudo linha a linha dos dumps (`baseline_schema.sql` 121.340 linhas, `SCHEMA_LIVE.sql`, `ALL_IN_ONE.sql`): nao lido integralmente. Verificado por outra via — deteccao de renomeacao (`R099`/`R097`), numstat (`689/334`, `688/333`, `3580/218`) e comparacao completa dos conjuntos de versoes do ledger. Nenhum dos 5 arquivos ficou sem investigacao.
