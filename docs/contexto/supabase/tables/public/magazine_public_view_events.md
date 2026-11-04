# public.magazine_public_view_events

| propriedade | valor |
|---|---|
| tipo | partitioned |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| chave de partição | `RANGE (viewed_at)` |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não | `nextval('magazine_public_view_events_id_seq'::regclass)` |  |  |
| 2 | `magazine_id` | `uuid` | não |  |  |  |
| 3 | `token_hash` | `text` | não |  |  |  |
| 4 | `ip_hash` | `text` | não |  |  |  |
| 5 | `user_agent_hash` | `text` | sim |  |  |  |
| 6 | `referer_host` | `text` | sim |  |  |  |
| 7 | `page_index` | `integer` | sim |  |  |  |
| 8 | `session_id` | `text` | sim |  |  |  |
| 9 | `viewed_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magazine_public_view_events_magazine_id_fkey | FOREIGN KEY | `FOREIGN KEY (magazine_id) REFERENCES magazines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magazine_public_view_events_pkey | PRIMARY KEY | `PRIMARY KEY (id, viewed_at)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mag_view_events_token_hash | btree | token_hash, viewed_at | não | sim |  | `CREATE INDEX idx_mag_view_events_token_hash ON ONLY public.magazine_public_view_events USING btree (token_hash, viewed_at DESC)` |
| idx_magazine_pub_view_events_magazine_id | btree | magazine_id | não | sim |  | `CREATE INDEX idx_magazine_pub_view_events_magazine_id ON ONLY public.magazine_public_view_events USING btree (magazine_id)` |
| magazine_public_view_events_pkey | btree | id, viewed_at | sim | sim |  | `CREATE UNIQUE INDEX magazine_public_view_events_pkey ON ONLY public.magazine_public_view_events USING btree (id, viewed_at)` |


## Policies (RLS)

### `view_events_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_view_events.magazine_id) AND (m.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |

### `view_events_service_all`

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
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
