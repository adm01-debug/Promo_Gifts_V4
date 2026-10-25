# Backlog O1/O3 — Banco (migrations × produção)

Projeto de produção confirmado: `doufsxqlfjyuvxuezpln` (MCP "Gestão de Produtos"; `get_project_url` → `https://doufsxqlfjyuvxuezpln.supabase.co`).
Medido em 2026-10-25 (leitura): `supabase_migrations.schema_migrations` = **2549** linhas (2539 com versão de 14 dígitos), `max(version)=20261025002500`, `cron.job` = 142 (135 ativos).
Repo: `main` @ `7d3bd4ba`, 3000 arquivos em `supabase/migrations/`. Fontes: `estado/ledger_parity_2026-10-25.md` (@416192e7), `estado/ledger_classificacao_2026-10-25.md`, `auditoria-supabase/correcoes.md`, `analise-branches/cruzamento-supabase.md`.
Detalhe por migration: [`banco_migrations_460.tsv`](./banco_migrations_460.tsv).

## Método da prova (O3)
Postgres 16 temporário (`tmpprod`) carregado com `supabase/baseline/20261015140000_baseline_schema.sql` + stubs de `auth`/`cron`/`storage`/roles. Resultado: **398 tabelas em `public` = 398 em produção** (baseline da auditoria). Cada uma das 460 migrations só-no-repo rodou **isolada** num clone do banco (`psql -v ON_ERROR_STOP=1`), com comparação de `pg_dump -s` antes/depois: `LIMPA_NOOP` = roda sem erro e não altera o schema; `LIMPA_MUDA` = roda sem erro e altera o schema; `ERRO_*` = falhou.
Limites (NÃO VERIFICADO): (a) o histórico não reconstrói o banco do zero (CLAUDE.md), então a prova é migration-por-migration sobre o baseline, não a cadeia inteira; (b) `LIMPA_NOOP` não enxerga DML/dados nem cron (cron.job é stub); (c) `ERRO_AMBIENTE` = precondição que consulta `cron.job`/`storage`/`ops` reais — inconclusivo localmente; (d) o baseline é de 15/10, produção tem migrations posteriores. Nada foi escrito em produção.

## Resumo
| Grupo | Total | LIMPA_NOOP | LIMPA_MUDA | ERRO_AMBIENTE | ERRO_DEP/DEFEITO |
|---|---|---|---|---|---|
| Nome ausente em prod (nunca rodou) | 302 | 87 | 133 | 17 | 65 |
| Cópia-fantasma (mesmo nome já aplicado em prod com outra versão) | 158 | 56 | 72 | 4 | 26 |
| Só em prod | 7 | — | — | — | — |

Observação: o gate E40 "Ledger parity" reportou 1097/645 no run 40175855974; a medição direta dá 460 só-no-repo (302+158) e 7 só-em-prod. A divergência vem de uma branch antiga no run do CI e de uma allowlist inflada (ver DB-005 e DB-008). Por versão, no `main`: 457 só-no-repo e 11 só-em-prod.

## Itens

| ID | Descrição | Camada | Sev. | Esforço | Depende de | Ação / estado |
|---|---|---|---|---|---|---|
| DB-001 | 302 migrations do repo nunca registradas em prod | sql | Alta | G | DB-003 | Subdividido abaixo |
| DB-001a | 87 `LIMPA_NOOP` (sem efeito no schema; 12 a heurística de catálogo marcou "efeito já presente", 71 sem objeto rastreável, 4 parciais) | sql | Média | P | revisão do corpo (DML) | Registrar no ledger com `migration repair --status applied <versão>` explícita via `db-apply-migration.yml` (repair-only). **Escrita no ledger de produção → AGUARDANDO APROVAÇÃO** |
| DB-001b | 133 `LIMPA_MUDA` (alteram schema; heurística: 22 não aplicadas, 45 parciais, 35 sem objeto rastreável, 31 "efeito já presente" — estas 31 divergem da heurística e precisam de diff objeto-a-objeto) | sql | Alta | G | decisão por lote | Para cada lote: aplicar (DDL em prod), espelhar (efeito já existe de outra forma) ou descartar com motivo. **Tudo AGUARDANDO APROVAÇÃO** |
| DB-001c | 65 `ERRO_DEP/DEFEITO`: não aplicam sobre o estado atual (tabela/função inexistente, policy duplicada, sintaxe) | sql | Alta | M | DB-001b | Aposentar com motivo ou criar migration corretiva nova; nunca editar a antiga |
| DB-001d | 17 `ERRO_AMBIENTE` fechados lendo produção (ver seção abaixo): 6 aplicáveis/parciais, 3 já com efeito, 2 obsoletas, 2 bloqueadas por e30, 4 a rever | sql | Média | P | aprovação | Resultado em "Os 17 inconclusivos" |
| DB-002 | 158 migrations com o mesmo nome de uma já aplicada em prod, mas outra versão. **São cópias-fantasma**: em 156 casos o repo já tem o arquivo com a versão de prod (151 têm o mesmo conteúdo do ledger por hash; 9 diferem); a cópia-fantasma tem versão sintética e, em 151 de 156, conteúdo diferente | repo | Alta | M | PRs #2420, #2443, #2449 | Retirar as cópias-fantasma (git rm, só repo) depois de revisar as diferenças de conteúdo; rever os 9 arquivos de prod que não batem com o ledger |
| DB-003 | 5 prefixos de versão duplicados no repo: `20260525232003`, `20260622111500`, `20260622130000`, `20260623000008`, `20260902220800` (cada um com um `repair_only_marker` + migration real) | repo | Alta | P | — | O CLI não distingue as duas; renomear o marker (só repo). Aguarda definir se o marker é necessário |
| DB-004 | 7 versões só em prod: `001`..`005` (legado), `20260611014515 fn_dryrun_standardize_supplier_real_rollback`, `20260712 fix_rls_policies_critical` | repo | Média | P | — | Criar migration espelho para as duas nomeadas (CLAUDE.md, E99) |
| DB-005 | Gate "Ledger parity": o script NÃO mente. Rodei `check-supabase-migration-ledger.mjs` com os arquivos do `main` @7d3bd4ba contra as versões de produção: `local_only=457`, `remote_only=11` (8 na allowlist, **3 sem allowlist**), `blocking=3` → o gate bloquearia hoje por `20260623_bugalert1`, `20260623_create_process_notifications_queue_rpcs`, `20260623_fix_google_provider_secret_name` (versões não numéricas no ledger). Os 1097/645 do run 40175855974 vieram de uma branch sem ~637 arquivos-espelho que hoje existem no `main` | workflow | Média | P | decisão | Ver DB-008 |
| DB-006 | `types.ts` igual ao schema real | front | Média | P | DB-001b | NÃO VERIFICADO nesta thread (auditoria: types.ts 1607 entradas × 398 tabelas) |
| DB-007 | CORRIGIDO: `20261022194000/194100/194200` e `20261024163500` **estão** no ledger de produção e no `main` (consulta em produção). `analise-branches/cruzamento-supabase.md` está desatualizado nesse ponto | doc | Baixa | P | — | Atualizar o cruzamento; não há migration de segurança pendente nesse grupo |
| DB-008 | `scripts/migration-ledger-remote-only-allowlist.json` tem 645 versões, das quais 637 hoje existem como arquivo no repo (entradas velhas que mascaram divergência real). Reais: 001-005, `20260611014515`, `2026062311292414001`, `20260712` + 3 versões não numéricas do ledger | workflow | Média | P | decisão | Reduzir a allowlist às 8 reais e tratar as 3 não numéricas; arquivo de gate → AGUARDANDO APROVAÇÃO |

### Propostas da auditoria (P01..P19) — estado segundo `auditoria-supabase/correcoes.md`
| ID | Proposta | Estado |
|---|---|---|
| DB-P01 | P01 auth headers cron (jobid 235) | Aplicado (run #40166925674, ledger `20261024190001`) |
| DB-P02 | P02 índices FK | Aplicado (run #40164828396, `20261024180001`) |
| DB-P03a | P03 ANALYZE (+ migration `20261025002500`) | Aplicado (#40165426404; ledger confirmado `max(version)=20261025002500`) |
| DB-P08 | P08 idempotência workspace_notifications | Aplicado (`20261024180002`) |
| DB-P10 | P10 REVOKE `fn_cron_guard` | Aplicado (`20261022100001`) |
| DB-P12 | P12 run-script auth | Coberto por P01 |
| DB-P19 | P19 redistribuição de crons | Aplicado (`20261022193000`, `20261024180003`) |
| DB-P06/P09/P14/P15/P03s | views invoker, reconciliação do ledger, initplan RLS, anon SELECT, search_path | PR #2443 aberta, **aguardando PO**; P09 se sobrepõe a DB-001/002 |
| DB-P04/P05/P07/P11/P13/P16/P17/P18 e P01_rls_restrictive | storage policies, índices duplicados, recibos with_check, view materializada, audit exceptions, pg_net, guard, wrapper RLS | Sem registro de aplicação em `correcoes.md` → classificar (aplicar/descartar) na próxima etapa |

## Os 17 inconclusivos (leitura em produção, 2026-10-25)
| Migration | Estado real em prod | Resolução |
|---|---|---|
| `20260604000002_webhook_idempotency` | roda limpa em transação (o erro era do teste sem transação); `idx_webhook_idempotency` já existe | diffar o restante |
| `20260619210000_fix_cron_connections_auto_test_canonical_url` | job 211 já usa a URL canônica | efeito presente → ledger |
| `20260621220000_faxina_restore_kit_builder_family_APLICADO` | `custom_kits` e `kit_comments` fora da publication `supabase_realtime` | parcial |
| `20260621230000_faxina_restore_security_notifications_APLICADO` | `notifications` e `device_login_notifications` já na publication | efeito presente → ledger |
| `20260916201000_e19_comment_rls_deny_intentional` | as 2 tabelas já têm policy; comentários ainda nulos | obsoleta; migration nova só de COMMENT |
| `20260916202000_e23_force_rls_secret_tables` | precondição passa; `secret_rotation_log` e `integration_credentials` sem FORCE RLS | aplicável (segurança) |
| `20260917070000_e38_unschedule_dead_cron_jobs` | jobs 274 e 202 inativos, função ausente, `webhook_outbox` vazia | aplicável |
| `20260917080000_e35_fix_reposicao_backfill_perf` | job 117 já em `42 */4 * * *` (a migration exige `5 * * * *`) | obsoleta |
| `20260917090000_e47_fix_schema_drift_cron_split` | job 245 no padrão esperado | aplicável |
| `20260917100000_e37_split_genuine_multistatement_cron` | jobs 233/208/195/53 no padrão esperado | aplicável |
| `20260917150000_e40_ops_pgss_history`, `20260917160000_e33_ops_wraparound_monitor` | schema `ops` não existe; dependem de e30 (não aplicada) | bloqueadas por e30 |
| `20260920120000_fix_handle_new_user_missing_profiles_user_id` | `handle_new_user` já referencia `user_id`; a migration abortaria | efeito presente |
| `20261008230000_restringir_anon_mockup_approval_links` | anon já sem SELECT/INSERT; policy `mal_public_select_active` ainda existe; tabela com 0 linhas | parcial (limpeza de policy + policy de storage) |
| `20261022100020/21/22` (agenda dos crons) | jobs 296, 243, 204 existem com a agenda antiga (4 execuções/hora → 6) | aplicáveis |

## Diff objeto a objeto (133 + 72 que alteram o schema)
Para cada migration `LIMPA_MUDA` foi gerado o diff do `pg_dump -s` contra o baseline. Das 133 ausentes em prod, 77 mexem em grants/policies/RLS. Resumo (grants comparados com o baseline; hardening conferido ao vivo em produção):
- **13 endurecem e não estão aplicadas**: conferido ao vivo, `anon` ainda tem EXECUTE em 18 funções (ex.: `fn_check_geo_access`, `enforce_seller_cart_limit`, 10 de `20260619155129`) e `authenticated` em 105 (de 109 conferidas). Só `mcp_kv_get` (e18) já está revogada. Atenção: parte das funções `anon` é do catálogo público (`fn_global_search`, `fn_super_filtro*`, `get_catalog_bestseller_page`); `20260716000063/67` revogariam o anon do catálogo. Decisão de negócio antes de aplicar.
- **10 regridem a segurança** (concedem a `anon` o que o baseline já não tem) e **34 ampliam acesso** a `authenticated`: não aplicar como estão; descartar com motivo ou reescrever. Ex.: `restore_authenticated_rpc_grants` (587 grants).
- 12 mexem em policy/RLS, 8 só em `service_role`/outros.
- As 16 de índice, 38 "outro" e 2 de view seguem para revisão por lote.
Limites: comparação de funções por nome (não por assinatura); grants do baseline de 15/10; diffs completos em `/tmp` desta sessão, não versionados (reproduzíveis com o método acima).

## Próximo passo da O3 (nesta frente)
1. Propor a retirada das 158 cópias-fantasma (DB-002) e rever os 9 arquivos de prod que não batem com o ledger.
2. Propor a limpeza da allowlist e o tratamento das 3 versões não numéricas (DB-008).
3. Decidir com o PO os 13 endurecimentos e os 44 que regridem/ampliam acesso, e só então abrir PRs de migration nova.

## AGUARDANDO APROVAÇÃO (banco)
| Item | O que muda em produção | Risco | Rollback |
|---|---|---|---|
| DB-001a | Só linhas no ledger (`schema_migrations`), sem DDL | Baixo (se DML ausente) | `migration repair --status reverted <versão>` explícita |
| DB-001b | DDL real (grants, policies, índices, funções) | Alto por lote | Por migration, exige rollback escrito |
| Endurecimentos (13) | REVOKE de EXECUTE a `anon`/`authenticated` | Alto: pode quebrar catálogo público | Reverter GRANT |
| DB-008 | Allowlist do gate de ledger | Baixo | Reverter o commit |
| Aplicáveis dos 17 (e23, e37, e38, e47, 3 agendas) | DDL em `cron.job` e FORCE RLS | Médio | Reagendar / NO FORCE |
