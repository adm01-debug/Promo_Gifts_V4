# public.included_packaging_print_areas

> Áreas de gravação das embalagens ORIGINAIS/inclusas (product_included_packagings). Dimensões de área em MM (padrão de gravação). Análogo a kit_component_print_areas.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.vw_packaging_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `packaging_id` | `uuid` | não |  |  |  |
| 3 | `area_name` | `character varying(100)` | sim |  |  |  |
| 4 | `area_code` | `character varying(50)` | sim |  |  |  |
| 5 | `position` | `character varying(50)` | sim |  |  |  |
| 6 | `shape` | `character varying(30)` | sim | `'rectangular'::character varying` |  |  |
| 7 | `width_mm` | `numeric(8,2)` | sim |  |  |  |
| 8 | `height_mm` | `numeric(8,2)` | sim |  |  |  |
| 9 | `diameter_mm` | `numeric(8,2)` | sim |  |  |  |
| 10 | `max_colors` | `integer` | sim |  |  |  |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `display_order` | `integer` | sim | `0` |  |  |
| 13 | `active` | `boolean` | sim | `true` |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_ippa_shape_dims | CHECK | `CHECK (shape::text = 'circular'::text AND diameter_mm IS NOT NULL OR shape::text <> 'circular'::text)` |  |  | sim |
| included_packaging_print_areas_diameter_mm_check | CHECK | `CHECK (diameter_mm > 0::numeric)` |  |  | sim |
| included_packaging_print_areas_height_mm_check | CHECK | `CHECK (height_mm > 0::numeric)` |  |  | sim |
| included_packaging_print_areas_max_colors_check | CHECK | `CHECK (max_colors > 0)` |  |  | sim |
| included_packaging_print_areas_packaging_id_fkey | FOREIGN KEY | `FOREIGN KEY (packaging_id) REFERENCES product_included_packagings(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| included_packaging_print_areas_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| included_packaging_print_areas_shape_check | CHECK | `CHECK (shape::text = ANY (ARRAY['rectangular'::character varying, 'circular'::character varying, 'oval'::character varying, 'irregular'::character varying]::text[]))` |  |  | sim |
| included_packaging_print_areas_width_mm_check | CHECK | `CHECK (width_mm > 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ippa_packaging | btree | packaging_id | não | sim |  | `CREATE INDEX idx_ippa_packaging ON public.included_packaging_print_areas USING btree (packaging_id)` |
| idx_ippa_packaging_code | btree | packaging_id, area_code | sim | sim | `(area_code IS NOT NULL)` | `CREATE UNIQUE INDEX idx_ippa_packaging_code ON public.included_packaging_print_areas USING btree (packaging_id, area_code) WHERE (area_code IS NOT NULL)` |
| included_packaging_print_areas_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX included_packaging_print_areas_pkey ON public.included_packaging_print_areas USING btree (id)` |
| uq_ippa_packaging_area_code | btree | packaging_id, area_code | sim | sim |  | `CREATE UNIQUE INDEX uq_ippa_packaging_area_code ON public.included_packaging_print_areas USING btree (packaging_id, area_code)` |


## Policies (RLS)

### `auth_read_ippa`

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


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
