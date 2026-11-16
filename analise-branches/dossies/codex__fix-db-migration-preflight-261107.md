# origin/codex/fix-db-migration-preflight-261107

- **Veredito:** RESGATAR_PARCIAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** Reforca a tranca que impede uma alteracao de banco chegar a producao sem plano de volta e sem registro — o conserto de banco em si ja entrou no sistema, mas as conferencias da propria lista de excecoes dessa tranca ficaram de fora.
- **Tip / merge-base / main:** tip `4f235fd502d5463fdd1b4006906d512fe0bfb5bc` · merge-base `df81a741a72bff72b3e7dee72508b53ff2a013b0` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

13 commits de 2026-11-07, todos em volta do portao que libera migration para producao
(`db-apply-migration.yml` + `db-schema-drift-check.yml`):

1. **Desbloquear duas migrations que o preflight recusava** (PENDENCIAS #22): a versao
   `20261101150000` (fn_get_rupture_alerts) nunca tinha entrado no ledger canonico e foi
   recusada por nao ter rollback e por `SECURITY DEFINER` sem `pg_temp`. A branch a
   substituiu, antes do primeiro apply, por `20261107143505_..._hardened` com rollback, e fez
   o mesmo com `20261101190101` (clamp de `fn_global_search`) virando `20261107143509`.
2. **Parar de confiar na coluna remota da CLI**: ler o ledger real com
   `SELECT version FROM supabase_migrations.schema_migrations` e reconciliar local x remoto
   por conjunto, porque a CLI 2.101 lista a mesma versao como local_only e remote_only em
   duas linhas e isso travava o gate com drift falso.
3. **Endurecer a lista de excecoes** (`scripts/migration-ledger-remote-only-allowlist.json`):
   validacao fail-closed (schema_version, project_ref canonico, ordenacao, `versions_sha256`,
   procedencia do artifact que comprova cada versao, `reason`/`approved_by`), excecao obsoleta
   passando a bloquear, e a lista reduzida de muitas versoes para 13.
4. **Fazer o replay do shadow rodar**: semear o cron `generate-blurhashes` inativo e a
   associacao `auth.users` -> publication `supabase_realtime`, normalizar `CONCURRENTLY` e
   omitir `cron.alter_job` com ID fixo de producao.
5. **Colocar o proprio gate do ledger sob gatilho**: incluir o checker, o manifesto, o helper
   e o teste nos paths que disparam o drift-check (com teste que guarda isso).
6. **Atualizar a documentacao**: MIGRATIONS_SYNC_LOG.md, PENDENCIAS #22, catalogo de
   referencia e o comentario de rollback de `20261101202000`.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| Migration endurecida de `fn_get_rupture_alerts` (`SECURITY DEFINER`, `pg_temp`, ACL minima) + rollback | ESTA — renumerada para `20261112011000` e **ja aplicada em producao** | `supabase/migrations/20261112011000_fix_sb0003_fn_get_rupture_alerts.sql` (corpo identico ao da branch) + `supabase/rollbacks/20261112011000_rollback.sql`; recibo em `supabase/MIGRATIONS_SYNC_LOG.md:1135` ("2026-11-13 00:31:48 UTC … run 43233358789 … aplicada") e `:1456` |
| Clamp `LEAST(p_limit, 100)` em `fn_global_search` + rollback guardado por `pg_get_functiondef` | ESTA — renumerada para `20261115130300`, pendente de apply | `supabase/migrations/20261115130300_fn_global_search_clamp_limit_hardened.sql:30` (`v_lim_each := GREATEST(1, LEAST(p_limit, 100) / …)`); o header :11-13 cita a origem: "Conteudo = 20261107143509 da branch codex/fix-db-migration-preflight-261107 (nunca aplicada), renumerado"; rollback em `supabase/rollbacks/20261115130300_rollback.sql`; `MIGRATIONS_SYNC_LOG.md:1738-1749`; commit `b89a44e100` (PR #3665) |
| Reconciliar o ledger quando a CLI parte a mesma versao em duas linhas | ESTA — mesma causa raiz, tecnica diferente (subtracao por contagem, `pairedLate`/`paired_late_count`, em vez de conjuntos) | `scripts/check-supabase-migration-ledger.mjs` (bloco `pairedLate`, comentario "a CLI pareia as listas de forma sequencial … visto em 2026-11-12: 20261104100000"); commits `03b9fb2335` e `c7680be6c0`; testes `tests/scripts/check-supabase-migration-ledger.test.mjs:135,198` |
| Normalizar `CONCURRENTLY` apenas na copia do shadow | ESTA — como `sanitizeReplayMigration`, com contagem esperada por arquivo (mais estrito que a versao da branch) | `scripts/drift-baseline.mjs:350-380` (`REPLAY_PIPELINE_REWRITES`, `sanitizeReplayMigration`) |
| Semear o cron `generate-blurhashes` inativo no replay | ESTA | `scripts/drift-baseline.mjs:127-135` (`cron.schedule('generate-blurhashes', …)` + `cron.alter_job(job_id := v_id, active := false)`) |
| Reproduzir `auth.users` na publication `supabase_realtime` no replay | ESTA | `scripts/drift-baseline.mjs:173-187` (`ALTER PUBLICATION supabase_realtime ADD TABLE auth.users`) |
| Omitir `cron.alter_job(<id fixo>)` no shadow | ESTA por outro caminho, melhor: a main materializa os jobids reais (114, 224, 235, 241, 243, 276, 292, 303) em vez de pular o comando | `scripts/drift-baseline.mjs:88-170` (`v_fixed_ids`, `RAISE EXCEPTION 'drift replay: … jobid 235 …'`) |
| Catalogo de referencia apontando para a migration endurecida vigente | ESTA — a main ja aponta para `20261112011000` | `audit/supabase-reference-catalog.temporary.json`, entrada de `fn_get_rupture_alerts`/`useRuptureAlerts.ts` |
| Checker, manifesto, helper e teste do ledger nos gatilhos do drift-check | **NAO ESTA** | detector E40 da main: `.github/workflows/deploy-gates.yml:821` cobre so `drift-baseline|check-event-triggers-drift|check-cron-drift`; `git show origin/main:.github/workflows/db-schema-drift-check.yml \| grep check-supabase-migration-ledger` so acha a linha 236 (a execucao), nenhum path de gatilho |
| Ler o ledger remoto autoritativo (`SELECT version FROM supabase_migrations.schema_migrations`) | **NAO ESTA** (o helper existe: `scripts/supabase-read-only-query.mjs` esta na main) | a main nao importa `querySupabaseReadOnly` em `scripts/check-supabase-migration-ledger.mjs`; `auditSupabaseMigrationLedger` da main nao tem `authoritativeRemoteVersions` |
| Validacao fail-closed do manifesto de excecoes (`validateRemoteOnlyAllowlist`) | **NAO ESTA** | a main faz `JSON.parse(readFileSync(allowlistPath)).versions ?? []` dentro de `try { } catch { }` silencioso ("allowlist ausente é equivalente a lista vazia"); o arquivo na main tem so as chaves `versions,reason,approved_by` — 681 versoes, fora de ordem, sem `project_ref`, sem `versions_sha256`, sem procedencia |
| Excecao obsoleta bloqueando (`stale_allowlisted_remote_only`) | **NAO ESTA** | `ok:` da main exige apenas `blockingRemoteOnly==0 && mismatched==0 && malformedRows==0` |
| Testes das tres travas acima | **NAO ESTA** | na branch: `tests/scripts/check-supabase-migration-ledger.test.mjs:130,164,189,222,279`; na main nenhuma ocorrencia de `validateRemoteOnlyAllowlist`/`authoritativeRemoteVersions` nesse arquivo |
| Comentario de rollback de `20261101202000` (fail-closed) | **NAO ESTA** | `supabase/migrations/20261101202000_drop_revoke_agent_created_functions.sql` na main ainda diz "GRANT EXECUTE de volta em cleanup_expired_auth_sessions", mas `supabase/rollbacks/20261101202000_rollback.sql` faz `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` |
| PENDENCIAS #22 resolvido | **NAO ESTA** | `PENDENCIAS.md:379-401` da main segue "❌ rollback ausente + SECURITY DEFINER" e manda criar `supabase/rollbacks/20261101150000_rollback.sql` e disparar `version=20261101150000` — arquivo inexistente na main (`git ls-tree origin/main -- supabase/migrations/ \| grep 20261101150000` -> vazio) e conserto ja aplicado como `20261112011000` em 2026-11-13 |
| Registro das duas versoes no MIGRATIONS_SYNC_LOG | ESTA, com a numeracao da main | `MIGRATIONS_SYNC_LOG.md:1135` (recibo de `20261112011000`) e `:1732-1749` (secao de `20261115130300`, citando a substituicao da `20261101190101`) |

## A resgatar

1. **`.github/workflows/deploy-gates.yml` (job `check-schema-paths`, linha 821)** — incluir
   `scripts/check-supabase-migration-ledger.mjs`, `scripts/migration-ledger-remote-only-allowlist.json`,
   `scripts/supabase-read-only-query.mjs` e `tests/scripts/check-supabase-migration-ledger.test.mjs`
   no detector. *Por que importa:* hoje um PR que mexe justamente no portao do banco ou na lista
   de excecoes dele nao faz o portao rodar; a quebra so aparece depois, no cron diario ou direto
   na main. O teste-guarda da branch (`…test.mjs:279`) precisa ser adaptado: a main tirou o
   gatilho `pull_request` do `db-schema-drift-check.yml` em 2026-11-13, so o detector do E40 vale.
   *Regra do repo:* mexe em workflow -> PR fica aberta para o dono (Git 7).
2. **`scripts/check-supabase-migration-ledger.mjs`** — ler o ledger real
   (`SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`) com o
   `querySupabaseReadOnly` que ja existe na main, em vez de confiar na coluna remota da CLI.
   *Por que importa:* a main acerta o sintoma com heuristica de contagem; a leitura direta
   elimina a classe do problema e falha fechado quando o banco nao responde.
3. **`scripts/check-supabase-migration-ledger.mjs` + `scripts/migration-ledger-remote-only-allowlist.json`**
   — validacao fail-closed do manifesto (`project_ref` canonico, ordenacao, `versions_sha256`,
   `source.workflow_run_id/artifact_id/artifact_sha256/checked_at`, `reason`/`approved_by`) e
   excecao obsoleta bloqueando. *Por que importa:* esse arquivo e exatamente o que deixa uma
   versao aplicada em producao passar pelo portao; hoje, se ele for corrompido ou apagado, o
   `catch` silencioso trata como lista vazia e a auditoria perde o rastro de quem autorizou cada
   excecao. **Exige decisao do dono:** a branch tinha 13 excecoes contra 681 na main hoje, fora
   de ordem e sem procedencia — ligar a trava sem antes regerar a lista contra o ledger vivo
   derruba o portao do banco de imediato.
4. **`tests/scripts/check-supabase-migration-ledger.test.mjs`** — os casos que provam os itens
   2 e 3 (linhas 130, 164, 189, 222 da branch). *Por que importa:* sem eles as travas voltam a
   cair no proximo refactor sem ninguem notar.
5. **`supabase/migrations/20261101202000_drop_revoke_agent_created_functions.sql`** — corrigir o
   comentario do rollback (3 linhas). *Por que importa:* quem precisar reverter em incidente le
   "GRANT EXECUTE de volta" e o arquivo de rollback faz o oposto (REVOKE). A migration ainda esta
   pendente (`MIGRATIONS_SYNC_LOG.md:1109`), logo nao ha recibo com sha256 para invalidar.
6. **`PENDENCIAS.md` item 22** — marcar como resolvido com o numero certo. *Por que importa:* a
   lista de pendencias do dono manda hoje refazer um trabalho ja feito e aplicar uma versao que
   nao existe mais no repositorio.

## Risco de fechar esta branch

Nada de banco se perde: os dois consertos de banco que a branch criou estao na main, um deles
ja rodando em producao desde 13/11 e o outro aguardando o apply oficial — a propria main cita
esta branch como origem do segundo.

O que se perde se a branch for fechada sem resgate: o portao que decide se uma alteracao de
banco pode ir a producao continua (a) sem ser testado quando alguem mexe nele mesmo, e (b)
confiando numa lista de 681 excecoes sem ordem, sem soma de verificacao e sem registro de quem
autorizou cada uma. O efeito pratico e silencioso e caro: uma alteracao de banco entrar em
producao sem plano de volta porque a excecao que a liberou ninguem mais sabe explicar. Alem
disso, a lista de pendencias do dono fica mandando refazer um conserto ja feito (item 22), e o
comentario do plano de volta de uma migration ainda pendente segue dizendo o contrario do que o
arquivo faz.

## Nao verificado

- **Estado vivo de `fn_global_search` em producao:** nao consultei o banco canonico; a propria
  main registra "estado atual … NAO VERIFICADO em 2026-11-15" (`MIGRATIONS_SYNC_LOG.md:1749`).
  Nao sei se `20261115130300` ja foi aplicada depois disso.
- **Se a trava do manifesto passaria na main hoje:** nao executei
  `node scripts/check-supabase-migration-ledger.mjs` (exige credenciais do projeto canonico). A
  afirmacao de que as 681 excecoes derrubariam a validacao vem da leitura do codigo da branch
  (`validateRemoteOnlyAllowlist` exige ordenacao e `versions_sha256`) comparada com as chaves
  reais do arquivo na main (`versions,reason,approved_by`), nao de uma execucao.
- **Ordem do `search_path` em `fn_get_rupture_alerts`:** a branch usava
  `pg_catalog, public, pg_temp` e a main aplicou `public, pg_catalog, pg_temp`. Nao tratei como
  item a resgatar porque todas as referencias no corpo sao qualificadas
  (`public.mv_stock_rupture_alert`, `public.is_supervisor_or_above`, `auth.uid()`), mas nao
  testei o comportamento no banco.
- **Drift proprio da main (fora do escopo desta branch):** `audit/supabase-reference-catalog.temporary.json`
  ainda descreve `fn_get_rupture_alerts` como "nunca foi aplicada em producao", enquanto o recibo
  em `MIGRATIONS_SYNC_LOG.md:1135` mostra a aplicacao em 2026-11-13. Isso nasceu na main, nao aqui.
- **Nenhum arquivo ficou sem leitura:** o pacote trouxe os 15 arquivos com os dois diffs, sem
  marca de TRUNCADO.
