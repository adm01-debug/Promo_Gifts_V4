# Seção 4 — Integridade de Dados

**Data:** 2026-10-22  
**Projeto:** doufsxqlfjyuvxuezpln  
**Modo:** somente leitura

---

## 4.1 Constraints NOT VALID

**Status:** APROVADO

- **0 constraints NOT VALID** encontradas no schema `public`.

Evidência: Query `SELECT conname, contype, conrelid::regclass, convalidated FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND convalidated = false` → `[]`

Isso significa que todas as constraints (CHECK, FK, UNIQUE) foram validadas contra os dados existentes. Sem "escapes" históricos.

---

## 4.2 Foreign Keys sem Índice de Suporte

**Status:** 6 FKs sem índice**

Tabelas com FK sem índice no lado filho (causa full table scan na tabela filha quando o pai é deletado):

| Tabela | Coluna FK | Tabela pai | Coluna pai |
|---|---|---|---|
| `category_ancestors` | `descendant_id` | `categories` | `id` |
| `eco_material_config` | `material_id` | `material_types` | `id` |
| `feminine_color_config` | `color_group_id` | `color_groups` | `id` |
| `kit_quote_requests` | `quote_id` | `quotes` | `id` |
| `kit_save_requests` | `kit_id` | `custom_kits` | `id` |
| `product_packaging` | `product_id` | `products` | `id` |

---

### [ID-INT-001] 6 Foreign Keys sem índice de suporte
- **Severidade:** MÉDIO
- **Objeto:** Tabelas acima
- **Evidência:** Query em `information_schema.table_constraints` cruzada com `pg_index` retornou 6 linhas.
- **Impacto:** Em DELETE/UPDATE na tabela pai, o PostgreSQL faz full table scan na tabela filha para verificar violação de FK. Para tabelas grandes como `products` e `quotes`, isso causa degradação de performance.
- **Correção sugerida:** Criar índices nas colunas FK:
  ```sql
  CREATE INDEX CONCURRENTLY idx_category_ancestors_descendant_id ON category_ancestors(descendant_id);
  CREATE INDEX CONCURRENTLY idx_eco_material_config_material_id ON eco_material_config(material_id);
  CREATE INDEX CONCURRENTLY idx_feminine_color_config_color_group_id ON feminine_color_config(color_group_id);
  CREATE INDEX CONCURRENTLY idx_kit_quote_requests_quote_id ON kit_quote_requests(quote_id);
  CREATE INDEX CONCURRENTLY idx_kit_save_requests_kit_id ON kit_save_requests(kit_id);
  CREATE INDEX CONCURRENTLY idx_product_packaging_product_id ON product_packaging(product_id);
  ```
- **Esforço:** Trivial (6 migrações com CONCURRENTLY — sem lock)

---

## 4.3 Tabelas com n_live_tup = 0 mas com Scans Ativos

Encontradas durante análise de performance (Seção 5). Tabelas como `user_organizations`, `system_settings`, `integration_credentials`, `user_roles` têm `n_live_tup = 0` nas stats mas estão sendo varridas com alta frequência.

---

### [ID-INT-002] Estatísticas desatualizadas — tabelas com n_live_tup = 0 e scans altos
- **Severidade:** MÉDIO
- **Objeto:** `user_organizations`, `system_settings`, `integration_credentials`, `user_roles`, `categories`
- **Evidência:** `pg_stat_user_tables` mostra `n_live_tup = 0` em tabelas com milhões de seq scans. `user_organizations`: 8,263,269 seq scans, 143M tuplas lidas, 0 live rows.
- **Impacto:** Duas possibilidades: (a) stats obsoletas → ANALYZE não rodando; (b) tabelas foram esvaziadas recentemente mas queries ainda as varrendo (possível bug ou cache de resultado errado). Planner do PostgreSQL usa stats vazias e pode escolher planos sub-ótimos.
- **Correção sugerida:** Executar `ANALYZE user_organizations, system_settings, integration_credentials, user_roles, categories;` no Supabase Dashboard para atualizar stats. Verificar `pg_stat_user_tables.last_analyze` nessas tabelas.
- **Esforço:** Trivial (ANALYZE — operação de leitura)

---

## 4.4 Backup Table em Produção

---

### [ID-INT-003] `_backup_stock_daily_summary_20260618` presente no schema public
- **Severidade:** BAIXO
- **Objeto:** Tabela `_backup_stock_daily_summary_20260618` (42 MB)
- **Evidência:** Query de tamanho de tabelas retornou tabela com prefixo `_backup_` e data `20260618` (2026-06-18) no schema público. 42 MB ocupados.
- **Impacto:** Backup table em produção acumula espaço e pode confundir desenvolvedores/ferramentas que listam tabelas. Potencial vazamento de dados se RLS não estiver configurada.
- **Correção sugerida:** Verificar se a tabela ainda é necessária. Se não, criar migration de DROP (com aprovação do PO — REGRA #1). Se necessário como histórico, mover para schema separado `_backup` ou storage externo.
- **Esforço:** Trivial (1 migration de DROP ou ALTER SCHEMA)

---

## 4.5 Sumário da Seção 4

| Severidade | Qtd |
|---|---|
| CRÍTICO | 0 |
| ALTO | 0 |
| MÉDIO | 2 (INT-001, INT-002) |
| BAIXO | 1 (INT-003) |
| INFO | 0 |
