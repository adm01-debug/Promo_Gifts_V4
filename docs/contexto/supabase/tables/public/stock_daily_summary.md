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
| 1 | `id` | `bigint` | não |  | a |  |
| 2 | `variant_supplier_source_id` | `uuid` | não |  |  |  |
| 3 | `supplier_id` | `uuid` | não |  |  |  |
| 4 | `supplier_branch_id` | `uuid` | sim |  |  |  |
| 5 | `variant_id` | `uuid` | não |  |  |  |
| 6 | `product_id` | `uuid` | não |  |  |  |
| 7 | `summary_date` | `date` | não |  |  |  |
| 8 | `stock_open` | `integer` | sim |  |  |  |
| 9 | `stock_close` | `integer` | sim |  |  |  |
| 10 | `stock_min` | `integer` | sim |  |  |  |
| 11 | `stock_max` | `integer` | sim |  |  |  |
| 12 | `net_change` | `integer` | sim |  |  |  |
| 13 | `units_depleted` | `integer` | sim | `0` |  |  |
| 14 | `units_restocked` | `integer` | sim | `0` |  |  |
| 15 | `restock_detected` | `boolean` | sim | `false` |  |  |
| 16 | `restock_quantity` | `integer` | sim | `0` |  |  |
| 17 | `restock_count` | `smallint` | sim | `0` |  |  |
| 18 | `cost_price_open` | `numeric(12,4)` | sim |  |  |  |
| 19 | `cost_price_close` | `numeric(12,4)` | sim |  |  |  |
| 20 | `price_changed` | `boolean` | sim | `false` |  |  |
| 21 | `sync_count` | `smallint` | sim | `0` |  |  |
| 22 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
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
| idx_sds_cenario_a | btree | summary_date, stock_open, stock_close | não | sim | `(restock_detected = true)` | `CREATE INDEX idx_sds_cenario_a ON public.stock_daily_summary USING btree (summary_date, stock_open, stock_close) WHERE (restock_detected = true)` |
| idx_sds_variant_id | btree | variant_id | não | sim |  | `CREATE INDEX idx_sds_variant_id ON public.stock_daily_summary USING btree (variant_id)` |
| idx_sds_zero_to_positive | btree | summary_date, product_id, supplier_id | não | sim | `(restock_zero_to_positive = true)` | `CREATE INDEX idx_sds_zero_to_positive ON public.stock_daily_summary USING btree (summary_date DESC, product_id, supplier_id) WHERE (restock_zero_to_positive = true)` |
| idx_stock_daily_summary_supplier_branch_id | btree | supplier_branch_id | não | sim |  | `CREATE INDEX idx_stock_daily_summary_supplier_branch_id ON public.stock_daily_summary USING btree (supplier_branch_id)` |
| idx_stock_daily_summary_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_stock_daily_summary_supplier_id ON public.stock_daily_summary USING btree (supplier_id)` |
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
