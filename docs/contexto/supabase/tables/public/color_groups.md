# public.color_groups

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
| usada por views | public.v_commemorative_dates_with_colors, public.v_super_filtro_options, public.vw_color_mapping, public.vw_product_color_category_links, public.vw_supplier_color_mappings |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `name` | `character varying(100)` | não |  |  |  |
| 4 | `slug` | `character varying(100)` | não |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `hex_code` | `character varying(7)` | sim |  |  |  |
| 7 | `bitrix_id` | `integer` | sim | `930` |  | ID da propriedade no Bitrix24 (iblock_id=25) onde grupos de cor são armazenados. Valor canônico: 930 (GRUPO \| COR). Enum values individuais são sincronizados via XML_ID=slug do grupo. |
| 8 | `sort_order` | `integer` | sim | `100` |  |  |
| 9 | `is_active` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `internal_code` | `character varying(10)` | sim |  |  | Código interno hierárquico do grupo (1, 2, 3...). Uso interno, não exposto no frontend. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| color_groups_organization_id_name_key | UNIQUE | `UNIQUE (organization_id, name)` |  |  | sim |
| color_groups_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| color_groups_slug_unique | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.category_colors | fk_category_colors_color_group | color_group_id | CASCADE |
| public.color_variations | color_variations_color_group_id_fkey | color_group_id | NO ACTION |
| public.color_variations | color_variations_group_id_fkey | group_id | NO ACTION |
| public.commemorative_date_colors | commemorative_date_colors_color_group_id_fkey | color_group_id | CASCADE |
| public.feminine_color_config | feminine_color_config_color_group_id_fkey | color_group_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| color_groups_organization_id_name_key | btree | organization_id, name | sim | sim |  | `CREATE UNIQUE INDEX color_groups_organization_id_name_key ON public.color_groups USING btree (organization_id, name)` |
| color_groups_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX color_groups_pkey ON public.color_groups USING btree (id)` |
| color_groups_slug_unique | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX color_groups_slug_unique ON public.color_groups USING btree (slug)` |
| idx_color_groups_internal_code | btree | organization_id, internal_code | sim | sim | `(internal_code IS NOT NULL)` | `CREATE UNIQUE INDEX idx_color_groups_internal_code ON public.color_groups USING btree (organization_id, internal_code) WHERE (internal_code IS NOT NULL)` |


## Policies (RLS)

### `color_groups_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `color_groups_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `color_groups_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `color_groups_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
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
