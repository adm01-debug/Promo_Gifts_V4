# origin/codex/fix-e2e-cleanup-rollback-header-261108

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** tira do manual de emergencia uma instrucao que, se alguem seguir, apaga para sempre o historico de quem rodou a limpeza de dados de teste em producao.
- **Tip / merge-base / main:** tip `c3cc121041fade393400b8ca45f978b80e9d8955` / merge-base `46ec263fe1b0a72a62154a6dc25eda90fe07767b` / main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Tres commits, dois assuntos independentes:

1. `1b094cd47e fix(db): documentar rollback lógico da reconciliação e2e` e
   `1ef1c4e104 fix(db): reversionar migration pendente com rollback` — a migration que
   reconcilia a tabela de auditoria `public.e2e_cleanup_audit` trazia no cabecalho a
   linha `-- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;`. Como essa tabela
   e um registro append-only de auditoria de producao, a branch trocou essa instrucao por
   um rollback logico ("preservar os registros e executar migration compensatoria;
   nunca usar DROP TABLE em auditoria de producao") e, por causa da regra forward-only,
   renumerou o arquivo de `20261108001500` para `20261108132000` para poder aplicar a
   versao corrigida.
2. `c3cc121041 fix(ci): normalizar BOM no replay de migrations` — em
   `scripts/drift-baseline.mjs`, remover o BOM UTF-8 do inicio da copia temporaria da
   migration antes do replay no shadow, porque o Postgres trata `U+FEFF` como token
   invalido e derrubava o gate de drift. Mais um teste.

A PR da propria branch (#3205, "fix(db): reversionar migration e2e_cleanup com rollback
logico") foi **fechada sem merge** (`gh api repos/.../pulls?head=...` devolve
`3205 closed merged=null`).

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Normalizar BOM UTF-8 na copia de replay (`sanitizeReplayMigration`) | **ESTA** — codigo identico, linha por linha | `git show origin/main:scripts/drift-baseline.mjs` linhas 359-367: `const normalizedSql = sql.startsWith('﻿') ? sql.slice(1) : sql;` e os dois `return normalizedSql` / `normalizedSql.replace(`. Entrou pelo commit `5e59cb9c79 fix: trem de resgates — 16 correções recuperadas de branches de outros agentes (#3660)` (`git log -S"const normalizedSql = sql.startsWith" origin/main`) |
| Teste do BOM (preserva `U+FEFF` interno) | **ESTA** | `git show origin/main:tests/scripts/drift-baseline.test.mjs` linha 79: `it('remove somente o BOM inicial da cópia de replay e preserva U+FEFF interno', ...)` |
| Renumerar a migration `20261108001500` -> `20261108132000` | **NAO ESTA — e hoje nao deve mais entrar** | A main mantem `supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` (`git ls-tree -r --name-only origin/main supabase/migrations`). Em producao a versao antiga **ja foi aplicada**: `select count(*) from supabase_migrations.schema_migrations where version='20261108001500'` = **1**, `...'20261108132000'` = **0**, `to_regclass('public.e2e_cleanup_audit')` = `e2e_cleanup_audit`, comentario da tabela = `created_by=20261108001500_reconcile_e2e_cleanup_audit` (consulta somente leitura no projeto `doufsxqlfjyuvxuezpln`). O recibo esta em `supabase/MIGRATIONS_SYNC_LOG.md` linha 1136 da main: aplicada em `2026-11-13 02:30:43 UTC`, run `43322428599`. Aplicar a renumeracao agora apagaria do repo um arquivo cuja versao esta no ledger de producao — exatamente o drift que o pipeline de migrations existe para impedir |
| Rollback logico no cabecalho (sem `DROP TABLE`) | **NAO ESTA** | `git show origin/main:supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` linha 2: `-- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;`. A mesma frase se repete em `supabase/MIGRATIONS_SYNC_LOG.md` linha 1188: `... rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;` |
| Atenuante importante | a main **ja tem** um roteiro de rollback seguro, melhor que o da branch | `git show origin/main:supabase/rollbacks/20261108001500_rollback.sql`: so dropa se o comentario da tabela provar que foi essa migration que a criou, e `RAISE EXCEPTION 'rollback recusado: public.e2e_cleanup_audit contém dados que seriam perdidos'` se houver qualquer linha. Nenhum workflow executa o texto do cabecalho: `.github/workflows/db-apply-migration.yml` linha 118 apenas confere que existe rollback documentado, e `scripts/preflight-migration-apply.mjs` linhas 304-314 so checam que existe a linha `-- Rollback:` e o arquivo `supabase/rollbacks/<version>_rollback.sql` |
| Defeito da propria branch (nao resgatar como esta) | ao renumerar para `20261108132000` a branch **nao criou** `supabase/rollbacks/20261108132000_rollback.sql`; ficou so o `20261108001500_rollback.sql` | `git ls-tree -r --name-only origin/codex/fix-e2e-cleanup-rollback-header-261108 supabase/rollbacks | grep 2026110813` devolve apenas `supabase/rollbacks/20261108001500_rollback.sql`; o gate exige o arquivo da versao (`scripts/preflight-migration-apply.mjs` linhas 310-314). A branch, do jeito que esta, nao passaria no portao |

## A resgatar

1. **`supabase/migrations/20261108001500_reconcile_e2e_cleanup_audit.sql` (linha 2)** —
   apagar/reescrever a instrucao `-- Rollback: DROP TABLE IF EXISTS public.e2e_cleanup_audit;`,
   trocando pelo texto que a branch escreveu (preservar os registros e usar migration
   compensatoria; nunca `DROP TABLE` em auditoria de producao) **e apontando para o roteiro
   seguro que a main ja tem** (`supabase/rollbacks/20261108001500_rollback.sql`).
   Por que importa: e o unico lugar que um humano le em emergencia; seguir a linha como
   esta apaga o historico de quem executou limpeza de dados de teste em producao, sem volta.
   Atencao: a migration **ja esta aplicada**, entao esta e uma mudanca de comentario em
   arquivo historico (ha precedente registrado no proprio log — `20261107134429` recebeu
   comentario depois de aplicada) e muda o sha256 registrado; nao renumerar, nao reaplicar.

2. **`supabase/MIGRATIONS_SYNC_LOG.md` (linha 1188)** — a mesma frase perigosa, e a linha
   ainda diz "aguardando aplicação" enquanto a linha 1136 do mesmo arquivo diz que foi
   aplicada em 2026-11-13 (confirmado no banco). Por que importa: o registro oficial do
   banco se contradiz e repete a instrucao destrutiva.

**Nao resgatar:** a renumeracao `001500 -> 132000` e o arquivo
`supabase/migrations/20261108132000_reconcile_e2e_cleanup_audit.sql`. Estao vencidos pela
realidade de producao e, se entrassem, criariam drift entre ledger e repo.

## Risco de fechar esta branch

Baixo-moderado, e so documental. O que a branch tinha de codigo (correcao do BOM + teste)
ja esta na main. Fechando sem resgatar os dois itens acima, fica vivo na main um manual de
emergencia que manda apagar a tabela de auditoria de limpeza de producao
(`public.e2e_cleanup_audit`, que existe e esta com RLS e grants restritos). O estrago nao e
automatico: nenhum robo executa aquele texto, e o roteiro real de rollback que a main tem
se recusa a apagar a tabela se houver qualquer registro. O risco e humano: alguem seguir a
linha errada as pressas.

## Nao verificado

- Nao foi executado `npm test` / typecheck nesta analise (tarefa de leitura; nenhuma
  escrita no git). A afirmacao de que o BOM esta na main e por identidade de texto no
  arquivo da main, nao por execucao de teste.
- Se a mudanca de comentario em migration ja aplicada exige atualizar algum sha256 em
  `required-checks`/gate de ledger: nao conferido. O precedente citado (`20261107134429`)
  esta no proprio log, mas nao verifiquei qual gate recalcula esse sha.
- Nenhum arquivo ficou sem leitura: o pacote nao veio truncado e os 4 arquivos foram lidos
  (os dois diffs de cada um).
