# P18 — Otimização de Performance: RLS auth.uid() wrapper + drop de índices mortos

**Data:** 2026-10-22
**Autor:** Claude Sonnet 4.6 (sessão https://claude.ai/code/session_01GfYDwdVBZip5FzMr8MZ4Be)
**Status:** Pronto para aplicação via workflow
**Referência:** ADV-PERF-001 (RLS InitPlan) + PERF-002 (índices não utilizados)

---

## 1. Contexto

Auditoria de performance identificou dois vetores de melhoria no banco de produção `doufsxqlfjyuvxuezpln`:

1. **ADV-PERF-001** — 447 políticas RLS usam `auth.uid()` em formas que não aproveitam o cache de InitPlan do PostgreSQL, causando reavaliação por linha em vez de uma vez por query.
2. **PERF-002** — 1.008 índices com `idx_scan = 0` (nunca utilizados desde o último `pg_stat_reset`), ocupando espaço significativo em disco.

---

## 2. Migration 1: RLS auth.uid() wrapper

**Arquivo:** `supabase/migrations/20261022100010_perf_rls_auth_uid_wrapper.sql`

### Problema

Políticas RLS com `auth.uid()` bare (ou em formas não-canônicas como `( SELECT ( SELECT auth.uid() AS uid) AS uid)`) causam:
- Reavaliação da função `auth.uid()` para **cada linha** inspecionada pela policy
- Para tabelas com milhares de linhas e RLS habilitado, isso multiplica o custo

### Solução

Substituir todas as ocorrências pela forma canônica `(SELECT auth.uid())`:
- PostgreSQL eleva o subquery `(SELECT auth.uid())` a um **InitPlan** — avaliado **uma vez por query**
- O valor é cacheado e reutilizado para todas as comparações de linha

### Escopo deste batch

| Métrica | Valor |
|---|---|
| Total de policies afetadas no banco | 447 |
| Policies neste batch (máx. 50) | 50 |
| Tabelas afetadas | 24 |
| Batches adicionais necessários | ~8 (a cada 50 policies) |

### Tabelas cobertas neste batch

`_archive_product_ai_20260626`, `_archive_product_seo_20260626`, `_archive_supplier_price_tiers_20260626`, `_bkp_kcvs_pre_normalize_20260624`, `_bkp_kit_color_from_name_20260624`, `_bkp_kit_packing_type_20260624`, `_bkp_kit_pkg_material_20260624`, `_qa_pct_results`, `access_blocked_log`, `access_security_settings`, `admin_audit_log`, `admin_settings`, `ai_enrichment_queue`, `ai_routing_decisions`, `ai_usage_events`, `ai_usage_logs`, `ai_usage_quotas`, `analytics_events`, `anon_catalog_grant_audit_log`, `art_file_attachments`, `attribute_definitions`, `attribute_groups`, `audit_log`, `audit_log_gravacao`, `auto_tag_rules`, `backup_produto_ramo_atividade_20260625`, `bot_detection_log`

### Impacto estimado

- **10–40% de redução** no tempo de queries em tabelas com RLS e muitas linhas
- Impacto maior em tabelas como `ai_usage_events`, `analytics_events`, `audit_log` (alta frequência de leitura)
- Zero impacto funcional: `ALTER POLICY` não altera a semântica, apenas a forma de avaliação

### Rollback

```sql
-- Não há rollback automático; para reverter uma policy específica:
-- ALTER POLICY "nome_policy" ON "nome_tabela" USING (<expressão original>);
-- As expressões originais estão em pg_policies e no histórico do git.
```

---

## 3. Migration 2: Drop de índices não utilizados

**Arquivo:** `supabase/migrations/20261022100011_perf_drop_unused_indexes.sql`

### Problema

1.008 índices com `idx_scan = 0` foram identificados, ocupando espaço em disco e aumentando o custo de INSERT/UPDATE/DELETE (índices precisam ser atualizados mesmo quando não são usados para leitura).

### Escopo desta migration

| Categoria | Count | Espaço |
|---|---|---|
| Drops ativos (executados) | 13 | ~779 MB |
| Deferred — unique constraints (_key / uq_ prefix) | 4 | ~45 MB |
| Deferred — GIN / full-text (revisar manualmente) | 3 | ~27 MB |
| **Total coberto** | **20** | **~851 MB** |

### Índices dropados (ativos)

| Índice | Tabela | Tamanho |
|---|---|---|
| `idx_snapshots_vss_captured` | `stock_snapshots` | 304 MB |
| `idx_snapshots_product_captured` | `stock_snapshots` | 178 MB |
| `idx_snapshots_captured_at` | `stock_snapshots` | 48 MB |
| `idx_ss_variant_id` | `stock_snapshots` | 43 MB |
| `idx_ss_supplier_id` | `stock_snapshots` | 35 MB |
| `idx_stock_snapshots_supplier_branch_id` | `stock_snapshots` | 33 MB |
| `idx_stock_snapshots_captured_at_br_date` | `stock_snapshots` | 7.4 MB |
| `idx_stock_daily_summary_supplier_branch_id` | `stock_daily_summary` | 27 MB |
| `idx_stock_daily_summary_supplier_id` | `stock_daily_summary` | 27 MB |
| `idx_sds_variant_id` | `stock_daily_summary` | 25 MB |
| `idx_product_relationships_canonical_pair` | `product_relationships` | 18 MB |
| `idx_pi_content_hash` | `product_images` | 6.4 MB |
| `idx_product_images_product_type_active` | `product_images` | 6.1 MB |

### Índices deferred — requerem aprovação do PO

Estes têm sufixo `_key` ou prefixo `uq_`, que indicam **unique constraint** auto-gerada pelo PostgreSQL. Dropar remove a constraint de unicidade:

- `product_relationships_product_id_related_product_id_relatio_key` (17 MB)
- `uq_backfill_one_per_image_task` (11 MB)
- `produto_ramo_atividade_produto_id_ramo_atividade_filho_id_key` (9 MB)
- `supplier_customization_option_supplier_id_product_reference_key` (8 MB)

### Índices deferred — verificação manual (GIN/full-text)

GIN e trgm indexes podem não aparecer em `pg_stat_user_indexes` se as queries passaram pelo PostgREST ou se o stats counter foi resetado. Verificar com `EXPLAIN ANALYZE` antes de dropar:

- `idx_products_color_swatches_gin` (13 MB)
- `idx_products_search_vector` (7 MB)
- `idx_products_name_trgm` (7 MB)

### Abordagem escolhida: DROP sem CONCURRENTLY

Foi usado `DROP INDEX IF EXISTS` (sem CONCURRENTLY) dentro de `BEGIN/COMMIT` por compatibilidade com o runner `psql -1`. A lock duration é mínima (nenhuma reescrita de dados). Para tabelas em produção com tráfego intenso, pode-se executar drops individuais com `CONCURRENTLY` fora de transação durante horário de baixo uso.

### Rollback

```sql
-- Os índices precisam ser recriados manualmente se o rollback for necessário.
-- Verificar o histórico do schema (docs/SCHEMA_REFERENCE.md) para as definições originais.
-- Exemplo:
-- CREATE INDEX CONCURRENTLY idx_snapshots_vss_captured ON stock_snapshots (variant_id, supplier_id, captured_at);
```

---

## 4. Instruções de aplicação

1. Verificar que o branch está em PR aberto e os gates de CI estão verdes
2. Acessar `.github/workflows/db-apply-migration.yml` via `workflow_dispatch`
3. Aplicar **na ordem**: `20261022100010` antes de `20261022100011`
4. Aguardar confirmação do job `post-check` antes de considerar concluído
5. Registrar recibo em `supabase/MIGRATIONS_SYNC_LOG.md`

---

## 5. Próximos passos

- [ ] Aplicar batches adicionais de `ALTER POLICY` para as 397 policies restantes (ADV-PERF-001)
- [ ] Revisar e obter aprovação do PO para dropar as 4 unique constraints deferred
- [ ] Verificar via `EXPLAIN ANALYZE` os 3 índices GIN antes de dropar
- [ ] Após drops de stock_snapshots, monitorar queries de consulta de estoque por 48h
