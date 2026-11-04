# public.supplier_video_requirements

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_code` | `character varying(50)` | não |  |  |  |
| 3 | `supplier_name` | `character varying(100)` | sim |  |  |  |
| 4 | `min_width_px` | `integer` | não | `720` |  |  |
| 5 | `min_height_px` | `integer` | não | `480` |  |  |
| 6 | `ideal_width_px` | `integer` | sim | `1920` |  |  |
| 7 | `ideal_height_px` | `integer` | sim | `1080` |  |  |
| 8 | `min_duration_seconds` | `integer` | sim | `5` |  |  |
| 9 | `max_duration_seconds` | `integer` | sim | `300` |  |  |
| 10 | `max_file_size_mb` | `numeric(7,2)` | sim | `500.0` |  |  |
| 11 | `allowed_formats` | `text[]` | sim | `ARRAY['mp4'::text, 'webm'::text, 'mov'::text, 'mkv'::text]` |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `is_active` | `boolean` | sim | `true` |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_video_requirements_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_video_requirements_supplier_code_key | UNIQUE | `UNIQUE (supplier_code)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_video_requirements_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_video_requirements_pkey ON public.supplier_video_requirements USING btree (id)` |
| supplier_video_requirements_supplier_code_key | btree | supplier_code | sim | sim |  | `CREATE UNIQUE INDEX supplier_video_requirements_supplier_code_key ON public.supplier_video_requirements USING btree (supplier_code)` |


## Policies (RLS)

### `auth_read_supplier_video_requirements`

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
