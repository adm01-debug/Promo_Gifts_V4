# public.magazine_duplicate_requests

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `actor_id` | `uuid` | não |  |  |  |
| 2 | `idempotency_key` | `text` | não |  |  |  |
| 3 | `source_magazine_id` | `uuid` | não |  |  |  |
| 4 | `source_edit_version` | `bigint` | não |  |  |  |
| 5 | `request_title` | `text` | sim |  |  |  |
| 6 | `requested_title` | `text` | não |  |  |  |
| 7 | `magazine_id` | `uuid` | não |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `clock_timestamp()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magazine_duplicate_requests_actor_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magazine_duplicate_requests_key_len | CHECK | `CHECK (char_length(idempotency_key) >= 1 AND char_length(idempotency_key) <= 120)` |  |  | sim |
| magazine_duplicate_requests_magazine_id_fkey | FOREIGN KEY | `FOREIGN KEY (magazine_id) REFERENCES magazines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magazine_duplicate_requests_pkey | PRIMARY KEY | `PRIMARY KEY (actor_id, idempotency_key)` |  |  | sim |
| magazine_duplicate_requests_source_magazine_id_fkey | FOREIGN KEY | `FOREIGN KEY (source_magazine_id) REFERENCES magazines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magazine_duplicate_requests_magazine_id | btree | magazine_id | não | sim |  | `CREATE INDEX idx_magazine_duplicate_requests_magazine_id ON public.magazine_duplicate_requests USING btree (magazine_id)` |
| idx_magazine_duplicate_requests_source_magazine_id | btree | source_magazine_id | não | sim |  | `CREATE INDEX idx_magazine_duplicate_requests_source_magazine_id ON public.magazine_duplicate_requests USING btree (source_magazine_id)` |
| magazine_duplicate_requests_pkey | btree | actor_id, idempotency_key | sim | sim |  | `CREATE UNIQUE INDEX magazine_duplicate_requests_pkey ON public.magazine_duplicate_requests USING btree (actor_id, idempotency_key)` |


## Policies (RLS)

### `magazine_duplicate_requests_own_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(actor_id = ( SELECT auth.uid() AS uid))` |

### `magazine_duplicate_requests_own_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(actor_id = ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `magazine_duplicate_requests_service_all`

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
