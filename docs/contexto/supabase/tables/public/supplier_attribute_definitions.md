# public.supplier_attribute_definitions

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
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `supplier_id` | `uuid` | não |  |  |  |
| 4 | `api_attribute_key` | `character varying(100)` | não |  |  |  |
| 5 | `api_attribute_name` | `character varying(200)` | sim |  |  |  |
| 6 | `api_attribute_name_original` | `character varying(200)` | sim |  |  |  |
| 7 | `data_type` | `character varying(20)` | sim |  |  |  |
| 8 | `api_description` | `text` | sim |  |  |  |
| 9 | `api_unit` | `character varying(30)` | sim |  |  |  |
| 10 | `api_raw_data` | `jsonb` | sim |  |  |  |
| 11 | `source` | `character varying(50)` | sim | `'api'::character varying` |  |  |
| 12 | `sample_values` | `jsonb` | sim |  |  |  |
| 13 | `value_count` | `integer` | sim | `0` |  |  |
| 14 | `is_active` | `boolean` | sim | `true` |  |  |
| 15 | `is_mapped` | `boolean` | sim | `false` |  |  |
| 16 | `notes` | `text` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_attribute_definition_supplier_id_api_attribute_key_key | UNIQUE | `UNIQUE (supplier_id, api_attribute_key)` |  |  | sim |
| supplier_attribute_definitions_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| supplier_attribute_definitions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_attribute_definitions_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_attribute_definitions_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_supplier_attribute_definitions_organization_id ON public.supplier_attribute_definitions USING btree (organization_id)` |
| supplier_attribute_definition_supplier_id_api_attribute_key_key | btree | supplier_id, api_attribute_key | sim | sim |  | `CREATE UNIQUE INDEX supplier_attribute_definition_supplier_id_api_attribute_key_key ON public.supplier_attribute_definitions USING btree (supplier_id, api_attribute_key)` |
| supplier_attribute_definitions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_attribute_definitions_pkey ON public.supplier_attribute_definitions USING btree (id)` |


## Policies (RLS)

### `supplier_attribute_definitions_delete_policy`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT supplier_attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `supplier_attribute_definitions_insert_policy`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT supplier_attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |

### `supplier_attribute_definitions_select_policy`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT supplier_attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `supplier_attribute_definitions_update_policy`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT supplier_attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| handle_updated_at | BEFORE | UPDATE | ROW | enabled | extensions.moddatetime |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
