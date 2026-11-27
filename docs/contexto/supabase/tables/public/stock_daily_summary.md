# public.stock_daily_summary

> Camada 2: Resumo diário de movimentação de estoque e preço por variante/fornecedor. Retenção permanente. Gerado automaticamente por job noturno via pg_cron.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | analytics.mv_stock_velocity, public.v_system_health_dashboard |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não |  | a | Identificador sequencial do resumo diário. |
| 2 | `variant_supplier_source_id` | `uuid` | não |  |  | Registro de variante e fornecedor resumido. |
| 3 | `supplier_id` | `uuid` | não |  |  | Fornecedor associado ao resumo diário. |
| 4 | `supplier_branch_id` | `uuid` | sim |  |  | Filial do fornecedor associada ao resumo, quando informada. |
| 5 | `variant_id` | `uuid` | não |  |  | Variante associada ao resumo diário. |
| 6 | `product_id` | `uuid` | não |  |  | Produto associado à variante resumida. |
| 7 | `summary_date` | `date` | não |  |  | Data a que se refere o resumo. |
| 8 | `stock_open` | `integer` | sim |  |  | Estoque no início do dia. |
| 9 | `stock_close` | `integer` | sim |  |  | Estoque no fim do dia. |
| 10 | `stock_min` | `integer` | sim |  |  | Estoque mínimo observado durante o dia. |
| 11 | `stock_max` | `integer` | sim |  |  | Estoque máximo observado durante o dia. |
| 12 | `net_change` | `integer` | sim |  |  | Variação líquida do estoque durante o dia. |
| 13 | `units_depleted` | `integer` | sim | `0` |  | Unidades removidas do estoque durante o dia. |
| 14 | `units_restocked` | `integer` | sim | `0` |  | Unidades adicionadas ao estoque durante o dia. |
| 15 | `restock_detected` | `boolean` | sim | `false` |  | Indica se foi detectado aumento de estoque durante o dia. |
| 16 | `restock_quantity` | `integer` | sim | `0` |  | Quantidade total associada às reposições detectadas durante o dia. |
| 17 | `restock_count` | `smallint` | sim | `0` |  | Número de reposições detectadas durante o dia. |
| 18 | `cost_price_open` | `numeric(12,4)` | sim |  |  | Custo unitário no início do dia, em reais (BRL). Pode incluir centavos. |
| 19 | `cost_price_close` | `numeric(12,4)` | sim |  |  | Custo unitário no fim do dia, em reais (BRL). Pode incluir centavos. |
| 20 | `price_changed` | `boolean` | sim | `false` |  | Indica se o custo unitário mudou durante o dia. |
| 21 | `sync_count` | `smallint` | sim | `0` |  | Quantidade de sincronizações consideradas no resumo diário. |
| 22 | `created_at` | `timestamp with time zone` | não | `now()` |  | Data e hora de criação do resumo diário. |
| 23 | `restock_zero_to_positive` | `boolean` | não | `false` |  | TRUE se em qualquer snapshot do dia o stock_total_old=0 E stock_total_new>0 (transição real de zero-para-positivo). Diferente de restock_detected que marca qualquer delta positivo — este campo é semanticamente correto para o módulo Reposição. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stock_daily_summary_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| stock_daily_summary_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| stock_daily_summary_supplier_branch_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_branch_id) REFERENCES supplier_branches(id)` | NO ACTION | NO ACTION | sim |
| stock_daily_summary_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| stock_daily_summary_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| stock_daily_summary_variant_supplier_source_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_supplier_source_id) REFERENCES variant_supplier_sources(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| uq_stock_daily_vss_date | UNIQUE | `UNIQUE (variant_supplier_source_id, summary_date)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_daily_product_date | btree | product_id, summary_date | não | sim |  | `CREATE INDEX idx_daily_product_date ON public.stock_daily_summary USING btree (product_id, summary_date DESC)` |
| idx_fk_stock_daily_summary_supplier_branch_id | btree | supplier_branch_id | não | sim |  | `CREATE INDEX idx_fk_stock_daily_summary_supplier_branch_id ON public.stock_daily_summary USING btree (supplier_branch_id)` |
| idx_fk_stock_daily_summary_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_fk_stock_daily_summary_supplier_id ON public.stock_daily_summary USING btree (supplier_id)` |
| idx_sds_cenario_a | btree | summary_date, stock_open, stock_close | não | sim | `(restock_detected = true)` | `CREATE INDEX idx_sds_cenario_a ON public.stock_daily_summary USING btree (summary_date, stock_open, stock_close) WHERE (restock_detected = true)` |
| idx_sds_restock_zero_to_pos_date | btree | summary_date, product_id | não | sim | `((restock_detected = true) AND (COALESCE(stock_open, 0) = 0) AND (COALESCE(stock_close, 0) > 0))` | `CREATE INDEX idx_sds_restock_zero_to_pos_date ON public.stock_daily_summary USING btree (summary_date) INCLUDE (product_id) WHERE ((restock_detected = true) AND (COALESCE(stock_open, 0) = 0) AND (COALESCE(stock_close, 0) > 0))` |
| idx_sds_summary_date_supplier | btree | summary_date, supplier_id, stock_close, units_depleted, units_restocked | não | sim |  | `CREATE INDEX idx_sds_summary_date_supplier ON public.stock_daily_summary USING btree (summary_date, supplier_id) INCLUDE (stock_close, units_depleted, units_restocked)` |
| idx_sds_variant_id | btree | variant_id | não | sim |  | `CREATE INDEX idx_sds_variant_id ON public.stock_daily_summary USING btree (variant_id)` |
| idx_sds_zero_to_positive | btree | summary_date, product_id, supplier_id | não | sim | `(restock_zero_to_positive = true)` | `CREATE INDEX idx_sds_zero_to_positive ON public.stock_daily_summary USING btree (summary_date DESC, product_id, supplier_id) WHERE (restock_zero_to_positive = true)` |
| stock_daily_summary_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stock_daily_summary_pkey ON public.stock_daily_summary USING btree (id)` |
| uq_stock_daily_vss_date | btree | variant_supplier_source_id, summary_date | sim | sim |  | `CREATE UNIQUE INDEX uq_stock_daily_vss_date ON public.stock_daily_summary USING btree (variant_supplier_source_id, summary_date)` |


## Policies (RLS)

### `auth_read_stock_daily_summary`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
