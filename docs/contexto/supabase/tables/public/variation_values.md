# public.variation_values

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
| 3 | `variation_type_id` | `uuid` | não |  |  |  |
| 4 | `value` | `character varying(200)` | não |  |  |  |
| 5 | `label` | `character varying(200)` | sim |  |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `sort_order` | `integer` | sim | `100` |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| variation_values_organization_id_variation_type_id_value_key | UNIQUE | `UNIQUE (organization_id, variation_type_id, value)` |  |  | sim |
| variation_values_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| variation_values_variation_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (variation_type_id) REFERENCES variation_types(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_variants | product_variants_size_id_fkey | size_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_variation_values_variation_type_id | btree | variation_type_id | não | sim |  | `CREATE INDEX idx_variation_values_variation_type_id ON public.variation_values USING btree (variation_type_id)` |
| variation_values_organization_id_variation_type_id_value_key | btree | organization_id, variation_type_id, value | sim | sim |  | `CREATE UNIQUE INDEX variation_values_organization_id_variation_type_id_value_key ON public.variation_values USING btree (organization_id, variation_type_id, value)` |
| variation_values_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX variation_values_pkey ON public.variation_values USING btree (id)` |


## Policies (RLS)

### `variation_values_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `variation_values_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `variation_values_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `variation_values_select_org`

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
