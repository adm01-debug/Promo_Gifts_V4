# public.product_component_location_techniques

> Personalization techniques available for each product-component location.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `component_location_id` | `uuid` | não |  |  |  |
| 3 | `technique_id` | `uuid` | não |  |  |  |
| 4 | `composed_code` | `text` | sim |  |  |  |
| 5 | `max_colors` | `integer` | sim |  |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `is_default` | `boolean` | não | `false` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_component_location_te_component_location_id_techniq_key | UNIQUE | `UNIQUE (component_location_id, technique_id)` |  |  | sim |
| product_component_location_technique_component_location_id_fkey | FOREIGN KEY | `FOREIGN KEY (component_location_id) REFERENCES product_component_locations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_component_location_techniques_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_component_location_techniques_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES personalization_techniques(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_component_location_techniques_technique_id | btree | technique_id | não | sim |  | `CREATE INDEX idx_product_component_location_techniques_technique_id ON public.product_component_location_techniques USING btree (technique_id)` |
| product_component_location_te_component_location_id_techniq_key | btree | component_location_id, technique_id | sim | sim |  | `CREATE UNIQUE INDEX product_component_location_te_component_location_id_techniq_key ON public.product_component_location_techniques USING btree (component_location_id, technique_id)` |
| product_component_location_techniques_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_component_location_techniques_pkey ON public.product_component_location_techniques USING btree (id)` |


## Policies (RLS)

### `pcloctech_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `pcloctech_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `pcloctech_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `pcloctech_select_authenticated`

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
| trg_pcloctech_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
