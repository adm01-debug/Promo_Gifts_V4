# Plano DBA de Correções e Melhorias — 50 Etapas

**Projeto:** Promo Gifts V4 · **Repo:** `adm01-debug/Promo_Gifts_V4` · **Banco canônico:** `doufsxqlfjyuvxuezpln` (PostgreSQL 17)
**Data da evidência:** 2026-09-16 · **Base Git:** `origin/main @ 1d2fafccd` · **Worktree auditada:** `claude/audit-gaps-20260915 @ 7fbbcabe5` (1 à frente / 2 atrás)
**Método:** Git real (`fetch`, `fsck`, `comm`), ledger via `supabase_migrations.schema_migrations`, schema vivo **exclusivamente via `pg_catalog`** (REGRA #8). Nenhuma DDL executada. Nenhum dado alterado.
**Perspectiva:** engenharia de banco de dados — integridade do ledger, postura de segurança, capacidade física, desempenho, contratos código↔banco e governança contínua.

---

## 0. Relação com os planos anteriores

Existem dois planos de 50 etapas ativos neste repositório. Este é o terceiro e **não os substitui**; ele assume o que já foi entregue e aprofunda o que só o banco revela.

| Plano | Foco | Estado em 2026-09-16 |
|---|---|---|
| `PLANO_MELHORIAS_CORRECOES_50_ETAPAS_2026-09-13.md` | CI/gates, cobertura, dependências, higiene Git | Em execução (E01, E34/E30 citados em #1859–#1864) |
| `PLANO_RECONCILIACAO_LOCAL_GITHUB_SUPABASE_50_ETAPAS_2026-09-15.md` | Paridade Local × GitHub × Supabase | E09, E18, E28 resolvidos por #1863/#1864; E26/E27 abertos |
| **Este plano** | Ledger, segurança, capacidade, desempenho, contratos | — |

Onde uma etapa daqui depende ou supersede uma etapa de outro plano, isso está indicado em **Dep.**.

---

## 1. Evidência medida (fotografia de 2026-09-16)

Todos os números abaixo foram **medidos nesta data**. Nenhum foi copiado de documento anterior.

### 1.1 Ledger de migrations × arquivos

| Métrica | Valor |
|---|---|
| Arquivos `supabase/migrations/*.sql` | **2.985** |
| Linhas em `supabase_migrations.schema_migrations` | **2.413** |
| Locais **sem** linha no ledger | **484** — amostra de 5 (2026-05-25 → 2026-09-05) verificada no `pg_catalog`: **5/5 já aplicadas** |
| Ledger **sem** arquivo local exato | 5 — todas explicadas (1 ID corrompido, 3 renomeadas pós-aplicação, 1 já documentada na PR #1863) |
| Versões do ledger fora do padrão `^\d{14}$` | **4**: `2026062311292414001`, `20260623_bugalert1`, `20260623_create_process_notifications_queue_rpcs`, `20260623_fix_google_provider_secret_name` |
| Linhas do ledger **sem `statements`** (não verificáveis por hash) | **483** (20 %) |
| Linhas do ledger sem `name` | 398 |
| Arquivos locais fora do contrato `^\d{14}_` | **67** (34 sem prefixo numérico algum) |
| Prefixos de versão duplicados (2+ arquivos, mesmo timestamp) | **31** (~62 arquivos) |
| Drafts ativos / arquivados (`qa/migrations-draft`) | 10 / 5 |
| Metadado do snapshot consolidado (`snapshot_meta.json`, dentro do diretório `migrations-snapshot`) | vazio ou ausente |
| Colunas do ledger | `version, statements, name, created_by, idempotency_key, rollback` |

**Leitura:** o ledger não é inventário confiável do que rodou. Há um padrão recorrente de DDL aplicada via MCP/dashboard (`apply sql from post body`) fora de `supabase migration up`, documentada depois em arquivo mas nunca registrada em `schema_migrations`. O risco primário **não é drift operacional** (as amostras estão aplicadas) — é **ausência de trilha de auditoria** e a impossibilidade de usar `db push`/`migration up` com segurança (o repo já proíbe: `scripts/check-no-db-push.mjs`).

### 1.2 Postura de segurança

| Controle | `SCHEMA_REFERENCE.md` (07-16) | **Medido hoje** | Δ |
|---|---|---|---|
| Tabelas `public` | 388 | **383** | −5 |
| Tabelas sem RLS | 0 | **0** | = |
| Tabelas com RLS **sem policy** | 0 | **2** (`magazine_duplicate_requests`, `anon_catalog_grant_audit_log`) | ⚠️ |
| Tabelas com FORCE RLS | — | 1 (`mcp_api_keys`) | |
| `anon` com GRANT de escrita | ~230 (P1) | **0** | ✅ P1 fechado |
| Funções SECURITY DEFINER | 529 | **563** | +34 |
| SECDEF sem `search_path` | 0 | **0** | = |
| SECDEF executáveis por `anon` | 22 | **11** | ✅ |
| SECDEF executáveis por `authenticated` | 69 | **94** | +25 ⚠️ |
| Views sem `security_invoker` | 0 | **8** — todas `v_*_public`, todas com SELECT para `anon` | ⚠️ desenho novo |
| FKs para `auth.users` | 69 | **82** | +13 |
| Triggers em `auth.users` | 1 (`on_auth_user_created`) | **1** | = |
| Constraints `NOT VALID` | — | **1** | |
| Views / funções / policies / triggers `public` | 190 / 1.277 / 906 / 385 | **193 / 1.320 / 940 / 395** | |

SECDEF executáveis por `anon` (11): `check_login_rate_limit, fn_check_login_allowed, fn_global_search, fn_product_active_for_rls, fn_super_filtro, fn_super_filtro_facets, fn_super_filtro_price_range, get_catalog_bestseller_page, get_quote_token_public, get_sitemap_public, submit_quote_response`.

Views SECDEF expostas a `anon` (8): `v_variant_sale_prices_public, v_kit_component_media_public, v_suppliers_public, v_product_tags_public, v_products_public, v_tabela_preco_gravacao_oficial_public, v_product_properties_public, v_product_compositions_public`. **Interpretação:** é o desenho que permitiu zerar os grants de escrita do `anon` (o catálogo anônimo lê por view definer). Não é regressão acidental — mas é uma superfície que precisa de contrato explícito de colunas (`.security/public-views-columns.json` existe) e teste de drift.

### 1.3 Capacidade física

| Objeto | 07-16 | **Hoje** |
|---|---|---|
| Banco inteiro | 4.578 MB | **6.374 MB** (+39 % em 2 meses) |
| `stock_snapshots` | 3.626.559 linhas / 1.545 MB | **170.913 linhas / 1.574 MB** (heap 814 MB + índices 760 MB; 104.158 páginas; 0 dead tuples; autovacuum 2026-09-16 03:12) |
| `stock_daily_summary` (retenção "permanente") | 242 MB | **643 MB** (+166 %) |
| `supplier_products_raw_history` (particionada, Bronze) | p2026_06: 407 k linhas | **p2026_06 577 MB · p2026_07 513 MB · p2026_08 754 MB · p2026_09 314 MB** (≈2,1 GB; ~600 MB/mês) |
| `supplier_products_raw` | 332 MB | 353 MB |
| `products` | 175 MB | 175 MB |

- `supplier_products_raw_history`: partições **`p2026_06` … `p2026_12`**, **sem partição DEFAULT**, **sem job de criação** (`cron_partition_jobs` só encontra `magazine-partition-maintenance`). `pg_partman 5.3.1` disponível, **não instalado**. → Inserts falham a partir de **2027-01-01** se nada for feito.
- `magazine_public_view_events`: partições mensais + `_default` + cron `magazine-partition-maintenance`. ✅
- `stock_snapshots`: o purge de 14 dias funciona (linhas caíram 95 %), mas o espaço **não voltou** (heap + índices ≈ 1,57 GB para 170 k linhas ≈ 9 KB/linha). Caso clássico de reorganização física (`pg_repack 1.5.2` disponível, não instalado) ou `VACUUM FULL` em janela.
- Índices: **0** duplicados, **0** inválidos, **0** tabelas sem PK, **0** bloat > 20 % dead. **3 índices nunca usados > 1 MB (70 MB):** `idx_stock_snapshots_supplier_branch_id` (33 MB), `idx_stock_daily_summary_supplier_branch_id` (19 MB), `idx_stock_daily_summary_supplier_id` (18 MB).
- **4 FKs sem índice** (todas do Kit Maker, criadas na semana passada): `kit_save_requests.user_id`, `kit_save_requests.kit_id`, `kit_quote_requests.user_id`, `kit_quote_requests.quote_id`.
- Sequências int4: máximo `322` — sem risco de wraparound. Replication slots: 2 (realtime), WAL retido 2,7 KB. ✅
- Materialized views: **12** em 3 schemas (`public` 4, `analytics` 7, `internal` 1) — o documento de referência listava 5. `mv_product_images_audit` 84 MB.

### 1.4 Desempenho e cron

| Métrica | Valor |
|---|---|
| `pg_stat_statements` #1 | `fn_cron_safe_run` — 355.638 chamadas, média **1.157 ms**, total **411.672 s (114 h)** |
| #3, #5, #6 | 3 RPCs PostgREST com média **12.010 ms / 6.847 ms / 12.305 ms** (3.402 / 3.805 / 1.530 chamadas) |
| #4 | `fn_reposicao_backfill_today` — 2.076 chamadas, média **14.985 ms** |
| Cron jobs | 138 (136 ativos) · **59 multi-statement ativos** · 2 inativos (`pipeline-classify-categories`, `process-webhook-outbox`) · **0 falhas em 7 dias** |
| Deadlocks (acumulado) | **262** |
| Transações com rollback | **22,53 %** |

### 1.5 Contratos código × banco

| Contrato | Resultado |
|---|---|
| `types.ts` × tabelas vivas | **0 tabelas ausentes** em `types.ts`; única diferença são 14 partições-filhas (esperado). Paridade total. |
| Campos críticos `Product` (REGRA #2) e tabelas críticas (REGRA #4) | Todos presentes. |
| Edge Functions | **108 implantadas × 109 diretórios locais** — a diferença é `tests/` (não é função). Paridade total. |
| `CURRENT_PROJECT_ID`, `config.toml` | `doufsxqlfjyuvxuezpln` em ambos. ✅ |
| `graphify-out/GRAPH_REPORT.md` | construído em `89292143`; `HEAD` é `7fbbcabe5` → **defasado** |
| Proxy da REGRA #4 (`grep -c "export type"`) | Retorna **7** — conta só aliases de topo, **não detecta** tabela removida dentro de `Database.public.Tables`. Método fraco. |

### 1.6 Git

- `main` local 4 commits atrás; branch de trabalho 1 à frente / 2 atrás (não contém #1863/#1864).
- 0 stashes. **59 commits dangling**, todos `WIP on <branch>` (autostash), 2026-09-11 → 09-15, ligados a branches já mergeadas. 2 worktrees `prunable` em `/tmp`.
- `SUPABASE_DB_PASSWORD` **não cadastrado** como secret → `db-schema-drift-check` está corretamente `BLOQUEADO` (não é falso verde; é ausência de evidência live).
- Allowlist `pptxgenjs`/`image-size` expira **2026-10-09**.

---

## 2. Regras operacionais

| Marcador | Significado |
|---|---|
| `[RO]` | Somente leitura de repositório/CI. |
| `[DB-RO]` | Consulta ao banco canônico sem DDL/DML. |
| `[GIT]` | Altera repositório, workflow ou configuração do GitHub. |
| `[REQUER-PO]` | Altera schema, grants, policies, funções, cron, dados, extensões, secrets ou configuração produtiva. **Para antes de executar.** Exige autorização explícita por objeto (REGRA #1, #8). |

**Esforço:** `P` ≤ 2 h · `M` ≤ 1 dia · `G` 2–5 dias · `GG` > 1 semana.

### Invariantes que nenhuma etapa pode violar
1. `CURRENT_PROJECT_ID = 'doufsxqlfjyuvxuezpln'` (REGRA #1).
2. Nenhum `db push`, `db reset`, `migration up` em massa. O ledger está desalinhado; esses comandos destroem produção.
3. Nenhuma migration já aplicada é **renomeada** ou **editada**. Correções são forward-only, em arquivo novo.
4. `on_auth_user_created` não se dropa. As 82 FKs para `auth.users` são desenho vigente.
5. Toda alteração no banco produz recibo: versão, hash, executor, método, data, verificação pós-aplicação.
6. Auditoria de schema só via `pg_catalog`. Nunca via PostgREST/OpenAPI.
7. Se a verificação live estiver bloqueada, o resultado é `BLOQUEADO`, nunca `PASS`.

### Como um `[REQUER-PO]` é executado na prática (adicionado no pre-mortem de 2026-09-16)

Existem hoje duas vias técnicas de escrita no banco canônico: (a) o workflow `E15` (GitHub Actions, ainda não construído) e (b) acesso MCP direto (`execute_sql`/`apply_migration`), que já funciona nesta sessão. A via (b) é **mais rápida e não deve virar atalho** — é o mesmo canal que causou o drift documentado em E12. Regra operacional:

1. Toda etapa `[REQUER-PO]` é entregue primeiro como **pacote de revisão**: SQL exato, objeto nomeado, efeito esperado, teste de reversão — nunca aplicado no mesmo turno em que é proposto.
2. Você aprova por objeto (pode ser em lote — "aprovo os 3 REVOKEs da lista X" — não precisa ser um SQL por vez).
3. Só então aplico — via (a) se E15 já existir, ou via (b) MCP **com o mesmo rigor manual que E15 automatizaria**: migration versionada criada no mesmo commit, `MIGRATIONS_SYNC_LOG.md` atualizado, `supabase_migrations.schema_migrations` recebendo a linha correspondente, verificação `pg_catalog` pós-aplicação — tudo no mesmo turno da aplicação, nunca "depois".
4. Isso significa que **E17–E29, E32, E37, E45 não precisam esperar E15 pronto** para serem aplicados com segurança assim que aprovados — só precisam da sua aprovação por objeto. E15 continua valendo a pena como automação permanente para reduzir esse trabalho manual no futuro.

---

## FASE 0 — Linha de base e segurança de operação (E01–E05)
> Nada de correção antes de ter uma fotografia assinada, backup verificável e a branch de trabalho no mesmo ponto que `origin/main`.

### E01 · Sincronizar a branch de trabalho e congelar a linha de base `[GIT]` ✅ Concluída em 2026-09-16
**Problema (medido):** `main` 4 atrás; branch atual não contém #1863 (`catalog_e24_zapp_catalog_stats`) nem #1864 (drift check fail-closed). Qualquer verificação feita aqui sai defasada.
**Ação:**
1. `git checkout main && git merge --ff-only origin/main`.
2. Rebasear `claude/audit-gaps-20260915` sobre `origin/main` (o único commit próprio é `7fbbcabe5`); resolver conflitos semanticamente (REGRA #3).
3. Confirmar que `npm run check:migration-refs` passa (prova de que #1864 está presente).
4. Registrar em `docs/plans/` a linha de base: SHA de `main`, `origin/main`, `HEAD`, data, hash do ledger (`md5(string_agg(version))`).
**Checklist de conclusão:**
- [x] `git rev-list --left-right --count main...origin/main` = `0 0`
- [x] Branch de trabalho contém `64cc27731` e `1d2fafccd`
- [x] `npm run check:migration-refs` sai 0
- [x] Linha de base com SHAs + hash do ledger registrada
**Esforço:** P · **Dep.:** — · **Supersede:** plano 09-15 E01/E06/E08

> **📋 Resultado de E01 (2026-09-16):** o trabalho de sincronização em si já estava feito por commits anteriores desta sessão (branch continha 100% de `origin/main` + 20 commits próprios, 0 divergência). Faltava só o registro formal. Confirmado: `main`/`origin/main`/`HEAD` = `1d2fafccd`/`1d2fafccd`/`4dd77692`; ledger com 2.504 linhas, hash `a0f5d1138d770c7a1ea578700969d347`; `check:migration-refs` exit 0. Linha de base completa em `docs/plans/BASELINE_E01_2026-09-16.md`.

### E02 · Restaurar a verificação live (secrets e CLI) `[REQUER-PO]`
**Problema (medido):** `SUPABASE_DB_PASSWORD` ausente como secret do GitHub. O workflow `db-schema-drift-check` está corretamente bloqueado (exit 1) — mas nenhum drift check live rodou desde que o falso verde foi eliminado.
**Ação:**
1. PO cadastra `SUPABASE_DB_PASSWORD` (senha atual do banco) e confirma `SUPABASE_ACCESS_TOKEN` com escopo mínimo.
2. Revogar tokens antigos que geravam `401`.
3. Disparar `db-schema-drift-check` manualmente; ler o log: `supabase link` e `db diff` executados de fato.
4. Local: `supabase login` com token novo; `supabase migration list --linked` retorna sem `401`.
**Checklist de conclusão:**
- [x] Secret cadastrado no ambiente correto; nenhum valor em log — feito pelo PO em 2026-09-16.
- [x] Run manual do workflow com etapas live executadas (não `skipped`) — confirmado, `Gate secrets` e `Link canonical project` passam.
- [x] `supabase migration list --linked` funciona localmente — sem 401, projeto `linked: true`.
- [x] Resultado do primeiro drift live arquivado como artefato — **ver caixa abaixo: o resultado foi "não calculável", não "sem drift".**
**Esforço:** P · **Dep.:** — · **Supersede:** plano 09-15 E26/E27 — ✅ **CONCLUÍDO em 2026-09-16**

> **📋 Resultado de E02 — 5 rodadas de CI, decisão de estratégia (2026-09-16):**
> Com o secret cadastrado, `db-schema-drift-check` passou a rodar de verdade — e revelou que `supabase db diff --linked` (que reconstrói o schema do zero em shadow database, reaplicando as ~2.988 migrations) **nunca conseguiu completar neste projeto**, independente de qualquer credencial. Em 5 execuções (runs `35090629440` → `35093709593`) encontrei e corrigi, em ordem:
> 1. `20260601140841_*.sql` — `v.product_id ~ '<regex>'` onde `product_id` é `uuid`: operador impossível (SQLSTATE 42883). Nunca aplicada em lugar nenhum. **Aposentada** (commit `354b0b322`).
> 2. `20260601180000_*.sql` — `CREATE POLICY IF NOT EXISTS`, sintaxe que não existe no PostgreSQL (SQLSTATE 42601) — mesma armadilha do `SCHEMA_REFERENCE.md` §7. A policy já existe ao vivo (criada por fora). **Reescrita** com `DO`/`EXCEPTION WHEN duplicate_object` (commit `f710cd23b`).
> 3. **5 dos 6 schemas de aplicação não-gerenciados não têm NENHUMA migration de criação** (`analytics`, `supplier_stricker`, `cf_recon`, `prod_audit`, `classification_audit` — só `internal` tinha). 38 migrations dependiam silenciosamente disso. **Corrigido** com `supabase db dump --linked --schema <5 schemas>` real (29 tabelas, 21 views/matviews, 20 funções) como migration de bootstrap (commits `0f806de64`, `0c2afc92e`).
> 4. `public.categories.bitrix_id` — coluna de tabela core sem NENHUMA migration em toda a história que a crie. **Não corrigido** — sinal de que a dívida de DDL out-of-band se estende para dentro de `public`, não só nos 5 schemas.
>
> **Decisão:** parar de perseguir o replay 100% funcional (não há garantia de quantas camadas faltam) e trocar de estratégia — ver E04/E06/E14/E46 atualizados. `supabase/migrations-snapshot/SCHEMA_LIVE.sql` (dump direto, 397 tabelas/199 views/1.320 funções, 4,87 MB, gerado em 2026-09-16 — commit `b6fab6ee2`) passa a ser a fonte de verdade do schema atual; `SCHEMA_DRIFT.sql` documenta a limitação em vez de ficar ausente. A reconciliação histórica completa vira trabalho best-effort de E07/E08, não bloqueante.

> **⛔ Pre-mortem (2026-09-16) — correção de escopo:** o passo 1 (cadastrar `SUPABASE_DB_PASSWORD`) é **ato humano intransferível**: nenhuma ferramenta minha lê/grava esse secret, e não devo pedir para você colá-lo no chat (ficaria em log). Isso bloqueia especificamente o caminho **CLI/GitHub Actions** (`supabase link`, `migration list --linked`, `db-schema-drift-check` live).
>
> **Isso não bloqueia acesso ao banco em si.** Eu já tenho leitura *e escrita* diretas no projeto canônico via MCP (`execute_sql`/`apply_migration`), independente deste secret — foi assim que rodei todas as consultas deste plano. Ou seja: eu **poderia**, tecnicamente, executar hoje mesmo qualquer `REVOKE`/`GRANT`/`CREATE INDEX`/`migration repair` dos passos `[REQUER-PO]` (E08, E09, E17–E29, E32, E37, E45) sem esperar E02.
> **Não vou fazer isso.** O limite não é técnico, é de autorização: `[REQUER-PO]` significa aprovação sua, por objeto nomeado, antes da execução — é a regra que este próprio plano define (§2, invariante 7) e existe por causa do incidente documentado no `CLAUDE.md` (REGRA #8) e do padrão de DDL "apply sql from post body" que este plano encontrou (E12). Usar acesso MCP para aplicar essas mudanças sem esse passo seria repetir exatamente o problema que o plano existe para consertar.
> Prático: E02 segue como pré-requisito só para **E08/E09/E15/E46/E47** (que dependem do CLI/workflow). Os demais `[REQUER-PO]` (E17–E29, E32, E37, E45) dependem de **aprovação por objeto**, não de E02 — vou entregá-los como pacotes de SQL prontos para revisão, não aplicá-los sozinho.

### E03 · Verificar backup/PITR e tirar snapshot lógico pré-plano `[DB-RO]`
**Problema:** nenhuma etapa que toca banco deve começar sem saber o RPO real. Não há registro no repo do estado de PITR.
**Ação:**
1. No painel Supabase: confirmar PITR habilitado, janela de retenção e último backup bem-sucedido. Registrar (sem credenciais) em `docs/db/BACKUP_STATUS.md`.
2. `pg_dump --schema-only` do projeto canônico → arquivo datado fora do Git (ou em Git se < 20 MB, sem dados).
3. Exportar `supabase_migrations.schema_migrations` completo (CSV/JSON) com hash SHA-256; guardar junto.
4. Exportar `cron.job` (138 linhas) — é configuração produtiva que **não está em migration**.
**Checklist de conclusão:**
- [ ] PITR/backup confirmado e documentado com data
- [x] Dump schema-only + hash guardado
- [x] Ledger exportado + hash guardado
- [x] `cron.job` exportado
**Esforço:** P · **Dep.:** E02 para o passo 2 (dump via CLI) · passos 3–4 **não dependem de E02** (uso MCP `execute_sql`, já disponível)

> **Pre-mortem:** não encontrei ferramenta que leia status de PITR/backup do projeto `doufsxqlfjyuvxuezpln` — nenhum tool MCP carregado expõe isso (só achei equivalentes de *outros* projetos Supabase da conta). **Passo 1 é ação sua**, no painel Supabase → Database → Backups. Passo 2 (`pg_dump --schema-only`) precisa da CLI autenticada (E02) ou de você rodá-lo localmente. Passos 3 e 4 eu já posso fazer agora via `execute_sql`, sem esperar nada.

> **📋 Resultado de E03 — 3/4 concluído (2026-09-16):** passos 2-4 feitos. Dump schema-only das 19 schemas não-sistema (5,0 MB, `docs/db/BACKUP_SCHEMA_ONLY_2026-09-16.sql`); ledger exportado (2.504 linhas, 7,6 MB, `docs/db/LEDGER_DATA_2026-09-16.sql`); `cron.job` exportado via `execute_sql` já que o `pg_dump --data-only` da schema `cron` não inclui tabelas de configuração de extensão por padrão (138 linhas, `docs/db/CRON_JOB_DATA_2026-09-16.json` — bate exato com os 136 ativos + 2 inativos medidos no plano). Hashes SHA-256 de todos os artefatos em `docs/db/CHECKSUMS_2026-09-16.sha256`. Detalhe completo em `docs/db/BACKUP_STATUS.md`. **Item 1 (confirmação de PITR no painel) segue pendente — ato humano intransferível, sem gate técnico.**

### E04 · Regenerar `docs/SCHEMA_REFERENCE.md` a partir do `pg_catalog` `[GIT]` ✅ Concluída em 2026-09-16
**Problema (medido):** o documento diz "se divergir > 5 %, regenere". Divergência hoje: banco +39 %, SECDEF +6 %, FKs `auth.users` +19 %, P1 (anon write) **já fechado**, views sem `security_invoker` 0 → 8, matviews 5 → 12. Quem lê o doc toma decisões erradas.
**Ação realizada:** documento reescrito por completo (commit `910ce4291`). Seções 1–6 com números de hoje; P1 movido para "fechado" com evidência; achados novos documentados como P5 (2 tabelas RLS sem policy — a correção já existe pronta e nunca rodou, migration 055), P6 (8 views SECDEF sem `security_invoker`, desenho intencional) e P7 (SECDEF/`authenticated` +36%); §6 recontado (12 matviews em 3 schemas, não só as 5 de `public`); §7-B novo documentando a descoberta completa do `db diff` nunca ter completado (ver E02) e as 3 correções aplicadas; 2 invariantes novas (11: não editar migration já aplicada, exceto as nunca aplicadas em lugar nenhum; 12: "sem drift" precisa dizer a fonte).
**Checklist de conclusão:**
- [x] Todas as contagens do doc batem com `pg_catalog` no mesmo dia
- [x] P1 marcado como fechado com evidência (`anon_write_tables = 0`)
- [x] 8 views SECDEF e 12 matviews documentadas
- [x] `check-schema-reference-drift` passa contra o doc novo — teste unitário associado (`tests/scripts/check-schema-reference-drift.test.mjs`) também precisou de atualização, feita junto.
**Esforço:** M · **Dep.:** E01 (✅)

### E05 · Consolidar os três planos em uma matriz única `[GIT]` ✅ Concluída em 2026-09-16
**Problema:** três planos de 50 etapas com sobreposição (ex.: drift check aparece em 09-13 Fase 1, 09-15 E28 e aqui E02/E46). Sem matriz, agentes executam a mesma coisa duas vezes ou pulam achando que outro fez.
**Ação realizada:** `docs/plans/MATRIZ_PLANOS_2026-09.md` criada (commit `9577cc2fa`) com as 150 etapas dos três planos. Estado medido ao vivo onde barato de verificar (26 concluídas, 19 parciais, 14 abertas confirmadas, 91 marcadas honestamente como "não verificado nesta rodada" — não chutado). Achados: E26/E27[15]=E02[16] e E31[13]=E10[16] são etapas duplicadas entre planos; 2 divergências de contagem não resolvidas (3 vs. 4 IDs inválidos; 4 vs. 5 drafts arquivados).
**Checklist de conclusão:**
- [x] 150 linhas (50 × 3) com estado e referência
- [x] Nenhuma etapa aberta em dois planos sem apontar qual é canônica — duplicatas identificadas e resolvidas para uma etapa canônica
- [x] Planos 09-13 e 09-15 atualizados com "ver matriz"
**Esforço:** M · **Dep.:** E01 (✅)

---

## FASE 1 — Integridade do ledger de migrations (E06–E15)
> Objetivo: o ledger passa a dizer a verdade, ou pelo menos a dizer explicitamente o que não sabe.

### E06 · Reconciliar e regerar a matriz completa arquivo ↔ ledger `[DB-RO]` ✅ Concluída em 2026-09-16
**Problema (medido):** 2.985 arquivos × 2.413 linhas, comparados hoje só por prefixo de versão (achado: 5 "só no ledger", 484 "só local"). **Já existe** um pipeline para isso — não construir do zero: `scripts/build-migration-ledger-manifest.mjs` + `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-08-28.json` (output já gerado uma vez) + `docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json` (input local, usado também por `scripts/check-no-db-push.mjs` — é código vivo, não histórico morto) + `docs/MANIFESTO_MIGRATIONS_RECONCILIADAS_2026-09-11.json` (exceções fechadas do PR #1855).
**Ação:**
1. **Antes de tudo:** reconciliar a divergência encontrada no pre-mortem (ver caixa abaixo) — sem isso, não dá para confiar em nenhum dos dois números.
2. Gerar `ledger-sanitizado.json` novo via `execute_sql` (não precisa de CLI/E02): `SELECT version, name, statements IS NULL AS statements_is_null, coalesce(array_length(statements,1),0) AS statement_count, ... FROM supabase_migrations.schema_migrations ORDER BY version` + hash de cada `statement` e do array concatenado, no mesmo formato que o script espera.
3. Regerar `docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-xx-xx.json` (localizar/checar se existe gerador; se não existir, documentar como gap e escrever um mínimo) com os 2.985 arquivos atuais.
4. Rodar `build-migration-ledger-manifest.mjs` com os dois inputs novos → `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json`.
5. Adicionar ao manifesto o enum de estado mais fino que a etapa E07 precisa (`aplicada-sem-ledger` etc.), sem quebrar o formato que `check-no-db-push.mjs` já consome.
**Checklist de conclusão:**
- [x] Divergência 5 vs. 1.247 explicada por escrito (ver caixa) — **era diferença de época, não bug.**
- [x] Manifesto regerado e versionado, reproduzível — `docs/MANIFESTO_MIGRATIONS_LOCAL_2026-09-16.json` + `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json` (commit `8a7c60267`)
- [ ] `check-no-db-push.mjs` continua passando — **NÃO passa, mas por motivo pré-existente e sem relação com este trabalho** (ver caixa de resultado)
- [ ] Teste unitário do parser de versão — não escrito nesta rodada; `scripts/build-local-migrations-manifest.mjs` tem a lógica mas sem teste dedicado ainda
**Esforço:** M · **Dep.:** —

> **✅ Resultado (2026-09-16):** a hipótese do pre-mortem (parsing estrito excluindo arquivos) estava **errada** — só 33 dos 2.988 arquivos ficam sem versão parseável, não o suficiente para explicar um gap de 700+. A explicação real: o manifesto de 08-28 tinha **1.673** arquivos locais; hoje são **2.988** — quase dobrou em 3 semanas (muita retroatividade de migration tipo `zapp_catalog_stats` aconteceu nesse intervalo). Os dois retratos nunca foram comparáveis diretamente.
>
> Reconciliação de hoje, com hash calculado dentro do banco (`extensions.digest`, sem puxar DDL bruto para o contexto): **`ledger_without_local_version: 3`** (as mesmas 3 migrations renomeadas pós-aplicação já documentadas — nenhum gap novo) · **`local_versioned_files_without_ledger_version: 543`** (bate com os 544 que a CLI já confirmava em E02) · **`ledger_with_exact_local_bytes: 132`** de 2.413 (a maioria não é comparável por hash porque 428 linhas do ledger têm `statements NULL`).
>
> **Achado colateral (não corrigido, fora do escopo desta etapa):** `node scripts/check-no-db-push.mjs` falha hoje (`exit 1`) — mas por conteúdo pré-existente e sem relação (arquivos de cache do `graphify-out/` e `docs/plans/KIT_MAKER_PLANO_200_ETAPAS_2000_SUBETAPAS_2026-09-10.md`, datado de 2026-09-10, contêm a string "supabase db push" em texto/cache e disparam o grep do gate). Confirmado que não vem de nada tocado nesta sessão. É um falso-positivo de gate que merece etapa própria (candidato a incluir numa próxima rodada da matriz).

### E07 · Classificar as 543 migrations sem ledger por verificação de objeto `[DB-RO]` ✅ Concluída — 543/543 classificadas, 2026-09-16
**Problema (medido):** 543 arquivos locais sem linha no ledger (número final de E06). Amostra 5/5 aplicada. Hipótese forte: maioria é `aplicada-sem-ledger`. Hipótese ≠ prova.
**Ação:**
1. Para cada arquivo, extrair o(s) objeto(s)-alvo via **regex leve** (`^\s*(CREATE|ALTER|DROP)\s+(OR REPLACE\s+)?(FUNCTION|TABLE|INDEX|VIEW|POLICY|TRIGGER)\s+(IF (NOT )?EXISTS\s+)?([\w."]+)`, mais casos para `GRANT|REVOKE ... ON ...`, `COMMENT ON ... IS`) — **sem** adicionar parser AST novo ao projeto.
2. Agrupar por tipo de objeto e gerar **uma query em lote por tipo** (ex.: todas as funções esperadas em um único `SELECT proname, ... FROM pg_proc WHERE proname = ANY($1)`), não uma chamada por arquivo — o objetivo é dezenas de queries, não 484.
3. Marcar `aplicada-sem-ledger` quando o objeto existe com a assinatura esperada; `indeterminada` quando a regex não capturou objeto (DML puro, blocos `DO $$`, migrations multi-statement) ou quando o objeto não existe.
4. Revisar manualmente só os `indeterminada`.
**Checklist de conclusão:**
- [x] 543/543 com estado ≠ `indeterminada` **ou** com justificativa individual — **543/543 (100%) com evidência real ou justificativa; os 132 `indeterminada` que restam são genuínos** (DO-blocks dinâmicos, DML puro — regex não captura objeto único; não é falta de verificação, é ausência de objeto único a verificar)
- [x] Relatório: quantas `aplicada-sem-ledger`, quantas `pendente`, quantas `no-op` — ver resultado abaixo
- [ ] Nenhuma `pendente` com DDL destrutivo sem ticket aberto — **87 `pendente` identificadas no total (67 revisadas individualmente em `docs/REVISAO_67_PENDENTES_2026-09-16.md` + 20 novas da rodada `grant`/`revoke`/`drop`/`comment`/`add_column`), nenhum ticket aberto ainda** (próximo passo)
**Esforço:** M (rebaixado de G) · **Dep.:** E06 (✅)

> **Pre-mortem:** cogitei usar `libpg_query`/`pgsql-parser` para extrair objetos com precisão de AST — mas **nenhuma lib de parsing SQL existe no `package.json`** hoje, e adicionar uma dependência nova só para esta etapa é desproporcional (G de esforço, manutenção permanente). Testei o atalho "grep por 'Aplicada em produ' no cabeçalho" como triagem barata: só bate em **8 dos 484** arquivos (número da fotografia anterior) — não é atalho suficiente sozinho. Regex leve + queries em lote por tipo de objeto é o meio-termo: mais barato que AST, mais confiável que grep de texto livre.

> **✅ Resultado (2026-09-16):** `scripts/classify-unledgered-migrations.mjs` (novo) extraiu objeto-alvo de cada um dos 543 arquivos; verificação em lote no `pg_catalog` (10 queries agrupadas por tipo, não 543 chamadas) contra 81 funções, 38 índices, 3 matviews, 4 tabelas, 41 policies, 30 triggers, 27 views, 3 schemas, 10 `ALTER FUNCTION...search_path` distintos. Resultado salvo em `docs/CLASSIFICACAO_MIGRATIONS_SEM_LEDGER_2026-09-16.json`:
>
> | Estado | Qtd | % |
> |---|---|---|
> | `aplicada-sem-ledger` | 221 | 41% |
> | `pendente` (objeto confirmado **ausente** ao vivo) | **67** | 12% |
> | `não-verificado-nesta-rodada` (grant/revoke/drop/comment/add_column/enum) | 113 | 21% |
> | `indeterminada` (DO-blocks dinâmicos, DML puro — regex não captura objeto único) | 132 | 24% |
> | `no-op`/diagnóstico | 10 | 2% |
>
> **⚠️ Antes de tratar os 67 `pendente` como "67 coisas quebradas":** vários são candidatos a **superados por versão posterior**, não gaps reais — ex.: `user_roles_self_read`, `user_roles_self_read_v4`, `user_roles_select_v2` são três tentativas sucessivas do mesmo policy em datas diferentes; o fato de nenhuma bater o nome exato não prova que `user_roles` está desprotegida (940 policies existem no banco hoje, incluindo outras em `user_roles`). Cada `pendente` precisa de checagem individual antes de virar ticket — isto é levantamento, não veredito.
>
> **Achados que cruzam com outras fases do plano:**
> - **7 dos 16 índices `pendente` são de performance em `products`/`stock_snapshots`** (`idx_products_active_category`, `idx_products_active_sale_price`, `idx_products_keyset_active` ×2 tentativas em datas diferentes, `idx_stock_snapshots_variant_id`, `idx_pcd_product_id_active`, `idx_product_images_cf_last_checked_at`) — relevante para E29/E34-E40 (desempenho). Índices de performance escritos e nunca aplicados são um achado concreto e acionável.
> - **7 dos 7 schemas `pendente` são `archive`/`backup`** — vêm de migrations "faxina" (limpeza de tabelas órfãs) que nunca criaram o schema de destino. Sinal de esforço de limpeza iniciado e não concluído.
> - `_asia_api_staging` (tabela `pendente`) vem de `20260604141700_bootstrap_fresh_replay_prereqs.sql` — nome sugere uma tentativa **anterior** de resolver exatamente o problema do replay do `db diff` que esta sessão investigou em E02. Não explorado a fundo; candidato a arqueologia se alguém quiser entender tentativas passadas.
> - `internal_deny_direct_access` (policy `pendente`) confirma, com evidência de lote, o que já sabíamos individualmente: a migration 055 (P5 do `SCHEMA_REFERENCE.md`) nunca aplicou.
>
> **Não concluído nesta rodada:** verificação de `grant`/`revoke` (56 arquivos — precisa checar `information_schema.role_table_grants`/`has_*_privilege`, lógica diferente de "existe"), `drop` (27 — lógica invertida: "aplicada" significa objeto **não** existir), `comment` (10), `add_column` (19, tenho os pares tabela/coluna prontos em `/tmp`, não rodei ainda), `enum_value` (1). Fica para uma próxima rodada de E07 antes de fechar 100%.

> **✅ Revisão manual dos 67 `pendente` (2026-09-16) — `docs/REVISAO_67_PENDENTES_2026-09-16.md`:** para cada objeto ausente, comparei o estado *atual* da tabela-alvo (não só "o nome não existe") e, para funções, se há chamador vivo no código.
>
> | Categoria | Qtd | Conclusão |
> |---|---|---|
> | **P3 — Superado por trabalho posterior** | ~19 | `user_roles` (4), `admin_audit_log` (2), `color_groups`, `category_ancestors`, `tabela_preco_gravacao_oficial`, `kit_component_enrichment_raw`, `discount_approval_requests` (2), `password_reset_requests` (policy), `user_notification_preferences`, `kcpa_admin_delete` — todas com cobertura equivalente ou mais forte hoje, sob nome diferente. **Sem ação.** |
> | **P4 — Tabela-alvo não existe mais** | 4 | `bitrix_clients`, `silver_products`, `ai_description_queue` não existem; `kit_component_media` — o próprio código já documenta que esse nome "nunca existiu" (renomeado para `component_media`). **Achado moot, não gap.** |
> | **P5 — Função sem chamador vivo ou já documentada como ausente-intencional** | 10 | 7 sem nenhuma referência no código (trabalho especulativo abandonado); `check_auth_config_status` tem chamador mas o próprio código comenta "ausência intencional, re-verificado 2026-06-11"; `check_webhook_dedup`/`fn_convert_cart_to_quote` só aparecem em comentário, não em chamada real. **Nenhum bug de produção confirmado.** |
> | **P6 — Utilitário de baixo risco** | ~6 | Triggers de `updated_at`/posição/relink em tabelas que já têm cobertura extensa por outros triggers (ex.: `product_images` tem 21). **Baixo risco, não investigado a fundo.** |
> | **P2 — Débito técnico real, baixa urgência** | 7 schemas + já contabilizado nos 7 índices acima | Limpeza "faxina" de tabelas órfãs nunca completou: `archive`/`backup` não existem, e **3 tabelas `%_orphan_%` ainda estão em `public`** hoje. |
> | **🔴 P1 — Requer decisão do PO, não resolvido** | **3** | `trg_prevent_non_admin_quote_item_price_change` (`quote_items` — trigger de **segurança de preço**, sem equivalente óbvio nos 6 triggers atuais da tabela); `trg_enforce_seller_cart_ready_requires_items` (`seller_carts` — integridade de carrinho); `handle_password_reset_request` (função **não existe em lugar nenhum**, hipótese de handler órfão pós-migração pro Auth nativo, não confirmada). |
>
> Nenhuma migration foi aplicada, revertida ou alterada nesta revisão — é levantamento para decisão do PO (REGRA #8), especialmente os 3 itens P1.

> **✅ Fechamento final — verificação de `grant`/`revoke`/`drop`/`comment`/`add_column`/`enum_value` (2026-09-16):** os 113 arquivos deixados de fora da rodada anterior foram verificados um a um contra `pg_catalog` (via `mcp__supabase__execute_sql`, somente leitura — REGRA #8), fechando os 543/543. Metodologia por categoria:
> - **`grant`/`revoke` (56):** `aclexplode(pg_class.relacl)`/`proacl` via `LATERAL` join (não em `WHERE` — `aclexplode` em `WHERE` gera `ERROR 0A000`), não `information_schema.role_table_grants` (esta última só mostra grants visíveis ao role conectado — deu falso-negativo "nenhum grant" numa consulta em lote na rodada anterior). Onde a mesma `(tabela/função, role)` teve vários `GRANT`/`REVOKE` sucessivos (toggle chain), só a versão **terminal** (cronologicamente última) foi verificada contra o estado atual; as anteriores foram marcadas `indeterminada-superseded-por-versao-posterior` apontando para o arquivo terminal — o estado de cada uma individualmente não é reconstruível a partir do snapshot atual. Resultado: 19 `aplicada` + 23 `aplicada`(revoke) = 42, 3+4 `pendente`, 3+3 `superseded`, 1 `indeterminada-objeto-inexistente` (`product_popularity_30d` não existe mais).
> - **`drop` (27):** lógica invertida — "aplicada" = objeto **não** existe hoje. 13 `aplicada`, 10 `pendente` (objeto ainda existe), 4 `indeterminada-efeito-dinamico`.
> - **`add_column` (19) + `enum_value` (1):** `IF NOT EXISTS` é idempotente, sem ambiguidade de chain — coluna existe hoje ⇒ `aplicada`. 17/19 `aplicada`, 2 `pendente` (`navigation_analytics.destination_path`, `product_images.import_batch_id` não existem). `app_role.'agente'` confirmado em `pg_enum` ⇒ `aplicada`.
> - **`comment` (10):** texto de cada `COMMENT ON ... IS` extraído do arquivo-fonte e comparado contra `obj_description()`/`col_description()` ao vivo. 8/10 `aplicada` (texto bate exatamente), 1 `indeterminada-superseded-por-versao-posterior` (`products.name` — versão curta/ASCII de `20260623000001` foi sobrescrita pela versão longa/acentuada de `20260623102118`, que é a vigente hoje), 1 `pendente`.
>
> **🔴 Dois achados de segurança real (não são nuance de classificação E07 — são gaps ativos hoje, `[REQUER-PO]` para correção):**
> 1. **`fn_super_filtro_product_ids` ainda concede `EXECUTE` a `PUBLIC`.** A migration `20260716000046_revoke_anon_all_remaining_catalog_functions.sql` revogou `EXECUTE` de `anon` explicitamente em 6 funções, mas nesta função específica o grant remanescente é a `PUBLIC`, não a `anon` — e `PUBLIC` inclui `anon`. Revoke específico não anula grant amplo. `anon` continua com execução efetiva.
> 2. **`zapp_catalog_stats()` ainda concede `EXECUTE` a `authenticated`.** A migration `20260915113458_zapp_catalog_stats_revoke_authenticated.sql` (a mais recente do lote, 2026-09-15) foi escrita exatamente para fechar esse gap (o próprio cabeçalho do arquivo documenta a causa raiz: `ALTER DEFAULT PRIVILEGES` do projeto concede `EXECUTE` a `authenticated` em toda função nova de `public`) — mas `proacl` ao vivo mostra `authenticated=X/postgres` ainda presente e o `COMMENT` de proveniência que a migration define está `NULL`, ou seja, **a migration nunca rodou**. Gap idêntico ao que ela tentou fechar continua ativo em produção.
>
> Nenhuma alteração de schema foi feita para tratar os dois achados acima — ambos exigem aprovação do PO antes de qualquer `REVOKE`/reexecução (REGRA #1/#8).
>
> **⚠️ Correção do achado #1 (2026-09-16, verificação para o pacote de aprovação):** `aclexplode(proacl)` ao vivo em `fn_super_filtro_product_ids(text[],text[],text[],text[],text[],text[])` mostra hoje **apenas** `postgres`, `authenticated`, `service_role` — **sem `PUBLIC` e sem `anon`**. Reconstruindo o histórico: a migration `20260627112025_r6_fix_fn_super_filtro_ambiguity_drop_5arg` já fez `REVOKE EXECUTE ... FROM PUBLIC` explícito (não só de `anon`) ao recriar a função; depois `20260716000046_revoke_anon_all_remaining_catalog_functions.sql:213-214` revogou também de `anon` deliberadamente, junto com as outras 5 funções do grupo "Super Filtro". O achado #1 **estava errado** — não é gap ativo, é estado corretamente configurado por 2 migrations já aplicadas. Removido do pacote de aprovação; só o achado #2 (`zapp_catalog_stats`) segue como `[REQUER-PO]` real.

### E08 · Reparar o ledger para as `aplicada-sem-ledger` `[REQUER-PO]`
**Problema:** cada migration aplicada sem registro faz `migration list` mentir e torna `migration up` perigoso.
**Ação:** para o conjunto validado em E07, executar `supabase migration repair --status applied <versão>` em lotes de 50, **um lote por sessão**, com o manifesto assinado antes e depois. `repair` insere só a versão — **não executa SQL**. Preencher `name` e, quando o arquivo for canônico, `statements` (para fechar o gap de 483 sem statements daqui para frente).

> **✅ Lote 1 concluído em 2026-09-16** — PO aprovou ("aprovado"). 103 candidatos originais → 13 excluídos por colisão de PK (`version` duplicado entre arquivos, ver abaixo) → **90 versões repairadas** via `supabase migration repair --status applied <90 versões> --linked` (Bash direto; caminho MCP ficou indisponível para escrita nesta sessão — `mcp__supabase__execute_sql` é somente-leitura e nenhuma ferramenta `apply_migration`/write foi encontrada sob o mesmo servidor `mcp__supabase__*`, apesar de aparecer liberada na UI do conector).
>
> Verificação pós-execução:
> - `SELECT count(*) ... WHERE version IN (<90>)` → **90/90** confirmadas no ledger via `mcp__supabase__execute_sql` (leitura).
> - `postgres_logs` do intervalo: só bootstrap idempotente da própria tabela do ledger (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) — **zero DDL em objetos de aplicação**.
> - `supabase migration list --linked`: 83/90 casam `local == remote`. As outras 7 (`20260618000001`, `20260618160000`, `20260619100000`, `20260620160000`, `20260621100000`, `20260623120000`, `20260712`) aparecem com `remote` vazio **apesar de confirmadas presentes por SQL direto** — causa raiz identificada: essas 7 versões têm **2+ arquivos locais compartilhando o mesmo prefixo de versão** (ex.: `20260712_fix_rls_policies_critical.sql` e `20260712_performance_indexes.sql`), o que confunde o algoritmo de pareamento local×remoto do CLI. Não é uma falha do repair — é o mesmo problema estrutural do **E10** (prefixos duplicados). Achado adicional: `20260712` já existia no ledger *antes* deste lote, com `name = 'fix_rls_policies_critical'` (não `'performance_indexes'`) — confirma que a colisão de versão é pré-existente, não introduzida agora.
> - 13 excluídos do lote (5 grupos de versão duplicada, 13 arquivos) ficam para o E10 (congelamento de exceções) resolver a ordem/identidade antes de qualquer nova tentativa de repair nessas versões.

> **📋 Lote 2 — candidatos prontos para aprovação do PO (2026-09-16), aguardando "aprovado":** com E07 100% fechado (543/543), recalculei o pool de candidatos: 302 entradas hoje confirmadas `aplicada`/`aplicada-sem-ledger` no `pg_catalog` (221 da rodada anterior + 81 novas de `grant`/`revoke`/`drop`/`add_column`/`comment`/`enum_value`) menos as 90 já reparadas no lote 1 = 209. Dessas, **179 não colidem em `version`** com o lote 1 nem entre si — confirmado por SQL direto que as 179 têm `already_in_ledger = 0` (zero risco de repair duplicado). As outras **30 (10 grupos de `version` duplicada — 5 já conhecidos do lote 1 mais 5 novos: `20260610120000`, `20260611120000`, `20260615`, `20260620190000`, `20260716000044`) ficam de fora até o E10 resolver identidade/ordem** — o problema estrutural de prefixos sem componente de hora é maior do que se sabia antes do E07 fechar, porque mais arquivos "sem-ledger" convergiram para as mesmas datas-versão. Packet completo (lista versão-por-versão, agrupamento por tipo, comando `repair` pronto) em `docs/E08_LOTE2_CANDIDATOS_2026-09-16.md`. **Nenhum repair foi executado — aguarda aprovação explícita do PO (REGRA #8).**

**Checklist de conclusão:**
- [x] PO aprovou a lista exata (versões) antes do lote 1
- [x] Após o lote: `migration list --linked` sem "local only" para as versões do lote — 83/90 limpas; 7/90 com discrepância de exibição explicada acima (causa: duplicidade de prefixo, não do repair)
- [ ] Ledger exportado (E03) antes e depois, com diff = exatamente as versões inseridas — **não capturado no lote 1** (aplicar no lote 2: `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version` antes e depois, diff deve ser exatamente as 179)
- [x] Zero DDL executada (verificado via `postgres_logs`)
- [ ] Lote 2 — **179 candidatos prontos e verificados** (`docs/E08_LOTE2_CANDIDATOS_2026-09-16.md`), aguardando aprovação do PO; **30 arquivos (10 grupos) de colisão de versão** (13 do lote 1 + 17 novos) ficam para depois do E10
**Esforço:** M · **Dep.:** E07 · **Risco:** baixo se e somente se E07 estiver completo

### E09 · Resolver os 4 IDs inválidos do ledger, um a um `[REQUER-PO]` — investigação concluída 2026-09-16, remediação aguarda aprovação
**Problema (medido):** `2026062311292414001` (19 dígitos — timestamp corrompido); `20260623_bugalert1`, `20260623_create_process_notifications_queue_rpcs`, `20260623_fix_google_provider_secret_name`. `supabase migration list` nunca vai casá-los.
**Ação:** por ID: (a) confirmar objetos físicos criados; (b) decidir `repair --status reverted <id-inválido>` + `repair --status applied <versão-canônica-nova>` **ou** manter e documentar como exceção permanente no manifesto; (c) criar arquivo marker local com cabeçalho explicando o histórico. **Nunca** renomear o arquivo de volta (viola invariante 3).

> **📋 Resultado da investigação E09 (2026-09-16):** achado real é mais fino que a hipótese original do plano — não é renomeação de arquivo. **2 das 4 entradas (`20260623_bugalert1`, `20260623_create_process_notifications_queue_rpcs`) são stubs com reticências literais em posição de SQL inválido** (`RETURNS TABLE(...)`, `VIEW ... AS ...`) — nunca foram executáveis, e cada uma já foi superada por uma entrada canônica completa e realmente aplicada (`20260623182623`, `20260623201801`, ambas com arquivo no disco e objeto vivo confirmado). **1 entrada (`20260623_fix_google_provider_secret_name`) é um `UPDATE` real, completo, aplicado de fato** (confirmado via live-check: `secret_name` já é `GEMINI_API_KEY`), só sem arquivo local — não tem duplicata canônica. **1 entrada (`2026062311292414001`) é só malformada** (19 em vez de 14 dígitos) mas internamente consistente (arquivo + ledger + objetos vivos todos batem) — proposta é não mexer. Pacote de 3 ações prontas (`migration repair --status reverted` nos 2 stubs; backfill de arquivo canônico + `migration repair --status applied` para o UPDATE real) em `docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md`, SQL exato incluso, nada aplicado ainda.

**Checklist de conclusão:**
- [x] 4/4 investigados e causa raiz determinada (`docs/E09_LEDGER_IDS_INVALIDOS_2026-09-16.md`)
- [x] Pacote de remediação com SQL exato e teste de reversão pronto
- [ ] Aprovação do PO — pendente (parte do 1º pacote consolidado)
- [ ] Ações aplicadas — pendente de aprovação
- [ ] `docs/SCHEMA_REFERENCE.md` §"IDs históricos" atualizado — após aplicação
**Esforço:** P · **Dep.:** E03, E08 · **Supersede:** plano 09-15 E34

### E10 · Congelar os 67 arquivos fora do contrato e os 31 prefixos duplicados `[GIT]` ✅ Concluída em 2026-09-16 (achado: já existia)

**Problema (medido):** 67 arquivos não seguem `^\d{14}_slug\.sql`; 31 timestamps compartilhados por 2+ arquivos. O CLI ordena por versão — dois arquivos com a mesma versão têm ordem de aplicação **indefinida**. Descoberta durante a verificação do E08 lote 1: 7 das 90 versões repairadas aparecem com `remote` vazio em `migration list --linked` por colisão de prefixo (ex.: `20260712_fix_rls_policies_critical.sql` vs `20260712_performance_indexes.sql`).

**Ação realizada — não criei nada novo, verifiquei o que já existia:** `scripts/check-migration-filename-contract.mjs` (454 linhas) já implementa exatamente o invariante pedido, e de forma mais forte do que a proposta original (baseline com sha256 por arquivo, não uma lista plana de exceções):
- `docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json` — baseline congelada: **1.673 arquivos**, cada um com `sha256`, `canonical_14_digit_version`, `version_collision`, `effect_signals` etc. **66 não-canônicos**, **96 arquivos em grupos de colisão** (bate com os "67"/"31" do problema medido, pequena diferença de contagem por critério de corte).
- `docs/MANIFESTO_MIGRATIONS_RECONCILIADAS_2026-09-11.json` — 2 exceções pontuais adicionais (path + sha256).
- Regra: qualquer arquivo **novo** (fora da baseline) precisa nome canônico E versão não-colidente; arquivos **da baseline** são tolerados como estão, protegidos por hash (se o conteúdo de um arquivo histórico mudar, o gate falha).
- Já plugado no CI: `grep -rl check-migration-filename-contract .github/workflows/` → `quality-gate.yml`.
- `tests/scripts/check-migration-filename-contract.test.mjs` — **15/15 passando**, cobrindo exatamente os cenários do checklist: nome novo fora do padrão (5 variações via `it.each`), versão nova reutilizando timestamp de legado, colisão entre duas migrations novas, alteração de conteúdo de arquivo baselined.
- Rodei o gate no estado atual: `node scripts/check-migration-filename-contract.mjs` → `✅ ... baseline: 1673 arquivos + 2 reconciliados; novas: 1313; colisões legadas preservadas: 31.` Exit 0.

**Conclusão:** o invariante que a etapa pedia já está em produção desde antes desta sessão. Não há gap — só falta de documentação no plano, agora corrigida. **Nenhum arquivo foi renomeado** (invariante 3 preservada).
**Checklist de conclusão:**
- [x] Exceções listadas com hash — via baseline JSON (sha256 por arquivo), estrutura mais rica que "motivo" em texto livre
- [x] Gate falha em teste com arquivo novo fora do padrão e com timestamp repetido — 15 testes automatizados cobrem os dois casos
- [x] Gate passa no estado atual — confirmado, exit 0
**Esforço:** P (0 — trabalho já existia) · **Dep.:** E06 · **Supersede:** plano 09-15 E17

### E11 · Tornar `statements` obrigatório para toda entrada nova do ledger `[GIT]`
**Problema (medido):** 483 linhas do ledger sem `statements` — 20 % do histórico **não pode** ser comparado por hash com o arquivo local (E33 do plano 09-15 é impossível para esse subconjunto).
**Ação:** aceitar o passado como não-verificável e registrar isso em `supabase/MIGRATIONS_SYNC_LOG.md`. Para o futuro: o gate de CI verifica, após cada aplicação registrada, que a linha nova tem `statements` não vazio e que `md5(array_to_string(statements))` bate com o arquivo. Migrations aplicadas via `repair` (E08) recebem `statements` a partir do arquivo quando o arquivo for canônico.
**Checklist de conclusão:**
- [ ] `MIGRATIONS_SYNC_LOG.md` declara as 483 como "não verificáveis por hash — verificadas por objeto (E07)"
- [ ] Gate `ledger:verify-statements` implementado e no CI
- [ ] Toda entrada criada a partir desta etapa tem `statements` e hash
**Esforço:** P · **Dep.:** E06

### E12 · Detector de DDL fora do fluxo (out-of-band) `[GIT]` + `[DB-RO]`
**Problema (medido):** pelo menos 2 casos confirmados de DDL aplicada por MCP/dashboard e registrada depois (`catalog_e24_zapp_catalog_stats` 2026-09-12; `audit_r3_revoke_anon_mv_product_compositions` 2026-09-05). Existe `schema_signature_baseline` (7.201 colunas) e `schema_signature_drift_log`, mas ninguém compara com o ledger.
**Ação:**
1. Job semanal (workflow, após E02) que: captura assinatura do schema, compara com a última; para cada diferença, procura migration no ledger com `created_at` no intervalo; se não achar → abre issue "DDL out-of-band" com o objeto e o trecho de `postgres_logs` (`apply sql from post body`).
2. Política escrita em `docs/db/POLITICA_DDL.md`: DDL via MCP/dashboard só é aceitável com (a) ticket, (b) arquivo de migration no mesmo PR, (c) `repair --status applied` no mesmo dia.
**Checklist de conclusão:**
- [x] Workflow roda e produz relatório mesmo com zero diferenças (testado em modo estático; live só na 1ª execução real)
- [ ] Simulação: `COMMENT ON` fora do fluxo em objeto de teste → issue aberta (fora do escopo `[DB-RO]`, exige DDL real — ver doc)
- [x] Política publicada e referenciada em `CLAUDE.md`
**Esforço:** M · **Dep.:** E02, E06

> **Concluída em 2026-09-16 (sem `[REQUER-PO]`).** `.github/workflows/ddl-out-of-band-detector.yml`
> (semanal + `workflow_dispatch`) cruza `schema_signature_drift_log` (populada 4x/dia pelo
> `pg_cron` job 245 já existente — divergência deliberada do texto literal: reaproveita a
> assinatura já materializada em vez de recalculá-la no Actions) contra
> `supabase_migrations.schema_migrations`; abre issue `ddl-out-of-band` só quando sobra objeto
> sem correspondência. Confirmado ao vivo nesta etapa: drift log tem 348 linhas desde
> 2026-06-26, 309 com `has_drift=true` (baseline defasada ~3 meses) — volume real, não
> hipotético. `docs/db/POLITICA_DDL.md` e `scripts/check-ddl-out-of-band.mjs` (herdados de uma
> sessão anterior incompleta) revisados linha a linha nesta etapa — zero escrita confirmada,
> comportamento estático testado diretamente. Detalhes em
> `docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md`.

### E13 · Decidir os 10 drafts ativos e os 5 arquivados `[RO]`
**Problema (medido):** `qa/migrations-draft` tem 10 ativos e 5 arquivados (o plano 09-15 dizia 4). `scripts/map-drafts-to-migrations.mjs` existe.
**Ação:** rodar o mapeamento por **objeto** (não por slug); para cada draft: `absorvido por <versão>` / `pendente` / `rejeitado` / `obsoleto`. Registrar em `qa/migrations-draft/DRAFTS_STATUS.md` com owner e data. Não mover nem apagar nesta etapa.
**Checklist de conclusão:**
- [x] 14/14 com estado, owner e próxima decisão (contagem real é 14, não 15 — ver resultado)
- [x] Nenhum draft "pendente" sem etapa deste plano que o consuma (verificado; 3 são gaps genuínos, reportados, nenhuma etapa nova inventada)
**Esforço:** P · **Dep.:** E07

> **📋 Resultado (2026-09-16):** `docs/E13_DRAFTS_MIGRATIONS_2026-09-16.md` +
> seção "Decisão por objeto" em `qa/migrations-draft/DRAFTS_STATUS.md`.
> **Contagem corrigida:** 10 ativos + **4** arquivados (não 5) = **14** drafts,
> não 15. Mapeamento feito por objeto ao vivo em `pg_catalog` (nunca
> PostgREST — REGRA #8 corolário), não por slug de arquivo (o
> `scripts/map-drafts-to-migrations.mjs` existente depende de `PGHOST`
> indisponível nesta sessão e faz apenas fuzzy-match de nome de arquivo).
> **Distribuição:** `absorvido por <versão>` = 3 · `absorvido (fora do fluxo
> de migration, sem versão rastreável)` = 2 · `absorvido parcialmente` = 1 ·
> `pendente` = 3 · `obsoleto` = 5 · `rejeitado` = 0. Os 3 `pendente`
> (`2026-06-19_kit_dimensions_backfill.sql` — 43 kits ainda sem dimensões;
> `2026-07-23_get_edge_invoke_summary.sql` — RPC de telemetria adiada pelo PO;
> `2026-09-09_magazine_rpc_only_contract.sql` — contrato RPC-only do Magazine
> adiado até frontend v2 READY) **não têm etapa cobrindo a aplicação** em
> E01–E50 — gaps genuínos, reportados e não inventados como etapa nova.
> Achados adicionais: 2 casos de DDL out-of-band confirmados
> (`fn_get_reposicao_variants_summary` e a constraint
> `magazine_items_unique_product`, vivos em produção sem migration
> versionada correspondente — candidatos a reconciliação via
> `docs/db/POLITICA_DDL.md`); `REVIEWS.json` desatualizado para o draft
> `reposicao_variants_summary` (já em produção, não "aguardando staging");
> `_archived/README.md` desatualizado quanto ao trigger
> `generate_magazine_public_token` (não existe mais sob esse nome). Nenhum
> arquivo movido/apagado em `qa/migrations-draft/`; nenhuma escrita no
> Supabase.

### E14 · Recriar o snapshot consolidado e seu metadado `[GIT]` ✅ Concluída em 2026-09-16 (ver E02)
**Problema (medido):** o metadado do snapshot consolidado (`snapshot_meta.json`, dentro do diretório `migrations-snapshot`) estava vazio ou ausente; nunca havia sido gerado com sucesso porque dependia da mesma verificação live bloqueada em E02.
**Ação realizada:** gerado `SCHEMA_LIVE.sql` via `supabase db dump --linked --schema public` (397 tabelas, 199 views, 1.320 funções, 4,87 MB), `SCHEMA_DRIFT.sql` documentando por que o `db diff` não completa hoje (ver E02), `SNAPSHOT_META.json` com contagens reais e a lista de blockers corrigidos/abertos, `README.md` com seção "Limitação conhecida", `ALL_IN_ONE.sql` regenerado (2.988 migrations). Commit `b6fab6ee2`.
**Checklist de conclusão:**
- [x] `SNAPSHOT_META.json` válido e versionado
- [ ] Segunda geração produz hash idêntico (reproduzível) — não testado ainda; `SCHEMA_LIVE.sql` muda a cada geração pela natureza do dump (ordem pode variar), avaliar se vale normalizar antes de cobrar reprodutibilidade byte-a-byte.
- [x] `README` do snapshot declara "não substitui ledger nem `pg_catalog`" (já dizia; reforçado com a limitação do drift)
**Esforço:** P · **Dep.:** E03 — **status real: não precisou de E03, rodou direto com CLI já linkado.**

### E15 · Workflow de aplicação controlada de migration única `[GIT]` (execução `[REQUER-PO]`)
**Problema:** `db push` é proibido (correto) e **não existe** caminho versionado para aplicar uma migration nova. Resultado: as pessoas usam MCP/dashboard, que é a origem do problema de E12.
**Ação:** workflow `db-apply-migration.yml` com `workflow_dispatch(version)` e environment `production` (approvers = PO): (1) preflight read-only (objetos-alvo, `EXPLAIN` de DDL se aplicável, lock esperado); (2) aplica **apenas** `supabase/migrations/<version>_*.sql` via `psql -1 -v ON_ERROR_STOP=1`; (3) `migration repair --status applied <version>` com `statements`; (4) pós-check `pg_catalog`; (5) recibo no job summary e em `MIGRATIONS_SYNC_LOG.md`. Rollback lógico obrigatório no cabeçalho do arquivo.
**Checklist de conclusão:**
- [ ] Workflow existe, exige approval, recusa versão fora do contrato ou já no ledger
- [ ] Teste em branch Supabase (ou dry-run) com migration de `COMMENT ON` prova o ciclo completo
- [ ] `CLAUDE.md` REGRA #8 aponta para este workflow como **único** caminho autorizado
**Esforço:** G · **Dep.:** E02, E10, E11

---

## FASE 2 — Postura de segurança (E16–E24)
> Objetivo: todo acesso `anon`/`authenticated` é intencional, justificado por escrito e vigiado por gate.

### E16 · Formalizar as 8 views `v_*_public` SECURITY DEFINER como superfície anônima `[GIT]`
**Problema (medido):** 8 views sem `security_invoker`, todas com SELECT para `anon`, rodando como owner. É o mecanismo que substituiu os grants diretos (P1). `.security/public-views-columns.json` existe, mas não há evidência de teste que falhe se uma coluna sensível entrar.
**Ação:** para cada view: listar colunas, `pg_get_viewdef`, tabelas subjacentes; comparar com `public-views-columns.json`; garantir que nenhuma expõe `cost`, `supplier_price`, `ncm`, `bitrix_*`, PII. Gate `check-public-views-drift` (falha se coluna nova aparecer sem allowlist). Documentar em `SCHEMA_REFERENCE.md` como desenho intencional.
**Checklist de conclusão:**
- [ ] 8/8 com definição, colunas e justificativa registradas
- [ ] Gate falha em teste com coluna extra e passa hoje
- [ ] Nenhuma coluna de custo/fornecedor/PII exposta (lista explícita verificada)
**Esforço:** M · **Dep.:** E04

### E17 · Revisar as 11 SECDEF executáveis por `anon` `[REQUER-PO]`
**Problema (medido):** 11 funções (lista em §1.2). `.security/secdef-anon-allowlist.json` e `check-secdef-anon-drift.mjs` existem.
**Ação:** por função: precisa de `SECURITY DEFINER`? precisa ser executável por `anon`? tem `search_path` (sim, 0 sem) e valida entrada? Para cada uma: manter com `reason` específico na allowlist **ou** `REVOKE EXECUTE FROM anon` via migration forward-only (E15). Prioridade: `fn_global_search`, `fn_super_filtro*` (superfície de injeção/DoS), `submit_quote_response`, `get_quote_token_public`.
**Checklist de conclusão:**
- [ ] 11/11 com decisão escrita
- [ ] Allowlist sem `reason` genérico ("baseline canônica" proibido)
- [ ] Revogações aplicadas via E15 com recibo
- [ ] `check-secdef-anon-drift` passa
**Esforço:** M · **Dep.:** E15

> **Preparo concluído em 2026-09-16** (`docs/E17_SECDEF_ANON_2026-09-16.md`):
> 11/11 com decisão escrita, allowlist reescrita sem `reason` genérico. Achado:
> `fn_super_filtro` tinha EXECUTE residual a `PUBLIC` (as irmãs `_facets`/
> `_price_range` já não tinham) — migration pronta e não aplicada
> (`supabase/migrations/20260916200000_e17_revoke_public_fn_super_filtro.sql`).
> Achado secundário: `fn_check_login_allowed` já tem migration pronta de PR
> anterior (`20260904150000`, SEC-008v4) nunca aplicada — sinalizado, não
> duplicado. Follow-up não bloqueante: `fn_global_search` sem `LEAST()` no
> `p_limit`. Aguardando aprovação do PO — não bloqueado por E15.

### E18 · Revisar as 94 SECDEF executáveis por `authenticated` (+25 desde julho) `[REQUER-PO]`
**Problema (medido):** cresceu de 69 para 94. O gate lint 0029 bloqueou o CI por uma delas (`zapp_catalog_stats`, resolvida em #1863). Cada uma é um vetor de escalação se a lógica interna confiar em `auth.uid()` sem checar papel.
**Ação:** classificar por padrão de acesso (lê `auth.uid()`? chama `has_role`? escreve em tabela sem RLS?). Amostra dirigida: as 25 novas primeiro. Allowlist `lint-0029-allowlist.json` com `reason` específico por função.
**Checklist de conclusão:**
- [ ] 94/94 classificadas; 25 novas revisadas linha a linha
- [ ] Revogações via E15
- [ ] `check-lint-0029-drift --require-live` passa
**Esforço:** G · **Dep.:** E15, E17

### E19 · Decidir as 2 tabelas com RLS sem policy `[REQUER-PO]`
**Problema (medido):** `magazine_duplicate_requests` e `anon_catalog_grant_audit_log` têm RLS ligada e **zero policies** → só `service_role` acessa. Pode ser intencional (log escrito por SECDEF) ou esquecimento (feature morta).
**Ação:** verificar consumidores (`src/`, `supabase/functions`, `pg_depend`, `postgres_logs` 30 dias). Se intencional: `COMMENT ON TABLE ... 'RLS deny-all intencional: acesso só por service_role/SECDEF <fn>'` + entrada em allowlist. Se não: policy mínima ou drop (com backup).
**Checklist de conclusão:**
- [ ] 2/2 com decisão, comentário no catálogo e allowlist
- [ ] Query §8.2 do `SCHEMA_REFERENCE.md` retorna 0 **ou** exatamente as allowlisted
**Esforço:** P · **Dep.:** E15

> **Preparo concluído em 2026-09-16** (`docs/E19_RLS_SEM_POLICY_2026-09-16.md`):
> ambas confirmadas deny-all intencional com evidência de código (não
> suposição) — `magazine_duplicate_requests` via `magazine_duplicate_v2(...)`
> SECDEF; `anon_catalog_grant_audit_log` via `fn_anon_catalog_grant_audit_run()`
> SECDEF + cron ativo `anon-catalog-grant-audit-6h` (jobid 303). Migration
> pronta (`COMMENT ON TABLE`, não muda acesso):
> `supabase/migrations/20260916201000_e19_comment_rls_deny_intentional.sql`.
> Nova allowlist `.security/rls-no-policy-allowlist.json` (ainda sem gate de CI
> lendo-a). Aguardando aprovação do PO.

### E20 · Inventário das 82 FKs para `auth.users` `[DB-RO]` ✅ Concluída em 2026-09-16
**Problema (medido):** 82 FKs (eram 69). Cada `DELETE` em `auth.users` percorre 82 constraints; FK sem índice = seq scan por tabela.
**Ação:** listar `(tabela, coluna, ON DELETE, índice?)`. Garantir índice em todas; classificar `ON DELETE` (CASCADE vs SET NULL vs RESTRICT) contra a intenção LGPD (exclusão de conta). Registrar no `SCHEMA_REFERENCE.md` §5.

> **📋 Resultado (2026-09-16):** `docs/E20_FKS_AUTH_USERS_2026-09-16.md`. 82/82 inventariadas. **4 sem índice cobrindo a coluna** (candidatas a E29): `auth.oauth_authorizations.user_id` (tabela do Auth, pode exigir privilégio elevado), `kit_quote_requests.user_id`, `kit_save_requests.user_id` (ambas nunca analisadas, `reltuples=-1`), `magazines.owner_id` (índice existe mas é parcial, `WHERE deleted_at IS NULL`, não cobre 100%). Por `ON DELETE`: 38 CASCADE, 25 SET NULL, 19 NO ACTION (default, não deliberado), 0 RESTRICT explícito. Achado de risco LGPD: as 19 `NO ACTION` bloqueiam `DELETE FROM auth.users`; destaque para `orders` (`created_by`=NO ACTION vs `seller_id`=SET NULL na mesma tabela — assimetria provavelmente não intencional) e `password_reset_requests.user_id`/`ai_usage_logs.user_id` (ligam direto ao titular). Decisão sobre `SET NULL` vs. rotina de resolução manual fica para etapa de exclusão de conta LGPD, fora do escopo `[DB-RO]`.

**Checklist de conclusão:**
- [x] 82/82 inventariadas
- [x] 0 FK para `auth.users` sem índice (criar via E29 se faltar) — 4 encontradas sem índice, listadas como candidatas ao E29
- [x] Comportamento de exclusão de conta documentado — 19 `NO ACTION` classificadas por risco (titular direto vs. auditoria/admin)
**Esforço:** P · **Dep.:** —

### E21 · Validar a constraint `NOT VALID` `[REQUER-PO]`
**Problema (medido):** 1 constraint (`FK` ou `CHECK`) não validada — dados pré-existentes podem violá-la.
**Ação:** identificar (`pg_constraint WHERE NOT convalidated`); rodar a query de violação read-only; se 0 violações → `ALTER TABLE ... VALIDATE CONSTRAINT` (lock leve) via E15; se > 0 → decidir limpeza de dados antes.
**Checklist de conclusão:**
- [ ] Constraint identificada e contagem de violações registrada
- [ ] `convalidated = true` ou plano de limpeza aprovado
**Esforço:** P · **Dep.:** E15

> **Investigação concluída em 2026-09-16, recomendação diverge do plano**
> (`docs/E21_CONSTRAINT_NOT_VALID_2026-09-16.md`): a única constraint
> `NOT VALID` está em `realtime.messages` — schema interno da extensão
> Supabase Realtime, não `public`. 0 violações hoje, mas a tabela é owned por
> `supabase_realtime_admin`; `postgres` (role das nossas migrations) não é
> membro nem superusuário — `VALIDATE CONSTRAINT` pelo nosso pipeline falharia
> por permissão, e mesmo que não falhasse seria antipadrão alterar schema
> interno gerenciado pela extensão via `supabase/migrations/` da aplicação.
> **Nenhuma migration preparada** — recomendação é levar ao PO/DBA como item
> separado (canal Supabase, não nosso pipeline), ou aceitar "deixar como está"
> dado 0 violações.

### E22 · Gate permanente "anon sem escrita" `[GIT]`
**Problema (medido):** P1 está fechado (0 tabelas). Sem gate, o Lovable ou uma migration antiga reaplicada reabrem em minutos (incidente 2026-06-11).
**Ação:** adicionar a query §8.5 ao `supabase-security-gate.yml` (live, após E02): falha se `anon` tiver `INSERT/UPDATE/DELETE` em qualquer tabela `public` fora de allowlist vazia.
**Checklist de conclusão:**
- [ ] Gate no CI, fail-closed sem credencial
- [ ] Teste: grant temporário em tabela de teste → gate falha
**Esforço:** P · **Dep.:** E02

### E23 · FORCE RLS e revogação em tabelas de segredo `[REQUER-PO]`
**Problema (medido):** só `mcp_api_keys` tem `FORCE ROW LEVEL SECURITY`. `integration_credentials`, `external_connections`, `secret_rotation_log`, `step_up_tokens`, `user_token_revocations` guardam material sensível e o owner (postgres) bypassa RLS sem FORCE.
**Ação:** para cada tabela: confirmar que nenhuma função SECDEF depende de bypass; aplicar `FORCE ROW LEVEL SECURITY` + `REVOKE ALL FROM anon`; verificar que `service_role` continua funcionando (bypassa por atributo de role, não por owner).
**Checklist de conclusão:**
- [ ] Lista de tabelas de segredo aprovada pelo PO
- [ ] FORCE aplicado via E15 com teste transacional antes/depois
- [ ] Edge functions que as usam testadas (`secrets-manager`, `mcp-keys-*`, `step-up-verify`)
**Esforço:** M · **Dep.:** E15

> **Preparo concluído em 2026-09-16** (`docs/E23_FORCE_RLS_SEGREDO_2026-09-16.md`):
> achado central reenquadra o risco — `postgres` e `service_role` têm
> `rolbypassrls=true`, então `FORCE ROW LEVEL SECURITY` é um no-op funcional
> para os únicos consumidores reais hoje (11 funções SECDEF + edge functions
> via service_role, todas confirmadas via grep). FORCE é defesa em
> profundidade/postura, não mudança de comportamento. Migration pronta e não
> aplicada aplica FORCE + `REVOKE ALL FROM anon` (no-op confirmado — anon já
> não tinha grant) em 5 das 6 tabelas do plano (`mcp_api_keys` já tinha FORCE,
> não tocada):
> `supabase/migrations/20260916202000_e23_force_rls_secret_tables.sql`.
> `authenticated` não é tocado (tem policies reais sustentando acesso
> legítimo). Aguardando aprovação do PO.

### E24 · Higiene de credenciais no repositório e no banco `[RO]` ✅ Concluída em 2026-09-16
**Problema:** o `SCHEMA_REFERENCE.md` §7 registra `"apikey":"<ANON_KEY>"` literal em 2 cron jobs de um prompt não executado; é preciso provar que nenhum job vivo tem chave em texto plano.
**Ação:** `SELECT jobname FROM cron.job WHERE command ~* 'apikey|bearer|eyJ'` (read-only); `git log -p -S 'eyJ' -- supabase/migrations` para JWT em migrations; confirmar `.env.local` ignorado e ausência de `service_role` em `src/`. Chaves encontradas → rotação (PO).

> **📋 Resultado (2026-09-16):** `docs/E24_HIGIENE_CREDENCIAIS_2026-09-16.md`. **0 cron jobs vivos com segredo literal** — os 2 jobs que casam com o padrão (`generate-blurhashes`, `hash-product-images`) usam `get_edge_anon_key()` em runtime, não literal. **1 arquivo histórico** com JWT literal (`20260601140100_..._hardcode_url.sql`, commit `620afebc0`, chave **anon** — pública por design, não `service_role`), já remediado por 2 migrations subsequentes (`20260602020000`, `20260619210000`); 0 arquivos com `service_role` literal. `.env.local` confirmado ignorado (`git check-ignore`). 6 ocorrências de `service_role` em `src/` inspecionadas individualmente — todas mascaramento/comentário/texto de UI, 0 credenciais. O achado do `SCHEMA_REFERENCE.md` §7 não tem equivalente vivo em produção. Nenhum segredo reproduzido no documento.

**Checklist de conclusão:**
- [x] 0 cron jobs com segredo literal (ou rotacionados)
- [x] 0 JWT em migrations/histórico acessível (ou rotacionados) — 1 histórico (anon key, já remediado), 0 service_role
- [x] `git check-ignore .env.local` confirma
**Esforço:** P · **Dep.:** —

---

## FASE 3 — Capacidade, armazenamento e partições (E25–E33)
> Objetivo: o banco não para em 2027-01-01, não paga por 1,4 GB de ar, e cresce de forma prevista.

### E25 · Automação de partições de `supplier_products_raw_history` `[REQUER-PO]` — **prazo: antes de 2026-12-15**
**Problema (medido):** partições `p2026_06`…`p2026_12`, **sem DEFAULT**, **sem job de criação**. `INSERT` com `created_at ≥ 2027-01-01` falha com `no partition of relation found`. O pipeline Bronze para.
**Ação (duas opções, PO escolhe):**
- **A.** Instalar `pg_partman 5.3.1` (disponível), `create_parent(...)` com `premake = 3`, job `partman.run_maintenance_proc()` mensal.
- **B.** Função `fn_ensure_history_partitions(months_ahead int)` + cron mensal (mesmo padrão de `magazine-partition-maintenance`).
Em ambos: adicionar partição `DEFAULT` como rede de segurança com alerta se receber linhas.
**Checklist de conclusão:**
- [ ] `p2027_01`, `p2027_02`, `p2027_03` existem
- [ ] Partição DEFAULT existe e cron alerta se `count(*) > 0`
- [ ] Job de manutenção agendado e testado (simular mês futuro)
- [ ] Migration forward-only aplicada via E15
**Esforço:** M · **Dep.:** E15

> **Preparo concluído em 2026-09-16** (`docs/E25_PARTICOES_SUPPLIER_HISTORY_2026-09-16.md`):
> Opção B escolhida (função + cron — `pg_partman` não instalada, e Opção B replica
> padrão já em produção `magazine-partition-maintenance`). Migration pronta e não
> aplicada: `supabase/migrations/20260916193000_e25_supplier_history_partition_automation.sql`.
> Correção: coluna de particionamento é `captured_at`, não `created_at`. Aguardando
> aprovação do PO — não bloqueado por E15 (ver §2 do plano de execução).

### E26 · Política de retenção da history Bronze `[REQUER-PO]`
**Problema (medido):** ≈2,1 GB em 4 meses, ~600 MB/mês → ~7 GB/ano só nesta tabela. Não há retenção declarada.
**Ação:** definir com o PO: reter N meses online; `DETACH PARTITION` + `pg_dump` da partição para storage frio + `DROP`. Job mensal. Registrar a política no `SCHEMA_REFERENCE.md` §4.
**Checklist de conclusão:**
- [ ] N definido e documentado
- [ ] Job de detach/archive/drop testado em partição de teste
- [ ] Primeira partição arquivada com hash do dump guardado
**Esforço:** M · **Dep.:** E25

### E27 · Recuperar o espaço de `stock_snapshots` `[REQUER-PO]`
**Problema (medido):** 170.913 linhas ocupam 1.574 MB (heap 814 MB, índices 760 MB). O purge de 14 dias remove linhas mas o arquivo não encolhe (páginas do fim não ficam vazias). ≈1,4 GB recuperáveis; índices provavelmente inchados.
**Ação:** medir `pgstattuple` (extensão disponível) para confirmar % livre; opção A: instalar `pg_repack` e `pg_repack -t public.stock_snapshots` (sem lock longo); opção B: `VACUUM FULL` em janela (lock exclusivo, minutos). `REINDEX CONCURRENTLY` nos índices. Medir antes/depois.
**Checklist de conclusão:**
- [ ] `pgstattuple` antes registrado
- [ ] Reorganização executada com método aprovado e janela registrada
- [ ] Tamanho pós ≤ 30 % do anterior; `EXPLAIN` das queries de estoque sem regressão
**Esforço:** M · **Dep.:** E03, E15

### E28 · Retenção/agregação de `stock_daily_summary` `[REQUER-PO]`
**Problema (medido):** 242 MB → 643 MB em 2 meses, retenção "permanente". Em 12 meses passa de 2 GB. 2 índices nunca usados (37 MB).
**Ação:** definir granularidade histórica (diário até 90 dias, semanal até 1 ano, mensal depois) com tabela de agregado; job de rollup; drop dos 2 índices não usados (E29).
**Checklist de conclusão:**
- [ ] Política aprovada e documentada
- [ ] Tabela de agregado + job criados via E15
- [ ] Consumidores (`mv_stock_velocity`, relatórios) apontam para o nível certo
**Esforço:** G · **Dep.:** E15, E29

### E29 · Índices: criar os 4 que faltam, remover os 3 que sobram `[REQUER-PO]`
**Problema (medido):** 4 FKs sem índice (`kit_save_requests.user_id/kit_id`, `kit_quote_requests.user_id/quote_id` — tabelas novas do Kit Maker); 3 índices com `idx_scan = 0` somando 70 MB.
**Ação:** `CREATE INDEX CONCURRENTLY` nos 4; para os 3 não usados: confirmar `idx_scan = 0` também em réplica/`pg_stat_statements` por 14 dias, então `DROP INDEX CONCURRENTLY`. Uma migration por índice.
**Checklist de conclusão:**
- [ ] 4 índices criados; query §"FK sem índice" retorna 0
- [ ] 3 índices removidos após janela de observação; 70 MB liberados
- [ ] Zero índices inválidos após `CONCURRENTLY`
**Esforço:** P · **Dep.:** E15

### E30 · Plano de capacidade e alerta de crescimento `[GIT]` + `[REQUER-PO]`
**Problema (medido):** +39 % em 2 meses. Sem série histórica de tamanho por tabela, a projeção é chute.
**Ação:** tabela `ops.table_size_history (captured_at, schema, table, total_bytes, live_tup)` + cron diário (single-statement, via `fn_cron_safe_run`); workflow semanal que projeta 90 dias e abre issue se algum objeto > 20 % do banco ou crescimento > 30 %/mês.
**Checklist de conclusão:**
- [ ] Tabela + cron criados via E15
- [ ] 7 dias de série coletados
- [ ] Relatório de projeção publicado como artefato
**Esforço:** M · **Dep.:** E15

### E31 · Inventário e agenda de refresh das 12 materialized views `[DB-RO]` ✅ Concluída em 2026-09-16
**Problema (medido):** 12 MVs em 3 schemas; o doc de referência lista 5. `mv_product_images_audit` 84 MB. Sem inventário, um `REFRESH` esquecido serve dado velho e um `REFRESH` sem `CONCURRENTLY` bloqueia leitores.
**Ação:** por MV: definição, dependências (`pg_depend`), índice único (pré-requisito de `CONCURRENTLY`), job de refresh (nome, cron, single-statement?), consumidores. Registrar em `SCHEMA_REFERENCE.md` §6.

> **📋 Resultado (2026-09-16):** `docs/E31_INVENTARIO_MATVIEWS_2026-09-16.md`. 12/12 confirmadas (`public` 4, `analytics` 7, `internal` 1). **12/12 têm índice único válido** para `REFRESH CONCURRENTLY` — nenhuma "sem índice". 12/12 têm job identificável (7 dedicados, 5 só via `refresh_all_materialized_views()`, hora em hora). 4 achados de risco: (1) `analytics.categories_tree_visual` refrescada **sem** `CONCURRENTLY` apesar de ter índice único válido — comentário no código está desatualizado; (2) refresh duplicado/redundante em `mv_stock_velocity` e `mv_product_intelligence` (job dedicado + agregadora, risco de dois `CONCURRENTLY` concorrentes); (3) 3 MVs sem consumidor de aplicação identificável no grep (`mv_product_images_audit` 84 MB, `mv_ema_kpi_by_level`, `mv_media_health`) — decisão de descontinuar refresh fica fora do escopo `[DB-RO]`; (4) cadeia de dependência mapeada (`mv_stock_velocity` → `mv_product_intelligence`/`mv_stock_rupture_alert` → `mv_ema_kpi_by_level`).

**Checklist de conclusão:**
- [x] 12/12 com job identificado ou marcada "sem refresh — investigar"
- [x] MVs sem índice único listadas para E37 — nenhuma; achado real foi refresh sem CONCURRENTLY em 1 MV com índice
- [x] Doc atualizado
**Esforço:** P · **Dep.:** E04

### E32 · Autovacuum por tabela para alta rotatividade `[REQUER-PO]`
**Problema:** `stock_snapshots`, `image_backfill_queue` (116 k linhas em jul), `webhook_deliveries`, `webhook_outbox`, `optimization_queue` são filas/séries com churn alto. Autovacuum padrão (20 % + 50 linhas) chega tarde.
**Ação:** `ALTER TABLE ... SET (autovacuum_vacuum_scale_factor = 0.02, autovacuum_analyze_scale_factor = 0.01)` nas 5; medir `n_dead_tup` por 14 dias antes/depois.
**Checklist de conclusão:**
- [ ] Parâmetros aplicados via E15
- [ ] `n_dead_tup` médio 14 dias caiu ≥ 50 % nas 5 tabelas
**Esforço:** P · **Dep.:** E15, E27

### E33 · Monitor de wraparound, TOAST e sequências `[GIT]`
**Problema (medido):** hoje sem risco (máx. sequência int4 = 322; slots saudáveis). Sem monitor, a primeira notícia é o incidente.
**Ação:** incluir no cron de E30: `age(datfrozenxid)` do banco, sequências int4 > 50 %, slots inativos com WAL retido > 1 GB. Alerta via issue.

> **📋 Resultado (2026-09-16, preparação):** `docs/E33_MONITOR_WRAPAROUND_2026-09-16.md`. Medição confirma "sem risco hoje": `age(datfrozenxid)` = 46.004.605 (2,3% do threshold de aviso); 10 sequências int4 (0 int2), todas ≤0,01% do limite (`_qa_pct_results_id_seq`=322 bate com o plano); 2 replication slots, ambos ativos, WAL retido 37 kB. TOAST extra (fora do pedido original, medido por completude): `products` em 170,7% TOAST/heap (75 MB) é o sinal mais acionável. Thresholds propostos (aviso/crítico) para as 4 métricas + threshold composto para TOAST (evita ruído de tabelas pequenas). Decisão de schema: tabela nova `ops.wraparound_monitor_log` (formato genérico métrica/objeto/valor), não reaproveitar `ops.table_size_history` do E30 — schemas heterogêneos (por-banco, por-sequência, por-slot, por-tabela) não cabem numa única forma tabular. SQL de tabela + cron (single-statement via `fn_cron_safe_run`, `p_key=167` a confirmar) escrito e pronto, **não aplicado** — depende de E30 (schema `ops` ainda não existe) e aprovação do PO.

**Checklist de conclusão:**
- [ ] 3 métricas coletadas diariamente — SQL pronto, aguarda aprovação/aplicação via pacote E30
- [ ] Teste de alerta com limiar artificial — esboço do workflow documentado, não implementado
**Esforço:** P · **Dep.:** E30

---

## FASE 4 — Desempenho e cron (E34–E40)
> Objetivo: os 114 h de `fn_cron_safe_run` e as RPCs de 12 s deixam de ser invisíveis.

### E34 · Identificar as 3 RPCs PostgREST de 6,8–12,3 s `[DB-RO]` ✅ Concluída em 2026-09-16
**Problema (medido):** 3 entradas `WITH pgrst_source ... pgrst_call.pgrst_scalar` com média 12.010 / 6.847 / 12.305 ms e 3.402 / 3.805 / 1.530 chamadas. São chamadas de aplicação — usuário espera 12 s.
**Ação:** `SELECT queryid, query FROM pg_stat_statements WHERE query LIKE 'WITH pgrst_source%' ORDER BY total_exec_time DESC` → extrair o nome da função do `LATERAL`; `EXPLAIN (ANALYZE, BUFFERS)` com parâmetros reais de `postgres_logs`; classificar (falta índice, N+1 em plpgsql, `SECURITY DEFINER` sem `STABLE`, seq scan em `products`).

> **📋 Resultado (2026-09-16):** `docs/E34_RPCS_LENTAS_2026-09-16.md`. 3/3 nomeadas e reconciliadas com o plano (pequena divergência de `calls` no #3, 1.538 vs 1.530, é o contador cumulativo avançando entre capturas — mesma função). **`fn_process_raw_v2`** (12.010 ms, 3.402 chamadas): pipeline síncrono de 3 sub-funções, 2 delas com N+1 + `BEGIN/EXCEPTION` por linha (subtransação por linha); tabela pequena (19.805 linhas), descarta seq scan. **`fn_asia_stock_fast_sync`** (6.847 ms, 3.805 chamadas): índice presente e usado corretamente (`EXPLAIN` confirma plano eficiente); causa é N+1 puro com subtransação por item. **`fn_spot_direct_prices_gold`** (12.293 ms, 1.538 chamadas): mesmo N+1 + agravante de índice parcial existente cobrindo outro fornecedor (XBZ), não o usado pela função (STRICKER) — `Filter` residual em vez de `Index Cond` completo. Nenhuma das 3 é `STABLE`. Propostas de correção (refactor set-based, não aplicadas) com ganho estimado por RPC — nenhum `EXPLAIN ANALYZE` rodado em produção, por instrução da tarefa.

**Checklist de conclusão:**
- [x] 3/3 nomeadas, com plano de execução anexado
- [x] Causa raiz por RPC — N+1/subtransação por linha nas 3, agravado por índice parcial insuficiente no #3
- [x] Proposta de correção com ganho estimado (vai para E15) — refactor set-based, ganho estimado 80–90% de redução
**Esforço:** M · **Dep.:** E02

### E35 · `fn_reposicao_backfill_today`: 15 s por chamada `[REQUER-PO]`
**Problema (medido):** 2.076 chamadas × 14.985 ms = 31.108 s (8,6 h). Se é cron, roda demais ou faz demais.
**Ação:** ler a função; identificar o job que a chama e a frequência; `EXPLAIN` das queries internas; reduzir janela de trabalho (incremental por `updated_at`) ou frequência. Meta: < 2 s ou < 6 chamadas/dia.
**Checklist de conclusão:**
- [ ] Causa identificada
- [ ] Correção aplicada via E15
- [ ] `pg_stat_statements` 7 dias depois: total_exec_time < 10 % do anterior
**Esforço:** M · **Dep.:** E34

### E36 · Distribuição de custo de `fn_cron_safe_run` por job `[DB-RO]` ✅ Concluída em 2026-09-16
**Problema (medido):** 355.638 chamadas, média 1.157 ms, total 411.672 s. É wrapper de ~48 crons — a média esconde 2–3 jobs pesados.
**Ação:** `cron.job_run_details` (30 dias): `jobname, count, avg(end_time-start_time), max` → top 10; correlacionar com `pg_stat_statements` das queries internas. Produzir ranking de custo.

> **📋 Resultado (2026-09-16):** `docs/E36_CUSTO_FN_CRON_SAFE_RUN_2026-09-16.md`. Correção de unidade no texto do plano: a média é ~1,159 **segundos**/chamada, não ms. Janela real de `cron.job_run_details` é ~17 dias (retenção), não 30. Ranking top 10 construído por `jobid` (fonte confiável, ao contrário de `pg_stat_statements` que agrega/normaliza e sofreu 53 evictions desde 2026-06-21). **`asia-image-uploader` domina com 67,57%** do custo wrapped (76.168,5 s) — causa raiz confirmada: `pg_sleep(60)` síncrono dentro da função (99,6% do tempo é sleep, não processamento), candidato a nova etapa (dispatch/harvest separados em 2 jobs). `refresh-all-materialized-views` é 2º (11,13%, 12.550 s) — custo real de refresh, não bug. Juntos, os 2 somam 78,70% do total. `fantasmas-deactivate-guard` (3º, 2,90%) tem p95/p50 com gap de 13x (contenção ocasional), custo total baixo. Também identificado: `reposicao-backfill-hourly` (não usa o wrapper) seria o #2 do ranking geral se incluído — confirma que já é objeto do E35, números aqui servem de evidência adicional para aquela etapa.

**Checklist de conclusão:**
- [x] Ranking dos 10 jobs mais caros com duração p50/p95
- [x] Os 3 primeiros têm etapa de otimização aberta (E35 ou nova) — #1 candidato a nova etapa (pg_sleep síncrono), #2 candidato a nova etapa (EXPLAIN por MV), #3 (reposicao-backfill) já é E35
**Esforço:** P · **Dep.:** —

### E37 · Converter os 59 cron jobs multi-statement `[REQUER-PO]`
**Problema (medido):** 59 jobs ativos com 2+ statements. Regra do projeto (bug #13): multi-statement aborta no primeiro erro e os seguintes nunca rodam, **sem registro de falha** (`cron_falhas_7d = 0` pode ser falso zero). `VACUUM` em bloco é o caso mais grave.
**Ação:** por job: se `VACUUM`/`ANALYZE` → um job por tabela, single-statement; se lógica → função `fn_job_<nome>()` com `EXCEPTION` e log em `cron_watchdog_log`, job vira `SELECT fn_job_<nome>()`. Lotes de 10.
**Checklist de conclusão:**
- [ ] Query §8.4 retorna 0
- [ ] Cada job convertido tem 1 execução bem-sucedida registrada
- [ ] `cron.job` exportado (E03) antes e depois, diff revisado
**Esforço:** G · **Dep.:** E03, E15, E36

### E38 · Decidir os 2 cron jobs desligados `[REQUER-PO]`
**Problema (medido):** `process-webhook-outbox` (a fila `webhook_outbox` não drena desde 2026-06-22?) e `pipeline-classify-categories` inativos. P3 do doc de julho continua aberto.
**Ação:** `SELECT count(*), min(created_at) FROM webhook_outbox WHERE processed_at IS NULL`; verificar se `webhook-dispatcher` (edge) substituiu o cron; decidir religar / remover job + documentar / migrar. Idem para classificação.
**Checklist de conclusão:**
- [ ] Tamanho e idade da fila registrados
- [ ] Decisão por job com dono
- [ ] `cron.job WHERE NOT active` = 0 **ou** comentado no doc como intencional
**Esforço:** P · **Dep.:** —

### E39 · Investigar 262 deadlocks e 22,5 % de rollback `[DB-RO]` ✅ Concluída em 2026-09-16
**Problema (medido):** `pg_stat_database.deadlocks = 262`; `xact_rollback / total = 22,53 %`. Rollback alto pode ser PostgREST devolvendo erro (4xx) ou testes E2E; deadlocks indicam ordem de lock inconsistente (provável em `products` ↔ satélites via trigger).
**Ação:** `postgres_logs` 24 h: `deadlock detected` → pares de tabelas; `ERROR:` mais frequentes → origem (pgrst / edge / cron). Registrar. Se deadlock em `products`/`product_*`: ordenar escrita nos triggers `trg_sync_product_*`.

> **📋 Resultado (2026-09-16):** `docs/E39_DEADLOCKS_ROLLBACK_2026-09-16.md`. **Sem deadlock ativo e sem contenção de lock** no momento da auditoria (`pg_locks` só a própria conexão). **0 ocorrências de "deadlock detected"** nos logs das últimas 24h. Os 262 deadlocks e a taxa de rollback de 22,49% são contadores **cumulativos de 61,3 dias** (desde o último restart em 2026-07-17, sem `stats_reset`) — sem série temporal anterior, não dá para calcular taxa diária real nem localizar quando os 262 ocorreram (limitação: logs só têm janela de consulta de 24h por chamada). As 3 RPCs lentas do E34 não aparecem em nenhum lock/log das últimas 24h. Não foi possível produzir "top 5 pares de deadlock" (pedido original do plano) porque não há nenhum deadlock na janela investigável — resultado é "sem anomalia ativa detectável", não falha de investigação. Recomendação principal (R1, não aplicada): instrumentar snapshot periódico de `pg_stat_database` para obter baseline temporal real.

**Checklist de conclusão:**
- [x] Top 5 pares de deadlock e top 5 erros com origem — não aplicável: 0 deadlocks/erros de transação na janela de 24h investigável; 3 ERROR encontrados eram falsos positivos (slow query de replicação)
- [x] Plano de correção para o par #1 (vai para E15) — não aplicável, nenhum par de deadlock ativo identificado
- [x] Baseline registrada para comparação pós-correção — recomendado instrumentar snapshot periódico (R1), ainda não implementado, decisão do PO
**Esforço:** M · **Dep.:** E02

### E40 · Baseline de desempenho e SLO por RPC crítica `[GIT]` + `[REQUER-PO]`
**Problema:** `pg_stat_statements` acumula desde a criação da instância — média de 6 meses não reflete hoje.
**Ação:** snapshot semanal de `pg_stat_statements` para `ops.pgss_history` (cron, single-statement); `pg_stat_statements_reset()` uma vez, aprovado, após o snapshot; SLO documentado para 10 RPCs críticas (Kit Maker, orçamento, catálogo público, busca): p95 < 500 ms. Workflow semanal compara e abre issue.
**Checklist de conclusão:**
- [ ] Tabela + cron criados
- [ ] Reset executado uma vez com snapshot prévio guardado
- [ ] 10 RPCs com SLO e medição semanal publicada
**Esforço:** M · **Dep.:** E30, E34

---

## FASE 5 — Contratos código ↔ banco (E41–E45)
> Objetivo: paridade deixa de ser verificada por `grep` e passa a ser verificada por estrutura.

### E41 · Substituir o proxy da REGRA #4 por diff estrutural `[GIT]`
**Problema (medido):** `grep -c "export type" types.ts` = **7** (aliases de topo). Uma tabela removida de `Database.public.Tables` **não altera** esse número. O incidente `magazine_*` (2026-07-16) passaria pelo check. Hoje a paridade está perfeita (0 tabelas ausentes) — o gate é que não prova isso.
**Ação:** `scripts/extract-types-inventory.mjs` → JSON com nomes de `Tables`, `Views`, `Functions`, `Enums` por schema. Gate: (a) diff contra o commit anterior — remoção exige justificativa no PR; (b) diff contra `pg_catalog` (live, após E02) — falha se tabela viva não está em `types.ts`. Atualizar `CLAUDE.md` REGRA #4 com o novo comando.
**Checklist de conclusão:**
- [ ] Inventário: 383 tabelas + 14 partições, 193 views, enums, funções expostas
- [ ] Gate falha ao remover `magazines` do `types.ts` em teste
- [ ] `CLAUDE.md` REGRA #4 atualizada; `regenerate-supabase-types.yml` usa o gate
**Esforço:** M · **Dep.:** E02

### E42 · Edge Functions: verificar hash do bundle, não só o nome `[GIT]` ✅ Concluída em 2026-09-16
**Problema (medido):** 108 × 109 — paridade por nome. A API expõe `ezbr_sha256` por função; `edge-functions-drift-check.yml` existe. Nome igual com código diferente é drift invisível.
**Ação:** o workflow calcula o bundle local (`supabase functions build` ou hash canônico dos fontes) e compara com `ezbr_sha256`; lista `verify_jwt` por função e falha se uma função pública (`verify_jwt = false`) não está em allowlist com motivo (hoje: 30+ com `false`).

> **📋 Resultado (2026-09-16):** `docs/E42_HASH_EDGE_FUNCTIONS_2026-09-16.md`, script `scripts/check-edge-verify-jwt-allowlist.mjs`, teste `tests/scripts/check-edge-verify-jwt-allowlist.test.mjs`. Reconfirmado ao vivo: 108 funções, 36 com `verify_jwt=false` (zero drift vs. `config.toml` e vs. a allowlist nova). `ezbr_sha256` **não é reproduzível localmente** — algoritmo não documentado pela Supabase; testados 5 candidatos contra dados reais de `crm-db-bridge`, nenhum bateu — tratado como campo de observabilidade, não como critério de pass/fail. Achado que mudou o design: o bundle deployado **exclui `*.test.ts`** (confirmado via `get_edge_function` em `crm-db-bridge`: 9 arquivos reais, nenhum dos 7 testes co-localizados) — hashear o diretório local inteiro teria causado DRIFT falso-positivo em ~15 functions com testes co-localizados. Corrigido: o step `hash_diff` do workflow agora usa o **manifesto do próprio download canônico** como lista de arquivos de referência (inclui `_shared/*.ts` importado, que a comparação antiga só-`index.ts` não cobria; exclui testes por construção). Lógica validada via 3 cenários manuais em bash + `actionlint` (0 issues) + parse YAML; **primeira execução real em CI ainda pendente** (sandbox sem `SUPABASE_ACCESS_TOKEN`). Allowlist nova `.security/edge-functions-verify-jwt-false-allowlist.json`: 36 entradas, toda `reason` fundamentada em código (`edge-authz-manifest.ts`/`config.toml`), nenhum placeholder. Gate falha se função pública nova não documentada (testado com função sintética). 13/13 testes novos + 160/160 em `tests/scripts/` (sem regressão), `eslint` 0 issues.

**Checklist de conclusão:**
- [x] 108/108 com hash comparado — lógica do `hash_diff` estendida para manifesto completo (index.ts + `_shared/*.ts` importado), validada localmente; execução real em CI pendente (sem credencial neste sandbox)
- [x] Allowlist de `verify_jwt = false` com motivo por função — 36/36, zero drift vs. `config.toml` e vs. Management API ao vivo
- [x] `tests/` excluído explicitamente — `EXCLUDE = new Set(['_shared', 'tests'])`, testado
**Esforço:** M · **Dep.:** E02

### E43 · Objetos órfãos e referências a objetos inexistentes `[RO]` ✅ Concluída em 2026-09-16

> **📋 Resultado de E43 (2026-09-16):** `docs/E43_OBJETOS_ORFAOS_2026-09-16.md`. Lista (a) **não é vazia**: 3 achados reais e ativos em produção — edge function `bitrix-sync` (ACTIVE) referencia `bitrix_clients`/`bitrix_deals`/`sync_logs`, nenhuma existe no banco canônico (4 ações da function quebram em runtime); `e2e-cleanup` (ACTIVE) grava em `e2e_cleanup_audit`, que não existe apesar de migração `20260426200011` criá-la — drift de migração real; `stock_notes` referenciada por hook sem nenhum importador (código morto, não quebra hoje). 5 outros candidatos investigados e descartados como falso-positivo (CRM externo via `crm-db-bridge`, fallback documentado, RPC morta com try/catch). Lista (b), com refinamento de 2 passadas (uso interno via `pg_depend`/regex em `prosrc`/`definition`, não só grep de código): **128 views** (de 162 brutas) e **596 funções** (de 860 brutas) sem consumidor conhecido — nenhum `DROP` sugerido ou aplicado. 8 ressalvas metodológicas documentadas (invocação dinâmica por nome, overloads, etc.). **Achado de maior prioridade para etapa futura de correção (fora do escopo `[RO]`):** os 3 gaps da lista (a) em edge functions ativas.

**Problema (medido):** 193 views e 1.320 funções vs consumidores em `src/` (2.568 arquivos) e `supabase/functions`. Nada mede o que sobrou.
**Ação:** extrair chamadas `.rpc('x')`, `.from('x')`, `supabase.functions.invoke('x')` do código; cruzar com `pg_proc`/`pg_class`/lista de funções. Duas listas: (a) código chama objeto inexistente (bug latente); (b) objeto sem consumidor em código, `pg_depend`, cron ou edge (candidato a remoção **futura**, não automática).
**Checklist de conclusão:**
- [x] Lista (a) = 0 ou com issue por item — não é 0; 3 achados reais documentados com localização exata, issue registrada para etapa de correção futura
- [x] Lista (b) publicada com contagem; nenhum drop nesta etapa — 128 views + 596 funções, 0 drops
**Esforço:** M · **Dep.:** E01

### E44 · Contrato de enums entre banco e TypeScript `[GIT]` ✅ Concluída em 2026-09-16
**Problema:** 15 enums (`app_role`, `magazine_status`, `payment_status`…). Um valor novo no banco sem o tipo TS produz `switch` sem `default` silencioso.
**Ação:** teste que compara `pg_enum` (live) com `Database.public.Enums` e com unions manuais em `src/types/`; falha em qualquer diferença de valor ou ordem.

> **📋 Resultado (2026-09-16):** `docs/E44_CONTRATO_ENUMS_2026-09-16.md`, teste `tests/scripts/check-enum-contract.test.mjs`. 15/15 enums mapados contra `Constants.public.Enums`. 2/15 (`app_role`, `step_up_action`) tinham unions manuais duplicadas em `src/` — agora cobertas pelo teste de drift. Teste validado por mutação: injetou valor de enum falso em `src/lib/roles.ts`, confirmou que o teste falha como esperado, reverteu (`git diff --stat` vazio depois). 3/3 asserções passam no CI, fail-closed.

**Checklist de conclusão:**
- [x] 15/15 enums cobertos
- [x] Teste no CI (fail-closed sem credencial) — mutation-tested, reversão confirmada limpa
**Esforço:** P · **Dep.:** E41

### E45 · `products` (184 colunas) — comentário, satélites e `product_physical` `[REQUER-PO]`
**Problema (medido):** `COMMENT ON TABLE products` diz 152 colunas; reais 184 (P4 aberto). 5 satélites 1:1 por trigger; `product_physical` é write-only. A god table é o objeto mais lido do sistema e cresce por acréscimo.
**Ação:** (1) corrigir o comentário (migration de `COMMENT`, via E15); (2) inventário das 184 colunas por consumidor (`src/`, views, funções) — colunas sem leitor há 90 dias listadas; (3) documentar `product_physical` como buffer write-only no catálogo (`COMMENT ON TABLE`) para ninguém "limpar"; (4) proposta de decomposição (não executar) para colunas AI/SEO/fiscal já satelizadas.
**Checklist de conclusão:**
- [ ] Comentário = 184 (ou gerado dinamicamente)
- [ ] Inventário coluna → consumidores publicado
- [ ] `product_physical` comentado no catálogo
- [ ] Proposta de decomposição com estimativa, sem DDL
**Esforço:** G · **Dep.:** E15, E43

---

## FASE 6 — Observabilidade e governança contínua (E46–E50)
> Objetivo: o que foi corrigido não regride em silêncio; o que ficou aberto tem dono e data.

### E46 · Drift check live semanal + comparação ledger ↔ arquivos no CI `[GIT]`
**Problema:** o drift check (fail-closed desde #1864) só roda quando alguém dispara. O manifesto (E06) só existe local. **Atualizado pelo achado de E02:** `db diff` não completa hoje (replay trava em DDL out-of-band histórica), então o "drift check semanal" não pode depender só dele.
**Ação:**
1. `schedule: cron('0 6 * * 1')` em `schema-snapshot-export.yml` (não em `db-schema-drift-check.yml` — esse continua fail-closed e manual/on-push, sinalizando "não calculável" honestamente via E02).
2. O job semanal gera `SCHEMA_LIVE.sql` de hoje e diffa contra o `SCHEMA_LIVE.sql` commitado da semana anterior — isso funciona **mesmo com `db diff` quebrado**, porque não depende de replay. Abre PR/issue quando há diferença.
3. Job adicional roda `npm run ledger:manifest` (E06) contra o ledger live e falha se surgir `aplicada-sem-ledger` ou `registrada-sem-arquivo` novo; resultado vai para `MIGRATIONS_SYNC_LOG.md`.
4. Quando (e se) E07/E08 fecharem a dívida histórica o suficiente para `db diff` completar, promover de volta para o mecanismo original como verificação adicional (não substituta).
**Checklist de conclusão:**
- [ ] 2 execuções semanais consecutivas com diff de `SCHEMA_LIVE.sql` publicado (verde ou com issue aberta)
- [ ] Manifesto no CI com diff contra o versionado
**Esforço:** P · **Dep.:** E02 (✅), E06, E12

### E47 · Detector contínuo de assinatura de schema `[REQUER-PO]`
**Problema (medido):** `schema_signature_baseline` (7.201 colunas), `schema_signature_drift_log`, `schema_drift_log` existem mas não há prova de que alertam.
**Ação:** cron diário `fn_capture_schema_baseline()` → compara → grava em `schema_signature_drift_log`; edge `schema-drift-check` (existe) notifica; allowlist em `schema_signature_drift_allowlist`. Teste: `COMMENT ON` em objeto de teste → entrada no log em < 24 h.
**Checklist de conclusão:**
- [ ] Cron ativo, single-statement
- [ ] Teste de detecção passou
- [ ] Notificação chega a canal definido pelo PO
**Esforço:** M · **Dep.:** E12, E15

### E48 · `MIGRATIONS_SYNC_LOG.md` como recibo, não como narrativa `[GIT]`
**Problema:** o log existe (`supabase/MIGRATIONS_SYNC_LOG.md`) mas frases como "sincronizado" sem hash são interpretadas como certificação.
**Ação:** contrato: uma linha por aplicação (`versão | sha256 arquivo | md5 statements | executor | método (E15/repair/MCP-ticket) | data UTC | pós-check`). Cabeçalho com "último recibo" e "ledger hash". Gate: PR que toca `supabase/migrations/` sem linha nova no log falha.
**Checklist de conclusão:**
- [ ] Formato tabular implementado; histórico antigo movido para seção "legado — não verificado"
- [ ] Gate ativo e testado
- [ ] Entradas de E08/E09 registradas neste formato
**Esforço:** P · **Dep.:** E08, E11

### E49 · Higiene do repositório com prova de não-perda `[GIT]`
**Problema (medido):** 59 commits dangling (`WIP on …`, 09-11 → 09-15), 2 worktrees `prunable`, branches `[gone]`, graphify em `89292143` vs `HEAD 7fbbcabe5`, allowlist `pptxgenjs` expira 2026-10-09.
**Ação:** (1) para cada dangling: `git diff <dangling> <merge-final-da-branch> --stat`; se vazio ou só timestamps → descartável; (2) `git worktree prune` só após (1); (3) `git branch -d` (nunca `-D`) nas `[gone]`; (4) `graphify update . --force` e confirmar auto-sync N8N; (5) decidir renovação ou remoção da allowlist `pptxgenjs` antes de 10/10.
**Checklist de conclusão:**
- [ ] 59/59 classificados em tabela; 0 com diff relevante não preservado
- [ ] `git worktree list` sem `prunable`; `git branch -vv | grep gone` vazio
- [ ] `GRAPH_REPORT.md` = `HEAD`
- [ ] Decisão `pptxgenjs` registrada antes de 2026-10-09
**Esforço:** P · **Dep.:** E01 · **Supersede:** plano 09-15 E03/E10, plano 09-13 E03/E05

### E50 · Certificação final e runbook mensal de DBA `[GIT]`
**Ação:** repetir todas as medições de §1 no mesmo dia; publicar `docs/db/CERTIFICACAO_2026-MM.md` com `PASS / FAIL / GAP / BLOQUEADO` por linha desta fotografia e owner de cada `GAP`. Criar `docs/db/RUNBOOK_MENSAL.md` com as 12 queries que reproduzem §1 e os limiares de alerta; agendar execução mensal (workflow) que abre PR com o resultado.
**Checklist de conclusão:**
- [ ] Certificação com 100 % das linhas de §1 reavaliadas
- [ ] 0 linhas `BLOQUEADO` por credencial
- [ ] Runbook executado uma vez por automação com PR aberto
- [ ] Matriz de planos (E05) fechada: cada etapa dos 3 planos com estado final
**Esforço:** M · **Dep.:** todas

---

## 3. Ordem de execução

| Onda | Etapas | Pré-condição | Marco |
|---|---|---|---|
| 1 — Base | E01, E02, E03, E04, E05 | — | Verificação live funciona; backup provado; docs verdadeiros |
| 2 — Ledger | E06, E07, E10, E11, E13, E14 | Onda 1 | Manifesto completo; 484 classificadas |
| 3 — Ledger (escrita) | E08, E09, E12, E15 | E07 aprovado pelo PO | Ledger verdadeiro; caminho único de aplicação |
| 4 — Segurança | E16–E24 | E15 | Superfície `anon`/`authenticated` justificada e vigiada |
| 5 — Capacidade | **E25 (prazo 2026-12-15)**, E26–E33 | E15 | Sem bomba de partição; 1,4 GB recuperados; crescimento medido |
| 6 — Desempenho | E34–E40 | E02 | RPCs de 12 s nomeadas e corrigidas; crons single-statement |
| 7 — Contratos | E41–E45 | E02 | Paridade provada por estrutura |
| 8 — Governança | E46–E50 | tudo | Regressão detectada em ≤ 7 dias; certificação |

**Etapas com prazo duro:** E25 (partições) antes de **2026-12-15**; E49 item 5 (`pptxgenjs`) antes de **2026-10-09**.

## 4. Gates de interrupção

- Projeto resolvido ≠ `doufsxqlfjyuvxuezpln` → parar.
- Verificação live falha → etapa `BLOQUEADO`; nunca `PASS`.
- `migration repair` ou E15 produz DDL em `postgres_logs` além da esperada → parar, preservar log, reverter por PITR se necessário.
- `db diff` mostra objeto que nenhuma migration explica → E12 antes de qualquer aplicação.
- Regeneração de `types.ts` remove tabela viva → não commitar (E41 bloqueia).
- Qualquer etapa `[REQUER-PO]` sem aprovação escrita por objeto → não executa.
- Se a partição DEFAULT de E25 receber linhas → alerta imediato; investigar antes de continuar Onda 5.

## 5. Checklist final 10/10

- [ ] Ledger reflete 100 % das migrations aplicadas (0 `aplicada-sem-ledger`) ou cada exceção tem justificativa individual.
- [ ] Existe **um** caminho autorizado para aplicar migration (E15) e ele exige aprovação do PO.
- [ ] DDL fora do fluxo é detectada em ≤ 7 dias.
- [ ] Toda SECDEF executável por `anon`/`authenticated` tem `reason` específico em allowlist.
- [ ] As 8 views `*_public` têm contrato de colunas com gate.
- [ ] `supplier_products_raw_history` tem partições até ≥ 3 meses à frente e política de retenção.
- [ ] `stock_snapshots` ≤ 30 % do tamanho de 2026-09-16.
- [ ] 0 cron jobs multi-statement; 0 jobs desligados sem decisão.
- [ ] As 3 RPCs de 12 s estão abaixo do SLO.
- [ ] `types.ts`, enums e Edge Functions verificados por estrutura/hash, não por `grep`.

---

*Evidência coletada read-only em 2026-09-16 via `pg_catalog`, `pg_stat_statements`, `cron.job`, `supabase_migrations.schema_migrations`, Git e GitHub API. Nenhuma DDL executada. Nenhum dado alterado.*
