# public.kit_quote_requests

> Idempotency ledger for authenticated Kit Maker quote submissions.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `request_id` | `uuid` | não |  |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `quote_id` | `uuid` | não |  |  |  |
| 4 | `payload_hash` | `text` | não |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_quote_requests_payload_hash_not_empty | CHECK | `CHECK (length(payload_hash) > 0)` |  |  | sim |
| kit_quote_requests_pkey | PRIMARY KEY | `PRIMARY KEY (request_id)` |  |  | sim |
| kit_quote_requests_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| kit_quote_requests_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_quote_requests_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_kit_quote_requests_quote_id ON public.kit_quote_requests USING btree (quote_id)` |
| idx_kit_quote_requests_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_kit_quote_requests_user_id ON public.kit_quote_requests USING btree (user_id)` |
| kit_quote_requests_pkey | btree | request_id | sim | sim |  | `CREATE UNIQUE INDEX kit_quote_requests_pkey ON public.kit_quote_requests USING btree (request_id)` |


## Policies (RLS)

### `kit_quote_requests_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT auth.uid() AS uid) = user_id)` |

### `kit_quote_requests_select_own`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
