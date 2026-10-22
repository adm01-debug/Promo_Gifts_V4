# Relatório de Drift de Migrations — 2026-10-22

> **DRIFT-003** — Auditoria de reconciliação entre `supabase/migrations/` e ledger de produção
> Gerado por sessão Claude: https://claude.ai/code/session_01GfYDwdVBZip5FzMr8MZ4Be

## Resumo

| Item | Valor |
|---|---|
| Arquivos `.sql` no repo (`supabase/migrations/`) | **2975** |
| Entradas no ledger (`supabase_migrations.schema_migrations`) | **2528** |
| **Drift (migrations sem ledger)** | **448** |
| Data da auditoria | 2026-10-22 |
| Projeto canônico | `doufsxqlfjyuvxuezpln` |

O drift é **histórico** — causado por DDL aplicada via MCP/execute_sql/apply_migration
diretamente em produção antes desta auditoria, sem registro no ledger. Nenhuma
das 448 migrations foi criada nesta sessão.

---

## Distribuição por tipo

| Tipo | Quantidade | Descrição |
|---|---|---|
| OTHER (DO $precondition$ / idempotentes) | 144 | Blocks idempotentes com preconditions, cron inline, etc. |
| POLICY (CREATE/ALTER/DROP POLICY, REVOKE, GRANT) | 88 | Policies RLS, revogações de permissão |
| FUNCTION (CREATE OR REPLACE FUNCTION) | 73 | Funções PL/pgSQL |
| DDL_TABLE (CREATE/ALTER/DROP TABLE) | 71 | Schema de tabelas |
| DML (INSERT/UPDATE/SELECT set_config) | 36 | Backfills e configurações |
| DDL_INDEX (CREATE/DROP INDEX) | 26 | Índices de performance |
| CRON (cron.schedule/alter_job) | 10 | Jobs agendados |
| **Total** | **448** | |

---

## Top 20 migrations sem ledger (mais recentes)

| Versão | Arquivo | Tipo | Descrição |
|---|---|---|---|
| `20260916193000` | `20260916193000_e25_supplier_history_partition_automation.sql` | OTHER | e25 supplier history partition automation |
| `20260916200000` | `20260916200000_e17_revoke_public_fn_super_filtro.sql` | OTHER | e17 revoke public fn super filtro |
| `20260916201000` | `20260916201000_e19_comment_rls_deny_intentional.sql` | OTHER | e19 comment rls deny intentional |
| `20260916202000` | `20260916202000_e23_force_rls_secret_tables.sql` | OTHER | e23 force rls secret tables |
| `20260916210000` | `20260916210000_backfill_catalog_stats_price_range_top_colors_materials_20260916155725.sql` | FUNCTION | backfill catalog stats — price range, colors, materials |
| `20260916211500` | `20260916211500_e30_ops_table_size_history.sql` | OTHER | e30 ops table size history |
| `20260917060000` | `20260917060000_e18_revoke_authenticated_mcp_kv_get.sql` | OTHER | e18 revoke authenticated mcp kv get |
| `20260917061500` | `20260917061500_e18_revoke_authenticated_authz_gaps.sql` | OTHER | e18 revoke authenticated authz gaps |
| `20260917070000` | `20260917070000_e38_unschedule_dead_cron_jobs.sql` | OTHER | e38 unschedule dead cron jobs |
| `20260917080000` | `20260917080000_e35_fix_reposicao_backfill_perf.sql` | OTHER | e35 fix reposicao backfill perf |
| `20260917090000` | `20260917090000_e47_fix_schema_drift_cron_split.sql` | OTHER | e47 fix schema drift cron split |
| `20260917100000` | `20260917100000_e37_split_genuine_multistatement_cron.sql` | OTHER | e37 split genuine multistatement cron |
| `20260917110000` | `20260917110000_e45_fix_products_comment.sql` | OTHER | e45 fix products comment (comment on table) |
| `20260917150000` | `20260917150000_e40_ops_pgss_history.sql` | OTHER | e40 ops pg_stat_statements history |
| `20260917160000` | `20260917160000_e33_ops_wraparound_monitor.sql` | OTHER | e33 ops wraparound monitor |
| `20260920120000` | `20260920120000_fix_handle_new_user_missing_profiles_user_id.sql` | OTHER | fix handle new user — profiles user_id |
| `20260928212000` | `20260928212000_fix_products_padronizacao_backlink.sql` | DML | fix products padronizacao backlink (DML backfill) |
| `20260928213000` | `20260928213000_backfill_products_main_category_id.sql` | DML | backfill products main_category_id |
| `20261008230000` | `20261008230000_restringir_anon_mockup_approval_links.sql` | POLICY | restringir anon mockup approval links |
| `20261013180500` | `20261013180500_incidente_2026_10_13_drop_tabelas_backup_vencidas.sql` | DDL_TABLE | incidente 2026-10-13 drop tabelas backup vencidas |

---

## 5 Migrations mais críticas sem ledger

Migrations identificadas como críticas por tocarem tabelas com dados de produção
essenciais (`products`, `supplier_products_raw`, `personalization_techniques`,
`supplier_products_raw_history`):

### 1. `20260525232003_fix_339_personalization_missing_columns.sql`
- **Tipo:** DDL_TABLE (ALTER TABLE)
- **Tabelas:** `personalization_techniques` (e sub-tabelas de personalização)
- **Impacto:** Adiciona 6 colunas ausentes (`area_image_url`, `is_default`, `max_area_cm2`,
  `is_personalizable`, etc.) que o front-end referencia — sem elas, writes falhavam com PGRST204
- **Marcador:** `supabase/migrations/20260525232003_repair_only_marker.sql`

### 2. `20260622111500_supplier_reliability_pipeline_v1.sql`
- **Tipo:** DDL_TABLE + FUNCTION + CRON
- **Tabelas:** `supplier_replenishment_events`, MV `mv_supplier_reliability`
- **Impacto:** Pipeline completo de confiabilidade de fornecedores (triggers, índices, cron)
- **Marcador:** `supabase/migrations/20260622111500_repair_only_marker.sql`

### 3. `20260622130000_fix_color_swatches_column_and_view_plus_favorites_grant.sql`
- **Tipo:** DDL_TABLE (ALTER TABLE public.products)
- **Tabelas:** `products`, view `v_products_public`
- **Impacto:** Adiciona coluna `color_swatches jsonb` na tabela `products`; sem ela, PostgREST
  retornava HTTP 400 em 100% das queries de produto
- **Marcador:** `supabase/migrations/20260622130000_repair_only_marker.sql`

### 4. `20260623000008_products_name_m8_max_length.sql`
- **Tipo:** DDL_TABLE (ALTER TABLE + CHECK constraint)
- **Tabelas:** `products`
- **Impacto:** Adiciona constraint `chk_products_name_max_length` (length <= 250) — NOT VALID + VALIDATE
- **Marcador:** `supabase/migrations/20260623000008_repair_only_marker.sql`

### 5. `20260902220800_rls_enable_spr_history_partitions_and_fix_creator.sql`
- **Tipo:** DDL_TABLE (ALTER TABLE … ENABLE ROW LEVEL SECURITY) + FUNCTION
- **Tabelas:** `supplier_products_raw_history_p2026_11`, `supplier_products_raw_history_p2026_12`,
  função `fn_purge_spr_history`
- **Impacto:** Habilita RLS nas partições p2026_11 e p2026_12; recria fn_purge_spr_history
  para criar partições futuras com RLS habilitada
- **Marcador:** `supabase/migrations/20260902220800_repair_only_marker.sql`

---

## Faixa temporal do drift

| Período | Migrations sem ledger |
|---|---|
| 2026-05 (início) | ~5 migrations (desde 20260511) |
| 2026-06 | ~120 migrations |
| 2026-07 | ~140 migrations |
| 2026-08 | ~30 migrations |
| 2026-09 | ~120 migrations (maior concentração) |
| 2026-10 | ~30 migrations (até 20261013) |

---

## Plano de Reconciliação

Para reconciliar, o caminho autorizado (CLAUDE.md REGRA #8 E99) é:

1. **Para cada migration sem ledger**, confirmar se foi de fato aplicada em produção
   via `pg_catalog` (verificar existência do objeto criado/alterado)
2. **Executar via workflow:** `.github/workflows/db-apply-migration.yml`
   com `mode=repair-only` e versão explícita — nunca em lote sem versão
3. **Registrar** em `supabase/MIGRATIONS_SYNC_LOG.md` com PR, data e aprovação do PO
4. **Após reconciliação completa** rodar `schema-snapshot-export.yml`
   com `force_rotate: true` para girar o baseline

### Prioridade de reconciliação

**1. ALTA — DDL em tabelas críticas de produção (71 migrations)**
- Tabelas: `products`, `supplier_products_raw`, `magazines`, `personalization_techniques`,
  `product_variants`, `suppliers`
- Risco: replay de schema falha sem elas; constraint/coluna ausente causa 400/500 em produção

**2. ALTA — Policies RLS e security (88 migrations)**
- Sem o ledger, o drift-check de políticas falha silenciosamente
- Priorizar as que tocam tabelas com dados sensíveis (PII, financeiro)

**3. MÉDIA — Índices de performance (26 migrations)**
- Afetam performance mas não corretude
- Sem risco de quebra funcional

**4. MÉDIA — Functions (73 migrations)**
- Verificar se ainda estão no banco (algumas podem ter sido substituídas)
- Reconciliar as que são chamadas por cron jobs ativos

**5. BAIXA — DML/backfills (36 migrations)**
- Dados já foram aplicados; registrar no ledger para histórico
- Verificar que nenhuma migration DML sobrescreveria dados atuais se re-executada

**6. BAIXA — CRON (10 migrations)**
- Verificar `cron.job` ao vivo antes de registrar
- Alguns jobs podem ter sido dropados/renomeados após a migration

### Comando de reconciliação (exemplo para uma migration)

```bash
# Via workflow_dispatch — ÚNICO caminho autorizado (CLAUDE.md REGRA #8 E15)
gh workflow run db-apply-migration.yml \
  -f version=20260622130000 \
  -f mode=repair-only \
  -f approved_by=PO_EMAIL
```

### Atenção: NÃO usar repair em lote

`supabase migration repair --status applied` **sem versão explícita** trunca
`schema_migrations` — isso apagaria o ledger de 2528 entradas existentes.
Sempre passar a versão: `supabase migration repair --status applied 20260622130000`

---

## Referências

- CLAUDE.md REGRA #8 — DDL fora do fluxo de migration
- CLAUDE.md REGRA #8 Corolário E99 — caminho de reconciliação `repair-only`
- CLAUDE.md REGRA #8 Corolário E056 — proibição de DDL via execute_sql
- `docs/db/POLITICA_DDL.md` — política de DDL
- `.github/workflows/db-apply-migration.yml` — único caminho de migration em prod
- `supabase/MIGRATIONS_SYNC_LOG.md` — histórico de sincronizações
- `docs/E12_DETECTOR_DDL_OUT_OF_BAND_2026-09-16.md` — detector semanal
