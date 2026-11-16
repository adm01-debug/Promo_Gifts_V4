# origin/claude/fix-migrations-acesso-rpcs-261112-1050

- **Veredito:** INCORPORADA_TOTAL  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** destravou 11 telas internas que davam erro de permissao ou "nao carregou" (confiabilidade de fornecedores, smoke tests, kill switch, saude do medallion, consumo de IA, fila de otimizacao, migracao de papeis, sync manual de conexoes, limpeza de telemetria, "Esqueci a senha" e o grafico de inteligencia de mercado) — e tudo isso ja esta na main, com 10 das 11 correcoes de banco ja aplicadas em producao em 14/11/2026.
- **Tip / merge-base / main:** tip `afdc7c3955e9aab1583abde270884d3d7625bb6a` · merge-base `fee3d0937cdaa5ff1cf93af07c38cfc8dedb902a` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Pelos 5 commits (bundle, linhas 6-50) a intencao era uma só, em camadas:

1. `7898bf20d4` — criar 11 migrations (com rollback cada uma) para 11 telas que falhavam em producao
   por `42501` (permissao negada) ou por RPC inexistente no banco, e trocar o front para consumir as
   RPCs novas; mais as excecoes do catalogo de referencias e as entradas da allowlist lint-0029.
2. `07d3959e94` — usar `untypedRpc` na migracao de papeis para nao precisar editar `types.ts`.
3. `907f786c3c` — registrar os recibos pendentes das 11 migrations em `supabase/MIGRATIONS_SYNC_LOG.md`.
4. `6b3450d797` — corrigir a guarda do sync de conexoes (a tela fica em `DevRoute`, mas a funcao exigia
   só `admin` sem hierarquia, então nenhum usuario real passava) e documentar as 8 `SECURITY DEFINER`
   novas na allowlist 0029 + `request_password_reset` na allowlist `secdef-anon`.
5. `afdc7c3955` (tip) — chamar a sobrecarga explicita de 3 argumentos de
   `sync_external_connections_from_credentials`, porque em producao existem `()` e `(text,text,uuid)`
   e a chamada sem argumentos falha com `42725` (ambigua).

A PR dessa branch (#3432) foi **fechada sem merge**, e o conteudo entrou na main por uma PR substituta
— o proprio ledger da main registra isso: "PR substituta da #3432"
(`supabase/MIGRATIONS_SYNC_LOG.md` na main, cabecalho da tabela "2026-11-12 — 10 telas com 42501 ou
RPC ausente"). Por isso o patch-id nao bate e a branch nao e ancestral da main; isso nao prova nada.

Medicao mecanica do escopo: a branch tocou **38 arquivos** vs merge-base; **28 deles estao
byte-identicos na main hoje**; os 10 que diferem foram conferidos um a um abaixo.
Comando: `git diff --name-only <branch> origin/main -- <os 38 arquivos>` devolve exatamente os 10
listados no pacote de evidencia.

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| 11 migrations de acesso/RPC (`20261112120000` a `20261112120900`) | Na main, **byte-identicas** (9 das 10) e **aplicadas em producao** | `git ls-tree -r --name-only origin/main -- supabase/migrations` lista as 10 (`20261112120000` … `20261112120900`); `MIGRATIONS_SYNC_LOG.md` da main, linhas 1146-1155: cada uma com `status: aplicada`, run do `db-apply-migration.yml` (43588905947 … 43590307044), entre 2026-11-14 11:13 e 11:31 UTC |
| 10 rollbacks correspondentes | Na main, byte-identicos | `git ls-tree -r --name-only origin/main -- supabase/rollbacks` lista `20261112120000_rollback.sql` … `20261112120900_rollback.sql`; `git diff <branch>:<arquivo> origin/main:<arquivo>` vazio para todos |
| Migration do grafico de mercado `20261112121000_fn_market_intelligence_macro.sql` | Na main **renumerada** para `20261115130100_fn_market_intelligence_macro.sql`, com o corpo SQL identico | o cabecalho da migration na main diz literalmente: "Versao anterior desta migration: 20261112121000 na branch claude/fix-migrations-acesso-rpcs-261112-1050 (nunca aplicada; renumerada para ficar atras do indice)" (`supabase/migrations/20261115130100_fn_market_intelligence_macro.sql:23-24`); diff do bloco `CREATE OR REPLACE ... GRANT` entre os dois arquivos = **IDENTICO** |
| Rollback `20261112121000_rollback.sql` | Na main como `20261115130100_rollback.sql`, texto identico | `git show origin/main:supabase/rollbacks/20261115130100_rollback.sql` traz as mesmas 4 linhas de comentario e o mesmo `DROP FUNCTION IF EXISTS public.fn_market_intelligence_macro(integer, uuid);` |
| Guarda dev **OU** admin no sync de conexoes (commit `6b3450d797`) | Na main | `supabase/migrations/20261112120700_...sql` na main contem `public.is_dev((SELECT auth.uid()))` + `has_role(... ,'admin')`; o unico diff vs a branch e o `search_path` (abaixo) |
| Chamada explicita da sobrecarga de 3 args (tip `afdc7c3955`, erro `42725`) | Na main | `supabase/migrations/20261112120700_...sql:48` na main: `RETURN public.sync_external_connections_from_credentials(NULL::text, 'manual'::text, (SELECT auth.uid()));` e a pos-checagem anti-ambiguidade nas linhas 68-73 (`RAISE EXCEPTION 'connections-sync: wrapper chama ... sem argumentos (ambiguo, 42725)'`) |
| 8 entradas novas na allowlist lint-0029 | Todas as 11 funcoes citadas estao na main | `git show origin/main:.security/lint-0029-allowlist.json` contem `public.` + `admin_execute_role_migration_batch`, `claim_next_optimization`, `complete_optimization`, `enqueue_optimization`, `fn_admin_run_smoke_tests`, `fn_admin_smoke_tests_dashboard`, `fn_admin_sync_external_connections`, `fn_dev_medallion_health`, `fn_get_supplier_reliability`, `fn_insights_cache_count`, `request_password_reset` — 1 ocorrencia de cada |
| `request_password_reset` na allowlist `secdef-anon` | Na main, byte-identico | `.security/secdef-anon-allowlist.json` nao aparece na lista dos 10 arquivos que diferem (esta entre os 28 identicos) |
| Documentacao em `docs/security/ALLOWLISTS_MEMORY.md` | Na main | `git show origin/main:docs/security/ALLOWLISTS_MEMORY.md` contem as familias "Admin de conexoes", "Consumo de IA", "Fila de otimizacao", "Smoke tests admin", "Saude medallion", "Confiabilidade de fornecedores", "Reset de senha" e o bloco `admin_execute_role_migration_batch` (todas as 7 funcoes grepadas: 1+ ocorrencia cada) |
| 8 excecoes novas em `audit/supabase-reference-catalog.temporary.json` | Todas na main | grep em `git show origin/main:audit/...temporary.json`: 1 ocorrencia de cada um de `fn_admin_smoke_tests_dashboard`, `fn_admin_run_smoke_tests`, `fn_dev_medallion_health`, `fn_insights_cache_count`, `request_password_reset`, `admin_execute_role_migration_batch`, `fn_market_intelligence_macro`, `fn_get_supplier_reliability` |
| Front: hook do grafico de mercado passa a usar a RPC | Na main, **com melhoria** | `src/hooks/intelligence/useMarketIntelligenceMacro.ts` na main: `import { untypedRpc }` (linha 7) e `untypedRpc('fn_market_intelligence_macro', ...)` (linha 92). A main acrescentou o campo `aggregationUnavailable` e o tratamento de `PGRST202`, para a tela nao mostrar "Erro ao carregar dados de mercado" enquanto a migration nao for aplicada |
| Front: os outros 8 arquivos tocados (`useSmokeTests`, `useMedallionHealth`, `useRoleMigration`, `useKillSwitchObservability`, `useSupplierReliabilityServer`, `SupplierReliabilityTab`, `usePasswordResetRequests`, `useOptimizationQueue`, `MarketIntelInsightsUsagePanel`) | Na main, byte-identicos | nenhum deles aparece na lista dos 10 que diferem; `git diff <branch> origin/main -- <os 38>` nao os retorna |
| Teste e2e: mock da RPC `request_password_reset` | Na main, **com melhoria** | `e2e/flows/forgot-password-flow.spec.ts` na main mantem `page.route('**/rest/v1/rpc/request_password_reset*' ...)` com `status: 204` (exatamente o que a branch escreveu) e ainda troca `page.goto` por `gotoAndSettle` |
| Recibos das 11 migrations no `MIGRATIONS_SYNC_LOG.md` | Na main | tabela "2026-11-12 — 10 telas com 42501 ou RPC ausente" (`MIGRATIONS_SYNC_LOG.md` da main, linhas ~1459-1473), com os mesmos `version`/`arquivo`/`sha256` da branch; a 11a (`20261112121000`) migrou para a tabela da `20261115130100` (linha 1714) |

**Onde a main esta a frente da branch (3 pontos, todos a favor da main):**
1. `search_path` do wrapper de conexoes: a branch usava `''`, a main usa `'pg_catalog', 'pg_temp'` —
   porque o preflight E066 do `db-apply-migration.yml` (`detectSecurityDefinerWithoutPgTemp`) barra `''`
   (comentario em `20261112120700_...sql:19-21` na main). A branch nao teria passado no portao.
2. A RPC do grafico de mercado foi renumerada para depois do indice `20261115130000`
   (`CREATE INDEX CONCURRENTLY`), porque o `EXPLAIN` em producao em 15/11 deu Parallel Seq Scan em
   ~3,1M linhas — exatamente o risco que a propria branch havia escrito como "Performance: NAO MEDIDA".
3. O front do grafico ganhou o estado "agregacao indisponivel" em vez de tela de erro.

## A resgatar

Nada. Nenhum item desta branch ficou de fora da main.

## Risco de fechar esta branch

Nenhum risco para o negocio. As 10 correcoes de banco desta branch ja rodaram em producao em
14/11/2026 (recibos no ledger da main) e a 11a esta versionada na main como `20261115130100`,
pendente de aplicacao junto com o indice `20261115130000`. Apagar a branch nao desfaz nada: o codigo
esta na main e o banco ja mudou. O unico valor residual da branch e historico (ela e citada por nome
dentro da migration `20261115130100` da main, que continua existindo mesmo sem a branch).

Observacao para o dono, que **nao e desta branch** e sim um defeito de documentacao vivo na main:
no `supabase/MIGRATIONS_SYNC_LOG.md` da main a tabela das 10 migrations (linhas 1464-1473) ainda diz
"pendente — aguarda aprovacao do dono", enquanto a secao de recibos logo acima (linhas 1146-1155) diz
"aplicada" em 14/11. Quem ler so a tabela conclui que falta aplicar algo que ja foi aplicado, e pode
tentar aplicar de novo. Vale uma correcao de uma linha por PR.

## Nao verificado

- **Comportamento em producao das 10 migrations aplicadas.** A evidencia de aplicacao e o ledger da
  main (runs do `db-apply-migration.yml`), nao uma consulta ao `pg_catalog` feita nesta analise. Nao
  consultei o banco canonico `doufsxqlfjyuvxuezpln` para confirmar que as 11 funcoes existem e com
  quais grants. Nao e necessario para o veredito (a questao e "o trabalho entrou na main?", e entrou),
  mas nao afirmo que as telas estao funcionando.
- **Se as excecoes do catalogo de referencias deveriam ter sido promovidas a `rpcs`.** Agora que as
  migrations foram aplicadas, as 7 excecoes `stage 103` dizem "remover depois de confirmar via
  pg_catalog" — nao verifiquei se essa limpeza e devida. E trabalho da main, nao desta branch.
