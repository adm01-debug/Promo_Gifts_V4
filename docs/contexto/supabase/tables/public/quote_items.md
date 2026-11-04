# public.quote_items

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |
| usada por views | public.v_db_health_audit |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `quote_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `uuid` | sim |  |  |  |
| 4 | `product_sku` | `text` | sim |  |  |  |
| 5 | `product_name` | `text` | não |  |  |  |
| 6 | `product_description` | `text` | sim |  |  |  |
| 7 | `product_image_url` | `text` | sim |  |  |  |
| 8 | `has_personalization` | `boolean` | sim | `false` |  |  |
| 9 | `personalization_config` | `jsonb` | sim |  |  |  |
| 10 | `personalization_cost` | `numeric(10,2)` | sim | `0` |  |  |
| 11 | `quantity` | `integer` | não | `1` |  |  |
| 12 | `unit_price` | `numeric(10,2)` | não |  |  |  |
| 13 | `discount_percentage` | `numeric(5,2)` | sim | `0` |  |  |
| 14 | `discount_amount` | `numeric(10,2)` | sim | `0` |  |  |
| 15 | `subtotal` | `numeric(10,2)` | não |  |  |  |
| 16 | `mockup_urls` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 17 | `artwork_urls` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 18 | `notes` | `text` | sim |  |  |  |
| 20 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 21 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 22 | `color_name` | `text` | sim |  |  |  |
| 23 | `color_hex` | `text` | sim |  |  |  |
| 24 | `bitrix_product_id` | `text` | sim |  |  |  |
| 25 | `kit_group_id` | `uuid` | sim |  |  |  |
| 26 | `kit_name` | `text` | sim |  |  |  |
| 27 | `size_code` | `text` | sim |  |  |  |
| 28 | `gender` | `text` | sim |  |  |  |
| 29 | `sort_order` | `integer` | sim | `0` |  | Ordem de apresentação. Coexiste com display_order legacy — código novo usa sort_order. |
| 30 | `price_updated_at` | `timestamp with time zone` | sim |  |  | Timestamp da última atualização de preço no catálogo SSOT. Usado pelo badge de preço defasado. |
| 31 | `price_freshness_threshold_days` | `integer` | sim | `60` |  |  |
| 32 | `price_confirmed_at` | `timestamp with time zone` | sim |  |  | Timestamp em que vendedor confirmou preço com fornecedor. Quando NOT NULL suprime badge de defasagem. |
| 33 | `selected_packaging_id` | `uuid` | sim |  |  | Embalagem opcional escolhida (products.product_type=packaging). Fundacao do ciclo de venda de embalagens (2026-06-26). |
| 34 | `selected_packaging_name` | `text` | sim |  |  | Snapshot do nome da embalagem opcional no momento da escolha. |
| 35 | `selected_packaging_unit_cost` | `numeric(12,2)` | sim |  |  | Custo unitario da embalagem opcional no momento da escolha (snapshot). |
| 36 | `product_variant_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_quote_items_qty_pos | CHECK | `CHECK (quantity > 0)` |  |  | sim |
| chk_quote_items_subtotal_positive | CHECK | `CHECK (subtotal >= 0::numeric)` |  |  | sim |
| chk_quote_items_unit_price_nonneg | CHECK | `CHECK (unit_price IS NULL OR unit_price >= 0::numeric)` |  |  | sim |
| quote_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_items_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quote_items_product_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quote_items_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_items_selected_packaging_id_fkey | FOREIGN KEY | `FOREIGN KEY (selected_packaging_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| trg_quote_items_discount_integrity_deferred | t | `TRIGGER DEFERRABLE INITIALLY DEFERRED` |  |  | sim |
| valid_product_reference | CHECK | `CHECK (product_id IS NOT NULL OR product_name IS NOT NULL AND product_name <> ''::text)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.quote_item_personalizations | quote_item_personalizations_quote_item_id_fkey | quote_item_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_items_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_quote_items_product_id ON public.quote_items USING btree (product_id)` |
| idx_quote_items_product_variant_id | btree | product_variant_id | não | sim |  | `CREATE INDEX idx_quote_items_product_variant_id ON public.quote_items USING btree (product_variant_id)` |
| idx_quote_items_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_quote_items_quote_id ON public.quote_items USING btree (quote_id)` |
| idx_quote_items_selected_packaging_id | btree | selected_packaging_id | não | sim |  | `CREATE INDEX idx_quote_items_selected_packaging_id ON public.quote_items USING btree (selected_packaging_id)` |
| quote_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_items_pkey ON public.quote_items USING btree (id)` |


## Policies (RLS)

### `quote_items_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `can_access_quote(quote_id)` |
| WITH CHECK |  |

### `quote_items_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `can_access_quote(quote_id)` |

### `quote_items_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `can_access_quote(quote_id)` |
| WITH CHECK |  |

### `quote_items_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `can_access_quote(quote_id)` |
| WITH CHECK | `can_access_quote(quote_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_quote_items_calc_subtotal | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_quote_items_calc_subtotal |
| trg_quote_items_discount_integrity_deferred | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_deferred_quote_discount_integrity |
| trg_quote_items_parent_immutable | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_quote_children_enforce_parent_immutability |
| trg_quotes_recalc_from_items | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_quotes_recalc_subtotal_from_items |
| trg_validate_selected_packaging | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_validate_selected_packaging |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
