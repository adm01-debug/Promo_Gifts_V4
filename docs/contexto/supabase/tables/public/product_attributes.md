# public.product_attributes

> Atributos estruturados por produto Gold — material, capacidade, BPA free, etc. Populada via fn_promote_padronizacao usando attribute_equivalences como de-para. Fonte primária para filtros de catálogo e comparação de produtos.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `attribute_key` | `text` | não |  |  |  |
| 4 | `attribute_value` | `text` | não |  |  |  |
| 5 | `attribute_type` | `text` | não | `'text'::text` |  |  |
| 6 | `attribute_unit` | `text` | sim |  |  |  |
| 7 | `source_supplier` | `text` | sim |  |  |  |
| 8 | `source_field` | `text` | sim |  |  |  |
| 9 | `source_raw_value` | `text` | sim |  |  |  |
| 10 | `display_order` | `integer` | sim | `0` |  |  |
| 11 | `is_visible` | `boolean` | não | `true` |  |  |
| 12 | `is_filterable` | `boolean` | não | `false` |  |  |
| 13 | `is_comparable` | `boolean` | não | `true` |  |  |
| 14 | `is_active` | `boolean` | não | `true` |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_attributes_attribute_type_check | CHECK | `CHECK (attribute_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'select'::text, 'multiselect'::text]))` |  |  | sim |
| product_attributes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_attributes_product_id_attribute_key_key | UNIQUE | `UNIQUE (product_id, attribute_key)` |  |  | sim |
| product_attributes_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_attributes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_attributes_pkey ON public.product_attributes USING btree (id)` |
| product_attributes_product_id_attribute_key_key | btree | product_id, attribute_key | sim | sim |  | `CREATE UNIQUE INDEX product_attributes_product_id_attribute_key_key ON public.product_attributes USING btree (product_id, attribute_key)` |


## Policies (RLS)

### `pa_select_anon`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `((is_active = true) AND (is_visible = true))` |
| WITH CHECK |  |

### `pa_select_authenticated_all`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `pa_write_service_role`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pa_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at_pa |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
