# public.xbz_upload_mapping

> Rastreia requisições pg_net para upload de imagens XBZ ao Cloudflare Images

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
| 1 | `id` | `bigint` | não | `nextval('xbz_upload_mapping_id_seq'::regclass)` |  |  |
| 2 | `request_id` | `bigint` | não |  |  |  |
| 3 | `staging_id` | `uuid` | sim |  |  |  |
| 4 | `cf_custom_id` | `text` | não |  |  |  |
| 5 | `source_url` | `text` | não |  |  |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `harvested_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| xbz_upload_mapping_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_xbz_upload_mapping_created_at | btree | created_at | não | sim |  | `CREATE INDEX idx_xbz_upload_mapping_created_at ON public.xbz_upload_mapping USING btree (created_at)` |
| idx_xbz_upload_mapping_request_id | btree | request_id | não | sim |  | `CREATE INDEX idx_xbz_upload_mapping_request_id ON public.xbz_upload_mapping USING btree (request_id)` |
| idx_xbz_upload_mapping_status | btree | status | não | sim |  | `CREATE INDEX idx_xbz_upload_mapping_status ON public.xbz_upload_mapping USING btree (status)` |
| xbz_upload_mapping_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX xbz_upload_mapping_pkey ON public.xbz_upload_mapping USING btree (id)` |


## Policies (RLS)

### `xbz_upload_mapping_auth_read`

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
