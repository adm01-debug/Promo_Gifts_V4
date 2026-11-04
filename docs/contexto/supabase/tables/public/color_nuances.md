# public.color_nuances

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 6 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_color_nuances_public, public.vw_color_mapping |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `name` | `character varying(100)` | não |  |  |  |
| 4 | `slug` | `character varying(100)` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `bitrix_id` | `integer` | sim | `932` |  | ID da propriedade no Bitrix24 (iblock_id=25) onde nuances de cor são armazenadas. Valor canônico: 932 (NUANCE \| COR). Enum values individuais são sincronizados via XML_ID=slug da nuance. |
| 7 | `sort_order` | `integer` | sim | `100` |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| color_nuances_organization_id_name_key | UNIQUE | `UNIQUE (organization_id, name)` |  |  | sim |
| color_nuances_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.color_equivalences | color_equivalences_promo_nuance_id_fkey | promo_nuance_id | SET NULL |
| public.color_variations | color_variations_nuance_id_fkey | nuance_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| color_nuances_organization_id_name_key | btree | organization_id, name | sim | sim |  | `CREATE UNIQUE INDEX color_nuances_organization_id_name_key ON public.color_nuances USING btree (organization_id, name)` |
| color_nuances_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX color_nuances_pkey ON public.color_nuances USING btree (id)` |


## Policies (RLS)

### `color_nuances_anon_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active = true)` |
| WITH CHECK |  |

### `color_nuances_member_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `user_belongs_to_org(organization_id)` |
| WITH CHECK |  |

### `color_nuances_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `color_nuances_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `color_nuances_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `color_nuances_service_role`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
