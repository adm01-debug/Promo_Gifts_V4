# public.kit_component_print_areas

> Áreas de gravação vinculadas a componentes individuais de kits.
Cada componente (faca, estojo, tábua) pode ter N locais de gravação,
e cada local pode ter N técnicas disponíveis.
Reutiliza tabela de preços: tabela_preco_gravacao_oficial + faixas.
Criada em 14/03/2026 - Plano Executivo KITS v4.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_kit_component_print_areas_public, public.v_kit_pipeline_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `kit_component_id` | `uuid` | não |  |  |  |
| 3 | `tabela_preco_id` | `uuid` | não |  |  |  |
| 4 | `location_code` | `text` | não |  |  |  |
| 5 | `location_name` | `text` | sim |  |  |  |
| 6 | `location_order` | `integer` | sim | `1` |  |  |
| 7 | `max_width` | `numeric(8,2)` | não |  |  |  |
| 8 | `max_height` | `numeric(8,2)` | não |  |  |  |
| 9 | `shape` | `text` | não | `'rectangle'::text` |  |  |
| 10 | `is_curved` | `boolean` | não | `false` |  |  |
| 11 | `technique_order` | `integer` | não | `1` |  |  |
| 12 | `is_active` | `boolean` | não | `true` |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_kit_print_area_dim_positiva | CHECK | `CHECK (max_width > 0::numeric AND max_height > 0::numeric)` |  |  | sim |
| kit_component_print_areas_kit_component_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_component_id) REFERENCES product_kit_components(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_component_print_areas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| kit_component_print_areas_tabela_preco_id_fkey | FOREIGN KEY | `FOREIGN KEY (tabela_preco_id) REFERENCES tabela_preco_gravacao_oficial(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kcpa_active | btree | kit_component_id, is_active | não | sim |  | `CREATE INDEX idx_kcpa_active ON public.kit_component_print_areas USING btree (kit_component_id, is_active)` |
| idx_kcpa_component | btree | kit_component_id | não | sim |  | `CREATE INDEX idx_kcpa_component ON public.kit_component_print_areas USING btree (kit_component_id)` |
| idx_kcpa_tabela | btree | tabela_preco_id | não | sim |  | `CREATE INDEX idx_kcpa_tabela ON public.kit_component_print_areas USING btree (tabela_preco_id)` |
| kit_component_print_areas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_component_print_areas_pkey ON public.kit_component_print_areas USING btree (id)` |
| uq_kcpa_component_location_tecnica | btree | kit_component_id, location_code, tabela_preco_id | sim | sim |  | `CREATE UNIQUE INDEX uq_kcpa_component_location_tecnica ON public.kit_component_print_areas USING btree (kit_component_id, location_code, tabela_preco_id)` |


## Policies (RLS)

### `auth_read_kit_component_print_areas`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `kcpa_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `kcpa_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `kcpa_dev_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `kit_component_print_areas_anon_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active = true)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_kit_print_area_normalizar_eixos | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_kit_print_area_normalizar_eixos |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |


Grants por coluna:

| coluna | role | privilégios |
|---|---|---|
| id | anon | SELECT |
| is_active | anon | SELECT |
| is_curved | anon | SELECT |
| kit_component_id | anon | SELECT |
| location_code | anon | SELECT |
| location_name | anon | SELECT |
| location_order | anon | SELECT |
| max_height | anon | SELECT |
| max_width | anon | SELECT |
| shape | anon | SELECT |
| technique_order | anon | SELECT |
