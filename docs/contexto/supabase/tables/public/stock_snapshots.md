# public.stock_snapshots

> Camada 1: Snapshots brutos de mudanças de estoque e preço dos fornecedores. Retenção: 14 dias. Capturado automaticamente via trigger em variant_supplier_sources.

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
| usada por views | public.v_system_health_dashboard |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não |  | a | Identificador sequencial do snapshot de estoque ou preço. |
| 2 | `variant_supplier_source_id` | `uuid` | não |  |  | Registro de variante e fornecedor associado ao snapshot. |
| 3 | `supplier_id` | `uuid` | não |  |  | Fornecedor associado ao snapshot. |
| 4 | `supplier_branch_id` | `uuid` | sim |  |  | Filial do fornecedor associada ao snapshot, quando informada. |
| 5 | `variant_id` | `uuid` | não |  |  | Variante associada ao snapshot. |
| 6 | `product_id` | `uuid` | não |  |  | Produto associado à variante do snapshot. |
| 7 | `stock_main_old` | `integer` | sim |  |  | Estoque no depósito principal antes da alteração registrada. |
| 8 | `stock_main_new` | `integer` | sim |  |  | Estoque no depósito principal após a alteração registrada. |
| 9 | `stock_main_delta` | `integer` | sim | `(stock_main_new - stock_main_old)` | s | Variação calculada do estoque principal: valor novo menos valor anterior. |
| 10 | `stock_other_old` | `integer` | sim |  |  | Estoque em outros depósitos antes da alteração registrada. |
| 11 | `stock_other_new` | `integer` | sim |  |  | Estoque em outros depósitos após a alteração registrada. |
| 12 | `stock_other_delta` | `integer` | sim | `(stock_other_new - stock_other_old)` | s | Variação calculada do estoque em outros depósitos: valor novo menos valor anterior. |
| 13 | `stock_total_old` | `integer` | sim | `(COALESCE(stock_main_old, 0) + COALESCE(stock_other_old, 0))` | s | Estoque total anterior, calculado pela soma dos estoques principal e de outros depósitos. |
| 14 | `stock_total_new` | `integer` | sim | `(COALESCE(stock_main_new, 0) + COALESCE(stock_other_new, 0))` | s | Estoque total novo, calculado pela soma dos estoques principal e de outros depósitos. |
| 15 | `cost_price_old` | `numeric(12,4)` | sim |  |  | Custo unitário anterior registrado para o fornecedor, em reais (BRL). Pode incluir centavos. |
| 16 | `cost_price_new` | `numeric(12,4)` | sim |  |  | Custo unitário novo registrado para o fornecedor, em reais (BRL). Pode incluir centavos. |
| 17 | `cost_price_delta` | `numeric(12,4)` | sim | `(cost_price_new - cost_price_old)` | s | Variação calculada do custo unitário: valor novo menos valor anterior, em reais (BRL). Pode incluir centavos. |
| 18 | `change_type` | `character varying(20)` | não | `'stock'::character varying` |  | Tipo de alteração que originou o snapshot. |
| 19 | `captured_at` | `timestamp with time zone` | não | `now()` |  | Data e hora em que a alteração foi registrada no snapshot. |
| 20 | `sync_source` | `character varying(50)` | sim | `'n8n'::character varying` |  | Origem da sincronização que produziu o snapshot. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stock_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| stock_snapshots_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| stock_snapshots_supplier_branch_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_branch_id) REFERENCES supplier_branches(id)` | NO ACTION | NO ACTION | sim |
| stock_snapshots_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| stock_snapshots_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| stock_snapshots_variant_supplier_source_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_supplier_source_id) REFERENCES variant_supplier_sources(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_snapshots_captured_at | btree | captured_at | não | sim |  | `CREATE INDEX idx_snapshots_captured_at ON public.stock_snapshots USING btree (captured_at)` |
| idx_stock_snapshots_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_stock_snapshots_product_id ON public.stock_snapshots USING btree (product_id)` |
| idx_stock_snapshots_supplier_branch_id | btree | supplier_branch_id | não | sim |  | `CREATE INDEX idx_stock_snapshots_supplier_branch_id ON public.stock_snapshots USING btree (supplier_branch_id)` |
| idx_stock_snapshots_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_stock_snapshots_supplier_id ON public.stock_snapshots USING btree (supplier_id)` |
| idx_stock_snapshots_variant_id | btree | variant_id | não | sim |  | `CREATE INDEX idx_stock_snapshots_variant_id ON public.stock_snapshots USING btree (variant_id)` |
| idx_stock_snapshots_variant_supplier | btree | variant_id, supplier_id | não | sim |  | `CREATE INDEX idx_stock_snapshots_variant_supplier ON public.stock_snapshots USING btree (variant_id, supplier_id)` |
| idx_stock_snapshots_variant_supplier_source_id | btree | variant_supplier_source_id | não | sim |  | `CREATE INDEX idx_stock_snapshots_variant_supplier_source_id ON public.stock_snapshots USING btree (variant_supplier_source_id)` |
| stock_snapshots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stock_snapshots_pkey ON public.stock_snapshots USING btree (id)` |


## Policies (RLS)

### `auth_read_stock_snapshots`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_resolve_supplier_arrivals | AFTER | INSERT | ROW | enabled | public.fn_resolve_supplier_arrivals |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
