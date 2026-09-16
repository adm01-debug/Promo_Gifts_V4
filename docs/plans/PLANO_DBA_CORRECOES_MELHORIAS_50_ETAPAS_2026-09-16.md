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

### E01 · Sincronizar a branch de trabalho e congelar a linha de base `[GIT]`
**Problema (medido):** `main` 4 atrás; branch atual não contém #1863 (`catalog_e24_zapp_catalog_stats`) nem #1864 (drift check fail-closed). Qualquer verificação feita aqui sai defasada.
**Ação:**
1. `git checkout main && git merge --ff-only origin/main`.
2. Rebasear `claude/audit-gaps-20260915` sobre `origin/main` (o único commit próprio é `7fbbcabe5`); resolver conflitos semanticamente (REGRA #3).
3. Confirmar que `npm run check:migration-refs` passa (prova de que #1864 está presente).
4. Registrar em `docs/plans/` a linha de base: SHA de `main`, `origin/main`, `HEAD`, data, hash do ledger (`md5(string_agg(version))`).
**Checklist de conclusão:**
- [ ] `git rev-list --left-right --count main...origin/main` = `0 0`
- [ ] Branch de trabalho contém `64cc27731` e `1d2fafccd`
- [ ] `npm run check:migration-refs` sai 0
- [ ] Linha de base com SHAs + hash do ledger registrada
**Esforço:** P · **Dep.:** — · **Supersede:** plano 09-15 E01/E06/E08

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
- [ ] Dump schema-only + hash guardado
- [ ] Ledger exportado + hash guardado
- [ ] `cron.job` exportado
**Esforço:** P · **Dep.:** E02 para o passo 2 (dump via CLI) · passos 3–4 **não dependem de E02** (uso MCP `execute_sql`, já disponível)

> **Pre-mortem:** não encontrei ferramenta que leia status de PITR/backup do projeto `doufsxqlfjyuvxuezpln` — nenhum tool MCP carregado expõe isso (só achei equivalentes de *outros* projetos Supabase da conta). **Passo 1 é ação sua**, no painel Supabase → Database → Backups. Passo 2 (`pg_dump --schema-only`) precisa da CLI autenticada (E02) ou de você rodá-lo localmente. Passos 3 e 4 eu já posso fazer agora via `execute_sql`, sem esperar nada.

### E04 · Regenerar `docs/SCHEMA_REFERENCE.md` a partir do `pg_catalog` `[GIT]`
**Problema (medido):** o documento diz "se divergir > 5 %, regenere". Divergência hoje: banco +39 %, SECDEF +6 %, FKs `auth.users` +19 %, P1 (anon write) **já fechado**, views sem `security_invoker` 0 → 8, matviews 5 → 12. Quem lê o doc toma decisões erradas.
**Ação:** rodar todas as queries de §8 do documento + as desta fotografia (§1); regravar as seções 1–6 com números de 2026-09-16; mover P1 para "fechado"; adicionar §1.3 (capacidade) e §1.4 (desempenho) como seções permanentes. Confirmar que `scripts/check-schema-reference-drift.mjs` compara contra os novos números.
**Checklist de conclusão:**
- [ ] Todas as contagens do doc batem com `pg_catalog` no mesmo dia
- [ ] P1 marcado como fechado com evidência (`anon_write_tables = 0`)
- [ ] 8 views SECDEF e 12 matviews documentadas
- [ ] `check-schema-reference-drift` passa contra o doc novo
**Esforço:** M · **Dep.:** E01

### E05 · Consolidar os três planos em uma matriz única `[GIT]`
**Problema:** três planos de 50 etapas com sobreposição (ex.: drift check aparece em 09-13 Fase 1, 09-15 E28 e aqui E02/E46). Sem matriz, agentes executam a mesma coisa duas vezes ou pulam achando que outro fez.
**Ação:** criar `docs/plans/MATRIZ_PLANOS_2026-09.md` com uma linha por etapa dos três planos: estado (`feito`/`aberto`/`superseded`/`bloqueado`), PR que resolveu, etapa equivalente nos outros planos. Marcar nos planos originais o que já está fechado.
**Checklist de conclusão:**
- [ ] 150 linhas (50 × 3) com estado e referência
- [ ] Nenhuma etapa aberta em dois planos sem apontar qual é canônica
- [ ] Planos 09-13 e 09-15 atualizados com "ver matriz"
**Esforço:** M · **Dep.:** E01

---

## FASE 1 — Integridade do ledger de migrations (E06–E15)
> Objetivo: o ledger passa a dizer a verdade, ou pelo menos a dizer explicitamente o que não sabe.

### E06 · Reconciliar e regerar a matriz completa arquivo ↔ ledger `[DB-RO]`
**Problema (medido):** 2.985 arquivos × 2.413 linhas, comparados hoje só por prefixo de versão (achado: 5 "só no ledger", 484 "só local"). **Já existe** um pipeline para isso — não construir do zero: `scripts/build-migration-ledger-manifest.mjs` + `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-08-28.json` (output já gerado uma vez) + `docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-08-26.json` (input local, usado também por `scripts/check-no-db-push.mjs` — é código vivo, não histórico morto) + `docs/MANIFESTO_MIGRATIONS_RECONCILIADAS_2026-09-11.json` (exceções fechadas do PR #1855).
**Ação:**
1. **Antes de tudo:** reconciliar a divergência encontrada no pre-mortem (ver caixa abaixo) — sem isso, não dá para confiar em nenhum dos dois números.
2. Gerar `ledger-sanitizado.json` novo via `execute_sql` (não precisa de CLI/E02): `SELECT version, name, statements IS NULL AS statements_is_null, coalesce(array_length(statements,1),0) AS statement_count, ... FROM supabase_migrations.schema_migrations ORDER BY version` + hash de cada `statement` e do array concatenado, no mesmo formato que o script espera.
3. Regerar `docs/MANIFESTO_MIGRATIONS_FORWARD_ONLY_2026-xx-xx.json` (localizar/checar se existe gerador; se não existir, documentar como gap e escrever um mínimo) com os 2.985 arquivos atuais.
4. Rodar `build-migration-ledger-manifest.mjs` com os dois inputs novos → `docs/MANIFESTO_LEDGER_CANONICO_SANITIZADO_2026-09-16.json`.
5. Adicionar ao manifesto o enum de estado mais fino que a etapa E07 precisa (`aplicada-sem-ledger` etc.), sem quebrar o formato que `check-no-db-push.mjs` já consome.
**Checklist de conclusão:**
- [ ] Divergência 5 vs. 1.247 explicada por escrito (ver caixa)
- [ ] Manifesto regerado e versionado, reproduzível
- [ ] `check-no-db-push.mjs` continua passando com o manifesto novo
- [ ] Teste unitário do parser de versão (14 dígitos, 3 dígitos, 20 dígitos, sem prefixo)
**Esforço:** M · **Dep.:** —

> **⚠️ Pre-mortem (2026-09-16) — achado que bloqueia esta etapa até ser explicado:** o manifesto de 2026-08-28 (rodado pela mesma ferramenta que eu ia "estender") registra **1.247** versões do ledger sem arquivo local (`ledger_without_local_version`) e **531** arquivos locais sem ledger — ordens de grandeza diferentes das **5** e **484** que encontrei hoje comparando por prefixo de versão via `comm`. Hipótese mais provável: o `build-migration-ledger-manifest.mjs` só popula `declared_version` para arquivos que batem o contrato estrito `^\d{14}_`, então os 34+ arquivos "fora do contrato" (e variações de nome) ficam de fora do índice local e inflam artificialmente a contagem de "só no ledger". Não assumi isso como verdade — é hipótese a confirmar lendo `MANIFESTO_MIGRATIONS_FORWARD_ONLY` antes de regerar qualquer coisa. Também explica parte do gap: só entre 08-28 e hoje, `local_files` foi de 1.673 para 2.985 (quase dobrou) — muita coisa mudou em 3 semanas, os dois retratos não são diretamente comparáveis sem essa reconciliação.

### E07 · Classificar as 484 migrations sem ledger por verificação de objeto `[DB-RO]`
**Problema (medido):** 484 arquivos locais sem linha no ledger. Amostra 5/5 aplicada. Hipótese forte: maioria é `aplicada-sem-ledger`. Hipótese ≠ prova.
**Ação:**
1. Para cada arquivo, extrair o(s) objeto(s)-alvo via **regex leve** (`^\s*(CREATE|ALTER|DROP)\s+(OR REPLACE\s+)?(FUNCTION|TABLE|INDEX|VIEW|POLICY|TRIGGER)\s+(IF (NOT )?EXISTS\s+)?([\w."]+)`, mais casos para `GRANT|REVOKE ... ON ...`, `COMMENT ON ... IS`) — **sem** adicionar parser AST novo ao projeto.
2. Agrupar por tipo de objeto e gerar **uma query em lote por tipo** (ex.: todas as funções esperadas em um único `SELECT proname, ... FROM pg_proc WHERE proname = ANY($1)`), não uma chamada por arquivo — o objetivo é dezenas de queries, não 484.
3. Marcar `aplicada-sem-ledger` quando o objeto existe com a assinatura esperada; `indeterminada` quando a regex não capturou objeto (DML puro, blocos `DO $$`, migrations multi-statement) ou quando o objeto não existe.
4. Revisar manualmente só os `indeterminada`.
**Checklist de conclusão:**
- [ ] 484/484 com estado ≠ `indeterminada` **ou** com justificativa individual
- [ ] Relatório: quantas `aplicada-sem-ledger`, quantas `pendente`, quantas `no-op`
- [ ] Nenhuma `pendente` com DDL destrutivo sem ticket aberto
**Esforço:** M (rebaixado de G) · **Dep.:** E06

> **Pre-mortem:** cogitei usar `libpg_query`/`pgsql-parser` para extrair objetos com precisão de AST — mas **nenhuma lib de parsing SQL existe no `package.json`** hoje, e adicionar uma dependência nova só para esta etapa é desproporcional (G de esforço, manutenção permanente). Testei o atalho "grep por 'Aplicada em produ' no cabeçalho" como triagem barata: só bate em **8 dos 484** arquivos — não é atalho suficiente sozinho, mas informa que a maioria não se autodocumenta e precisa mesmo da verificação por objeto. Regex leve + queries em lote por tipo de objeto é o meio-termo: mais barato que AST, mais confiável que grep de texto livre.

### E08 · Reparar o ledger para as `aplicada-sem-ledger` `[REQUER-PO]`
**Problema:** cada migration aplicada sem registro faz `migration list` mentir e torna `migration up` perigoso.
**Ação:** para o conjunto validado em E07, executar `supabase migration repair --status applied <versão>` em lotes de 50, **um lote por sessão**, com o manifesto assinado antes e depois. `repair` insere só a versão — **não executa SQL**. Preencher `name` e, quando o arquivo for canônico, `statements` (para fechar o gap de 483 sem statements daqui para frente).
**Checklist de conclusão:**
- [ ] PO aprovou a lista exata (versões) antes de cada lote
- [ ] Após cada lote: `migration list --linked` sem "local only" para as versões do lote
- [ ] Ledger exportado (E03) antes e depois, com diff = exatamente as versões inseridas
- [ ] Zero DDL executada (verificar `postgres_logs` do intervalo)
**Esforço:** M · **Dep.:** E07 · **Risco:** baixo se e somente se E07 estiver completo

### E09 · Resolver os 4 IDs inválidos do ledger, um a um `[REQUER-PO]`
**Problema (medido):** `2026062311292414001` (20 dígitos — timestamp corrompido); `20260623_bugalert1`, `20260623_create_process_notifications_queue_rpcs`, `20260623_fix_google_provider_secret_name` (ledger gravou `<data>_<nome>`; arquivos locais foram **renomeados** para `<nome>_<data>` depois de aplicados). `supabase migration list` nunca vai casá-los.
**Ação:** por ID: (a) confirmar objetos físicos criados; (b) decidir `repair --status reverted <id-inválido>` + `repair --status applied <versão-canônica-nova>` **ou** manter e documentar como exceção permanente no manifesto; (c) criar arquivo marker local com cabeçalho explicando o histórico. **Nunca** renomear o arquivo de volta (viola invariante 3).
**Checklist de conclusão:**
- [ ] 4/4 com decisão escrita, aprovada pelo PO, e aplicada ou documentada como exceção
- [ ] `MANIFEST.json` sem estado `registrada-sem-arquivo`
- [ ] `docs/SCHEMA_REFERENCE.md` §"IDs históricos" atualizado
**Esforço:** P · **Dep.:** E03, E08 · **Supersede:** plano 09-15 E34

### E10 · Congelar os 67 arquivos fora do contrato e os 31 prefixos duplicados `[GIT]`
**Problema (medido):** 67 arquivos não seguem `^\d{14}_slug\.sql` (34 sem prefixo numérico); 31 timestamps compartilhados por 2+ arquivos (ex.: `20260610120000_restore_generated_mockups_geometry_columns.sql` e `20260610120000_silver_depara_01_apply_transform_color_resolver.sql`). O CLI ordena por versão — dois arquivos com a mesma versão têm ordem de aplicação **indefinida**.
**Ação:** `scripts/check-migration-filename-contract.mjs` existe; verificar se tem baseline. Criar `supabase/migrations-ledger/filename-exceptions.json` listando os 67 + 62 com `reason` e `frozen_sha256`; o gate falha se (a) surgir arquivo novo fora do contrato, (b) um arquivo da exceção mudar de hash, (c) surgir novo timestamp duplicado. **Não renomear nenhum** (invariante 3).
**Checklist de conclusão:**
- [ ] Exceções listadas com hash e motivo
- [ ] Gate falha em teste com arquivo novo `foo_20261001.sql` e com timestamp repetido
- [ ] Gate passa no estado atual
**Esforço:** P · **Dep.:** E06 · **Supersede:** plano 09-15 E17

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
- [ ] Workflow roda e produz relatório mesmo com zero diferenças
- [ ] Simulação: `COMMENT ON` fora do fluxo em objeto de teste → issue aberta
- [ ] Política publicada e referenciada em `CLAUDE.md`
**Esforço:** M · **Dep.:** E02, E06

### E13 · Decidir os 10 drafts ativos e os 5 arquivados `[RO]`
**Problema (medido):** `qa/migrations-draft` tem 10 ativos e 5 arquivados (o plano 09-15 dizia 4). `scripts/map-drafts-to-migrations.mjs` existe.
**Ação:** rodar o mapeamento por **objeto** (não por slug); para cada draft: `absorvido por <versão>` / `pendente` / `rejeitado` / `obsoleto`. Registrar em `qa/migrations-draft/DRAFTS_STATUS.md` com owner e data. Não mover nem apagar nesta etapa.
**Checklist de conclusão:**
- [ ] 15/15 com estado, owner e próxima decisão
- [ ] Nenhum draft "pendente" sem etapa deste plano que o consuma
**Esforço:** P · **Dep.:** E07

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

### E20 · Inventário das 82 FKs para `auth.users` `[DB-RO]`
**Problema (medido):** 82 FKs (eram 69). Cada `DELETE` em `auth.users` percorre 82 constraints; FK sem índice = seq scan por tabela.
**Ação:** listar `(tabela, coluna, ON DELETE, índice?)`. Garantir índice em todas; classificar `ON DELETE` (CASCADE vs SET NULL vs RESTRICT) contra a intenção LGPD (exclusão de conta). Registrar no `SCHEMA_REFERENCE.md` §5.
**Checklist de conclusão:**
- [ ] 82/82 inventariadas
- [ ] 0 FK para `auth.users` sem índice (criar via E29 se faltar)
- [ ] Comportamento de exclusão de conta documentado
**Esforço:** P · **Dep.:** —

### E21 · Validar a constraint `NOT VALID` `[REQUER-PO]`
**Problema (medido):** 1 constraint (`FK` ou `CHECK`) não validada — dados pré-existentes podem violá-la.
**Ação:** identificar (`pg_constraint WHERE NOT convalidated`); rodar a query de violação read-only; se 0 violações → `ALTER TABLE ... VALIDATE CONSTRAINT` (lock leve) via E15; se > 0 → decidir limpeza de dados antes.
**Checklist de conclusão:**
- [ ] Constraint identificada e contagem de violações registrada
- [ ] `convalidated = true` ou plano de limpeza aprovado
**Esforço:** P · **Dep.:** E15

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

### E24 · Higiene de credenciais no repositório e no banco `[RO]`
**Problema:** o `SCHEMA_REFERENCE.md` §7 registra `"apikey":"<ANON_KEY>"` literal em 2 cron jobs de um prompt não executado; é preciso provar que nenhum job vivo tem chave em texto plano.
**Ação:** `SELECT jobname FROM cron.job WHERE command ~* 'apikey|bearer|eyJ'` (read-only); `git log -p -S 'eyJ' -- supabase/migrations` para JWT em migrations; confirmar `.env.local` ignorado e ausência de `service_role` em `src/`. Chaves encontradas → rotação (PO).
**Checklist de conclusão:**
- [ ] 0 cron jobs com segredo literal (ou rotacionados)
- [ ] 0 JWT em migrations/histórico acessível (ou rotacionados)
- [ ] `git check-ignore .env.local` confirma
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

### E31 · Inventário e agenda de refresh das 12 materialized views `[DB-RO]`
**Problema (medido):** 12 MVs em 3 schemas; o doc de referência lista 5. `mv_product_images_audit` 84 MB. Sem inventário, um `REFRESH` esquecido serve dado velho e um `REFRESH` sem `CONCURRENTLY` bloqueia leitores.
**Ação:** por MV: definição, dependências (`pg_depend`), índice único (pré-requisito de `CONCURRENTLY`), job de refresh (nome, cron, single-statement?), consumidores. Registrar em `SCHEMA_REFERENCE.md` §6.
**Checklist de conclusão:**
- [ ] 12/12 com job identificado ou marcada "sem refresh — investigar"
- [ ] MVs sem índice único listadas para E37
- [ ] Doc atualizado
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
**Checklist de conclusão:**
- [ ] 3 métricas coletadas diariamente
- [ ] Teste de alerta com limiar artificial
**Esforço:** P · **Dep.:** E30

---

## FASE 4 — Desempenho e cron (E34–E40)
> Objetivo: os 114 h de `fn_cron_safe_run` e as RPCs de 12 s deixam de ser invisíveis.

### E34 · Identificar as 3 RPCs PostgREST de 6,8–12,3 s `[DB-RO]`
**Problema (medido):** 3 entradas `WITH pgrst_source ... pgrst_call.pgrst_scalar` com média 12.010 / 6.847 / 12.305 ms e 3.402 / 3.805 / 1.530 chamadas. São chamadas de aplicação — usuário espera 12 s.
**Ação:** `SELECT queryid, query FROM pg_stat_statements WHERE query LIKE 'WITH pgrst_source%' ORDER BY total_exec_time DESC` → extrair o nome da função do `LATERAL`; `EXPLAIN (ANALYZE, BUFFERS)` com parâmetros reais de `postgres_logs`; classificar (falta índice, N+1 em plpgsql, `SECURITY DEFINER` sem `STABLE`, seq scan em `products`).
**Checklist de conclusão:**
- [ ] 3/3 nomeadas, com plano de execução anexado
- [ ] Causa raiz por RPC
- [ ] Proposta de correção com ganho estimado (vai para E15)
**Esforço:** M · **Dep.:** E02

### E35 · `fn_reposicao_backfill_today`: 15 s por chamada `[REQUER-PO]`
**Problema (medido):** 2.076 chamadas × 14.985 ms = 31.108 s (8,6 h). Se é cron, roda demais ou faz demais.
**Ação:** ler a função; identificar o job que a chama e a frequência; `EXPLAIN` das queries internas; reduzir janela de trabalho (incremental por `updated_at`) ou frequência. Meta: < 2 s ou < 6 chamadas/dia.
**Checklist de conclusão:**
- [ ] Causa identificada
- [ ] Correção aplicada via E15
- [ ] `pg_stat_statements` 7 dias depois: total_exec_time < 10 % do anterior
**Esforço:** M · **Dep.:** E34

### E36 · Distribuição de custo de `fn_cron_safe_run` por job `[DB-RO]`
**Problema (medido):** 355.638 chamadas, média 1.157 ms, total 411.672 s. É wrapper de ~48 crons — a média esconde 2–3 jobs pesados.
**Ação:** `cron.job_run_details` (30 dias): `jobname, count, avg(end_time-start_time), max` → top 10; correlacionar com `pg_stat_statements` das queries internas. Produzir ranking de custo.
**Checklist de conclusão:**
- [ ] Ranking dos 10 jobs mais caros com duração p50/p95
- [ ] Os 3 primeiros têm etapa de otimização aberta (E35 ou nova)
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

### E39 · Investigar 262 deadlocks e 22,5 % de rollback `[DB-RO]`
**Problema (medido):** `pg_stat_database.deadlocks = 262`; `xact_rollback / total = 22,53 %`. Rollback alto pode ser PostgREST devolvendo erro (4xx) ou testes E2E; deadlocks indicam ordem de lock inconsistente (provável em `products` ↔ satélites via trigger).
**Ação:** `postgres_logs` 24 h: `deadlock detected` → pares de tabelas; `ERROR:` mais frequentes → origem (pgrst / edge / cron). Registrar. Se deadlock em `products`/`product_*`: ordenar escrita nos triggers `trg_sync_product_*`.
**Checklist de conclusão:**
- [ ] Top 5 pares de deadlock e top 5 erros com origem
- [ ] Plano de correção para o par #1 (vai para E15)
- [ ] Baseline registrada para comparação pós-correção
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

### E42 · Edge Functions: verificar hash do bundle, não só o nome `[GIT]`
**Problema (medido):** 108 × 109 — paridade por nome. A API expõe `ezbr_sha256` por função; `edge-functions-drift-check.yml` existe. Nome igual com código diferente é drift invisível.
**Ação:** o workflow calcula o bundle local (`supabase functions build` ou hash canônico dos fontes) e compara com `ezbr_sha256`; lista `verify_jwt` por função e falha se uma função pública (`verify_jwt = false`) não está em allowlist com motivo (hoje: 30+ com `false`).
**Checklist de conclusão:**
- [ ] 108/108 com hash comparado
- [ ] Allowlist de `verify_jwt = false` com motivo por função
- [ ] `tests/` excluído explicitamente
**Esforço:** M · **Dep.:** E02

### E43 · Objetos órfãos e referências a objetos inexistentes `[RO]`
**Problema (medido):** 193 views e 1.320 funções vs consumidores em `src/` (2.568 arquivos) e `supabase/functions`. Nada mede o que sobrou.
**Ação:** extrair chamadas `.rpc('x')`, `.from('x')`, `supabase.functions.invoke('x')` do código; cruzar com `pg_proc`/`pg_class`/lista de funções. Duas listas: (a) código chama objeto inexistente (bug latente); (b) objeto sem consumidor em código, `pg_depend`, cron ou edge (candidato a remoção **futura**, não automática).
**Checklist de conclusão:**
- [ ] Lista (a) = 0 ou com issue por item
- [ ] Lista (b) publicada com contagem; nenhum drop nesta etapa
**Esforço:** M · **Dep.:** E01

### E44 · Contrato de enums entre banco e TypeScript `[GIT]`
**Problema:** 15 enums (`app_role`, `magazine_status`, `payment_status`…). Um valor novo no banco sem o tipo TS produz `switch` sem `default` silencioso.
**Ação:** teste que compara `pg_enum` (live) com `Database.public.Enums` e com unions manuais em `src/types/`; falha em qualquer diferença de valor ou ordem.
**Checklist de conclusão:**
- [ ] 15/15 enums cobertos
- [ ] Teste no CI (fail-closed sem credencial)
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
