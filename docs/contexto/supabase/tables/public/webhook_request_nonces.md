# public.webhook_request_nonces

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
| 2 | `source` | `text` | não |  |  |  |
| 3 | `nonce` | `text` | não |  |  |  |
| 4 | `request_timestamp` | `timestamp with time zone` | não |  |  |  |
| 5 | `expires_at` | `timestamp with time zone` | não |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_request_nonces_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_request_nonces_source_nonce_key | UNIQUE | `UNIQUE (source, nonce)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_request_nonces_expires_at | btree | expires_at | não | sim |  | `CREATE INDEX idx_webhook_request_nonces_expires_at ON public.webhook_request_nonces USING btree (expires_at)` |
| webhook_request_nonces_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_request_nonces_pkey ON public.webhook_request_nonces USING btree (id)` |
| webhook_request_nonces_source_nonce_key | btree | source, nonce | sim | sim |  | `CREATE UNIQUE INDEX webhook_request_nonces_source_nonce_key ON public.webhook_request_nonces USING btree (source, nonce)` |


## Policies (RLS)

### `service_role_manage_webhook_request_nonces`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
