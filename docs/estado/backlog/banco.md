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
| Nome aplicado em prod com outra versão | 158 | 56 | 72 | 4 | 26 |
| Só em prod | 7 | — | — | — | — |

Observação: o gate E40 "Ledger parity" reportou 1097/645 no run 40175855974; a medição direta dá 460 só-no-repo (302+158) e 7 só-em-prod. A divergência é do parser do gate (ver DB-005).

## Itens

| ID | Descrição | Camada | Sev. | Esforço | Depende de | Ação / estado |
|---|---|---|---|---|---|---|
| DB-001 | 302 migrations do repo nunca registradas em prod | sql | Alta | G | DB-003 | Subdividido abaixo |
| DB-001a | 87 `LIMPA_NOOP` (sem efeito no schema; 12 a heurística de catálogo marcou "efeito já presente", 71 sem objeto rastreável, 4 parciais) | sql | Média | P | revisão do corpo (DML) | Registrar no ledger com `migration repair --status applied <versão>` explícita via `db-apply-migration.yml` (repair-only). **Escrita no ledger de produção → AGUARDANDO APROVAÇÃO** |
| DB-001b | 133 `LIMPA_MUDA` (alteram schema; heurística: 22 não aplicadas, 45 parciais, 35 sem objeto rastreável, 31 "efeito já presente" — estas 31 divergem da heurística e precisam de diff objeto-a-objeto) | sql | Alta | G | decisão por lote | Para cada lote: aplicar (DDL em prod), espelhar (efeito já existe de outra forma) ou descartar com motivo. **Tudo AGUARDANDO APROVAÇÃO** |
| DB-001c | 65 `ERRO_DEP/DEFEITO`: não aplicam sobre o estado atual (tabela/função inexistente, policy duplicada, sintaxe) | sql | Alta | M | DB-001b | Aposentar com motivo ou criar migration corretiva nova; nunca editar a antiga |
| DB-001d | 17 `ERRO_AMBIENTE`: guardas que leem `cron.job`/`storage`/`ops` reais (ex.: `20260917090000`, `20261008230000`, `20261022100020..22`) | sql | Média | M | branch Supabase ou stubs melhores | Provar em branch Supabase (custo → aprovação) ou ler o estado real por SELECT e fechar |
| DB-002 | 158 migrations aplicadas em prod com **outra versão** (mesmo nome). Conteúdo igual só provável em 17/158 por hash (o CLI normaliza statements) | sql/repo | Alta | M | PRs #2420, #2443, #2449 | Opções: `git mv` para a versão de prod (só repo) ou registrar a versão do arquivo. Sequenciar após as PRs abertas que tocam `supabase/migrations/` |
| DB-003 | 5 prefixos de versão duplicados no repo: `20260525232003`, `20260622111500`, `20260622130000`, `20260623000008`, `20260902220800` (cada um com um `repair_only_marker` + migration real) | repo | Alta | P | — | O CLI não distingue as duas; renomear o marker (só repo). Aguarda definir se o marker é necessário |
| DB-004 | 7 versões só em prod: `001`..`005` (legado), `20260611014515 fn_dryrun_standardize_supplier_real_rollback`, `20260712 fix_rls_policies_critical` | repo | Média | P | — | Criar migration espelho para as duas nomeadas (CLAUDE.md, E99) |
| DB-005 | Gate E40 "Ledger parity": 1097/645 vs 460/7 medidos | workflow | Média | M | — | Reproduzir com o CLI do CI (2.101) e comparar com o ledger; não alterar o gate sem causa raiz |
| DB-006 | `types.ts` igual ao schema real | front | Média | P | DB-001b | NÃO VERIFICADO nesta thread (auditoria: types.ts 1607 entradas × 398 tabelas) |
| DB-007 | Migrations de segurança fora do `main` (branches): `20261024163500` (ACL regrole), `20261022194000/194100/194200` (REVOKE anon em `external_connections`, `mockup_approval_links`, `mcp_kv_get`) | sql | Alta | P | decisão | Origem: `analise-branches/cruzamento-supabase.md`; DDL destrutiva → AGUARDANDO APROVAÇÃO com rollback |

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

## Próximo passo da O3 (nesta frente)
1. Fechar DB-001d lendo `cron.job`/`storage` reais de prod (SELECT) e reclassificar.
2. Para DB-001b, diff objeto-a-objeto prod × efeito da migration, por lote (segurança/grants primeiro).
3. Gerar o PR único de registro de ledger (DB-001a) e o de renomeação (DB-002/003) após as PRs #2420/#2443/#2449.

## AGUARDANDO APROVAÇÃO (banco)
| Item | O que muda em produção | Risco | Rollback |
|---|---|---|---|
| DB-001a | Só linhas no ledger (`schema_migrations`), sem DDL | Baixo (se DML ausente) | `migration repair --status reverted <versão>` explícita |
| DB-001b | DDL real (grants, policies, índices, funções) | Alto por lote | Por migration, exige rollback escrito |
| DB-007 | REVOKE/DROP POLICY | Médio (quebra cliente anon) | Reverter GRANT/POLICY |
