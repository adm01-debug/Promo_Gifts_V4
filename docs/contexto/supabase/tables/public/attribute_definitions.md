# public.attribute_definitions

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
| 3 | `group_id` | `uuid` | sim |  |  |  |
| 4 | `name` | `character varying(100)` | não |  |  |  |
| 5 | `slug` | `character varying(100)` | não |  |  |  |
| 6 | `display_name` | `character varying(150)` | não |  |  |  |
| 7 | `description` | `text` | sim |  |  |  |
| 8 | `data_type` | `character varying(20)` | sim | `'text'::character varying` |  |  |
| 9 | `unit` | `character varying(30)` | sim |  |  |  |
| 10 | `default_value` | `text` | sim |  |  |  |
| 11 | `possible_values` | `jsonb` | sim |  |  |  |
| 12 | `validation_rules` | `jsonb` | sim |  |  |  |
| 13 | `is_required` | `boolean` | sim | `false` |  |  |
| 14 | `is_filterable` | `boolean` | sim | `true` |  |  |
| 15 | `is_comparable` | `boolean` | sim | `true` |  |  |
| 16 | `is_visible` | `boolean` | sim | `true` |  |  |
| 17 | `is_searchable` | `boolean` | sim | `false` |  |  |
| 18 | `display_order` | `integer` | sim | `0` |  |  |
| 19 | `is_active` | `boolean` | sim | `true` |  |  |
| 20 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 21 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| attribute_definitions_data_type_check | CHECK | `CHECK (data_type::text = ANY (ARRAY['text'::character varying, 'number'::character varying, 'boolean'::character varying, 'select'::character varying, 'multiselect'::character varying]::text[]))` |  |  | sim |
| attribute_definitions_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (group_id) REFERENCES attribute_groups(id)` | NO ACTION | NO ACTION | sim |
| attribute_definitions_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| attribute_definitions_organization_id_slug_key | UNIQUE | `UNIQUE (organization_id, slug)` |  |  | sim |
| attribute_definitions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| attribute_definitions_organization_id_slug_key | btree | organization_id, slug | sim | sim |  | `CREATE UNIQUE INDEX attribute_definitions_organization_id_slug_key ON public.attribute_definitions USING btree (organization_id, slug)` |
| attribute_definitions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX attribute_definitions_pkey ON public.attribute_definitions USING btree (id)` |
| idx_attribute_definitions_group_id | btree | group_id | não | sim |  | `CREATE INDEX idx_attribute_definitions_group_id ON public.attribute_definitions USING btree (group_id)` |


## Policies (RLS)

### `attribute_definitions_delete_policy`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `attribute_definitions_insert_policy`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |

### `attribute_definitions_select_policy`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `attribute_definitions_update_policy`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT attribute_definitions.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| handle_updated_at | BEFORE | UPDATE | ROW | enabled | extensions.moddatetime |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
