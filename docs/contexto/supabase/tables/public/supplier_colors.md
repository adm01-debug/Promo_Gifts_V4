# public.supplier_colors

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
| usada por views | public.vw_color_coverage, public.vw_color_mapping, public.vw_spot_color_health, public.vw_supplier_color_mappings |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `supplier_id` | `uuid` | não |  |  |  |
| 4 | `name` | `character varying(200)` | não |  |  |  |
| 5 | `code` | `character varying(100)` | sim |  |  |  |
| 6 | `hex_code` | `character varying(7)` | sim |  |  |  |
| 7 | `api_color_id` | `character varying(100)` | sim |  |  |  |
| 8 | `api_description` | `text` | sim |  |  |  |
| 9 | `api_optional_description` | `text` | sim |  |  |  |
| 10 | `api_raw_data` | `jsonb` | sim |  |  |  |
| 11 | `image_url` | `text` | sim |  |  |  |
| 12 | `source` | `character varying(50)` | sim | `'manual'::character varying` |  |  |
| 13 | `is_active` | `boolean` | sim | `true` |  |  |
| 14 | `is_available` | `boolean` | sim | `true` |  |  |
| 15 | `notes` | `text` | sim |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `color_variation_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_colors_color_variation_id_fkey | FOREIGN KEY | `FOREIGN KEY (color_variation_id) REFERENCES color_variations(id)` | NO ACTION | NO ACTION | sim |
| supplier_colors_organization_id_supplier_id_name_key | UNIQUE | `UNIQUE (organization_id, supplier_id, name)` |  |  | sim |
| supplier_colors_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_colors_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.color_equivalences | color_equivalences_supplier_color_id_fkey | supplier_color_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_colors_api_color_id_unique | btree | organization_id, supplier_id, api_color_id | sim | sim | `(api_color_id IS NOT NULL)` | `CREATE UNIQUE INDEX idx_supplier_colors_api_color_id_unique ON public.supplier_colors USING btree (organization_id, supplier_id, api_color_id) WHERE (api_color_id IS NOT NULL)` |
| idx_supplier_colors_color_variation_id | btree | color_variation_id | não | sim | `(color_variation_id IS NOT NULL)` | `CREATE INDEX idx_supplier_colors_color_variation_id ON public.supplier_colors USING btree (color_variation_id) WHERE (color_variation_id IS NOT NULL)` |
| idx_supplier_colors_name_upper_active | btree |  | não | sim | `(is_active = true)` | `CREATE INDEX idx_supplier_colors_name_upper_active ON public.supplier_colors USING btree (upper(TRIM(BOTH FROM name))) WHERE (is_active = true)` |
| idx_supplier_colors_supplier_code | btree | supplier_id, code | não | sim | `(code IS NOT NULL)` | `CREATE INDEX idx_supplier_colors_supplier_code ON public.supplier_colors USING btree (supplier_id, code) WHERE (code IS NOT NULL)` |
| idx_supplier_colors_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_supplier_colors_supplier_id ON public.supplier_colors USING btree (supplier_id)` |
| supplier_colors_organization_id_supplier_id_name_key | btree | organization_id, supplier_id, name | sim | sim |  | `CREATE UNIQUE INDEX supplier_colors_organization_id_supplier_id_name_key ON public.supplier_colors USING btree (organization_id, supplier_id, name)` |
| supplier_colors_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_colors_pkey ON public.supplier_colors USING btree (id)` |


## Policies (RLS)

### `supplier_colors_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `supplier_colors_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `supplier_colors_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `supplier_colors_public_read`

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
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_auto_criar_equivalencia_spot | AFTER | INSERT | ROW | enabled | public.fn_auto_criar_equivalencia_spot |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
