# public.variation_types

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
| usada por views | public.vw_category_variation_types |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `code` | `character varying(100)` | não |  |  |  |
| 4 | `name` | `character varying(200)` | não |  |  |  |
| 5 | `slug` | `character varying(100)` | não |  |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `is_required` | `boolean` | sim | `false` |  |  |
| 8 | `value_type` | `character varying(50)` | sim | `'predefined'::character varying` |  |  |
| 9 | `sort_order` | `integer` | sim | `100` |  |  |
| 10 | `is_active` | `boolean` | sim | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| variation_types_organization_id_code_key | UNIQUE | `UNIQUE (organization_id, code)` |  |  | sim |
| variation_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.category_variation_types | category_variation_types_variation_type_id_fkey | variation_type_id | CASCADE |
| public.variation_values | variation_values_variation_type_id_fkey | variation_type_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| variation_types_organization_id_code_key | btree | organization_id, code | sim | sim |  | `CREATE UNIQUE INDEX variation_types_organization_id_code_key ON public.variation_types USING btree (organization_id, code)` |
| variation_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX variation_types_pkey ON public.variation_types USING btree (id)` |


## Policies (RLS)

### `variation_types_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `variation_types_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `variation_types_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `variation_types_select_org`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `user_belongs_to_org(organization_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
