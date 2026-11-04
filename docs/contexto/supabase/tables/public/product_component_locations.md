# public.product_component_locations

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
| 2 | `component_id` | `uuid` | não |  |  |  |
| 3 | `location_code` | `text` | não |  |  |  |
| 4 | `location_name` | `text` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `max_width_cm` | `numeric(6,2)` | sim |  |  |  |
| 7 | `max_height_cm` | `numeric(6,2)` | sim |  |  |  |
| 8 | `is_active` | `boolean` | não | `true` |  |  |
| 9 | `sort_order` | `integer` | sim | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `area_image_url` | `text` | sim |  |  |  |
| 13 | `max_area_cm2` | `numeric` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_component_locations_component_id_fkey | FOREIGN KEY | `FOREIGN KEY (component_id) REFERENCES product_components(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_component_locations_component_id_location_code_key | UNIQUE | `UNIQUE (component_id, location_code)` |  |  | sim |
| product_component_locations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_component_location_techniques | product_component_location_technique_component_location_id_fkey | component_location_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_component_locations_component_id_location_code_key | btree | component_id, location_code | sim | sim |  | `CREATE UNIQUE INDEX product_component_locations_component_id_location_code_key ON public.product_component_locations USING btree (component_id, location_code)` |
| product_component_locations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_component_locations_pkey ON public.product_component_locations USING btree (id)` |


## Policies (RLS)

### `Admins delete component locations`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| WITH CHECK |  |

### `Admins insert component locations`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |

### `Admins update component locations`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| WITH CHECK | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |

### `Authenticated view component locations`

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
| update_product_comp_loc_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
