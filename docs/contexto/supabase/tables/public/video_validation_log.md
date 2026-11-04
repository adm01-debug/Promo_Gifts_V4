# public.video_validation_log

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
| usada por views | public.v_video_validation_recent |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `video_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `uuid` | sim |  |  |  |
| 4 | `cloudflare_video_id` | `character varying(100)` | sim |  |  |  |
| 5 | `supplier_code` | `character varying(50)` | sim |  |  |  |
| 6 | `width_px` | `integer` | sim |  |  |  |
| 7 | `height_px` | `integer` | sim |  |  |  |
| 8 | `duration_seconds` | `integer` | sim |  |  |  |
| 9 | `file_size_bytes` | `bigint` | sim |  |  |  |
| 10 | `validation_status` | `character varying(30)` | não |  |  |  |
| 11 | `is_valid` | `boolean` | não | `true` |  |  |
| 12 | `issues` | `text[]` | sim |  |  |  |
| 13 | `recommendations` | `text[]` | sim |  |  |  |
| 14 | `action_type` | `character varying(20)` | sim |  |  |  |
| 15 | `validated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| video_validation_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| video_validation_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX video_validation_log_pkey ON public.video_validation_log USING btree (id)` |


## Policies (RLS)

### `auth_read_video_validation_log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
