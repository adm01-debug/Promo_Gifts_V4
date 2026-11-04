# public.magazine_reader_state

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `magazine_token_hash` | `text` | não |  |  |  |
| 3 | `viewer_fingerprint` | `text` | não |  |  |  |
| 4 | `last_page_index` | `integer` | não | `0` |  |  |
| 5 | `bookmarks` | `integer[]` | não | `'{}'::integer[]` |  |  |
| 6 | `user_id` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magazine_reader_state_magazine_token_hash_viewer_fingerprin_key | UNIQUE | `UNIQUE (magazine_token_hash, viewer_fingerprint)` |  |  | sim |
| magazine_reader_state_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| magazine_reader_state_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| reader_state_bookmarks_len | CHECK | `CHECK (cardinality(bookmarks) <= 500)` |  |  | sim |
| reader_state_page_range | CHECK | `CHECK (last_page_index >= 0 AND last_page_index <= 9999)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magazine_reader_state_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_magazine_reader_state_user_id ON public.magazine_reader_state USING btree (user_id)` |
| idx_reader_state_token_hash | btree | magazine_token_hash | não | sim |  | `CREATE INDEX idx_reader_state_token_hash ON public.magazine_reader_state USING btree (magazine_token_hash)` |
| idx_reader_state_updated | btree | updated_at | não | sim |  | `CREATE INDEX idx_reader_state_updated ON public.magazine_reader_state USING btree (updated_at)` |
| magazine_reader_state_magazine_token_hash_viewer_fingerprin_key | btree | magazine_token_hash, viewer_fingerprint | sim | sim |  | `CREATE UNIQUE INDEX magazine_reader_state_magazine_token_hash_viewer_fingerprin_key ON public.magazine_reader_state USING btree (magazine_token_hash, viewer_fingerprint)` |
| magazine_reader_state_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magazine_reader_state_pkey ON public.magazine_reader_state USING btree (id)` |


## Policies (RLS)

### `reader_state_owner_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `reader_state_service_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_reader_state_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |
| trg_reader_state_validate | BEFORE | INSERT OR UPDATE | ROW | enabled | public.tg_reader_state_validate |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
