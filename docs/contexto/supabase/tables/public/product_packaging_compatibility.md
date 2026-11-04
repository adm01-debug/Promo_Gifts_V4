# public.product_packaging_compatibility

> Compatibilidade entre produtos e embalagens vendidas SEPARADAMENTE (COM SKU próprio)

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
| usada por views | public.vw_packaging_health, public.vw_packagings_catalog, public.vw_product_all_packaging_options, public.vw_products_packaging_info |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `packaging_id` | `uuid` | não |  |  |  |
| 4 | `compatibility_source` | `character varying(30)` | não | `'manual'::character varying` |  |  |
| 5 | `supplier_reference_text` | `text` | sim |  |  |  |
| 6 | `supplier_reference_code` | `character varying(50)` | sim |  |  |  |
| 7 | `fit_gap_height_mm` | `numeric(6,2)` | sim |  |  |  |
| 8 | `fit_gap_width_mm` | `numeric(6,2)` | sim |  |  |  |
| 9 | `fit_gap_length_mm` | `numeric(6,2)` | sim |  |  |  |
| 10 | `fit_gap_diameter_mm` | `numeric(6,2)` | sim |  |  |  |
| 11 | `fit_gap_min_mm` | `numeric(6,2)` | sim |  |  |  |
| 12 | `fit_gap_avg_mm` | `numeric(6,2)` | sim |  |  |  |
| 13 | `fit_rating` | `character varying(20)` | sim |  |  |  |
| 14 | `is_recommended` | `boolean` | sim | `false` |  |  |
| 15 | `is_same_supplier` | `boolean` | sim | `false` |  |  |
| 16 | `display_order` | `integer` | sim | `0` |  |  |
| 17 | `is_verified` | `boolean` | sim | `false` |  |  |
| 18 | `verified_at` | `timestamp with time zone` | sim |  |  |  |
| 19 | `verification_notes` | `text` | sim |  |  |  |
| 20 | `notes` | `text` | sim |  |  |  |
| 21 | `active` | `boolean` | sim | `true` |  |  |
| 22 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 23 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 24 | `auto_discovered_at` | `timestamp with time zone` | sim |  |  | Timestamp da última vez que fn_auto_discover_compatible_packagings processou este par |
| 25 | `config_type_used` | `character varying(20)` | sim | `'default'::character varying` |  | Configuração de folga usada: default \| fragile \| precision \| bottles |
| 26 | `needs_padding` | `boolean` | sim | `false` |  | Produto plano em caixa alta (gap_height>200mm): precisa de preenchimento/padding vertical. Definido pela regra B11. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_packaging_compatibility_packaging_id_fkey | FOREIGN KEY | `FOREIGN KEY (packaging_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_packaging_compatibility_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_packaging_compatibility_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_packaging_compatibility_product_id_packaging_id_key | UNIQUE | `UNIQUE (product_id, packaging_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pkg_compat_packaging | btree | packaging_id | não | sim |  | `CREATE INDEX idx_pkg_compat_packaging ON public.product_packaging_compatibility USING btree (packaging_id)` |
| idx_pkg_compat_product | btree | product_id | não | sim |  | `CREATE INDEX idx_pkg_compat_product ON public.product_packaging_compatibility USING btree (product_id)` |
| product_packaging_compatibility_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_packaging_compatibility_pkey ON public.product_packaging_compatibility USING btree (id)` |
| product_packaging_compatibility_product_id_packaging_id_key | btree | product_id, packaging_id | sim | sim |  | `CREATE UNIQUE INDEX product_packaging_compatibility_product_id_packaging_id_key ON public.product_packaging_compatibility USING btree (product_id, packaging_id)` |


## Policies (RLS)

### `product_packaging_compatibility_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_auto_same_supplier | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_auto_set_same_supplier |
| trg_compat_sync_optional | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_trg_compat_sync_optional |
| trg_validate_packaging_type | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_validate_packaging_type_on_compat |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
