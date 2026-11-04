# public.favorite_item_reactions

> Migrado do Lovable em 2026-05-22 (Lote C). Reações públicas em listas de favoritos compartilhadas.

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `item_id` | `uuid` | não |  |  |  |
| 3 | `list_id` | `uuid` | não |  |  |  |
| 4 | `anon_id` | `text` | não |  |  |  |
| 5 | `emoji` | `text` | não |  |  |  |
| 6 | `ip_hash` | `text` | sim |  |  |  |
| 7 | `user_agent` | `text` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| favorite_item_reactions_emoji_check | CHECK | `CHECK (emoji = ANY (ARRAY['👍'::text, '❤️'::text, '🔥'::text, '💡'::text]))` |  |  | sim |
| favorite_item_reactions_item_id_anon_id_emoji_key | UNIQUE | `UNIQUE (item_id, anon_id, emoji)` |  |  | sim |
| favorite_item_reactions_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (item_id) REFERENCES favorite_items(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| favorite_item_reactions_list_id_fkey | FOREIGN KEY | `FOREIGN KEY (list_id) REFERENCES favorite_lists(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| favorite_item_reactions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| favorite_item_reactions_item_id_anon_id_emoji_key | btree | item_id, anon_id, emoji | sim | sim |  | `CREATE UNIQUE INDEX favorite_item_reactions_item_id_anon_id_emoji_key ON public.favorite_item_reactions USING btree (item_id, anon_id, emoji)` |
| favorite_item_reactions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX favorite_item_reactions_pkey ON public.favorite_item_reactions USING btree (id)` |
| idx_favorite_item_reactions_list_id | btree | list_id | não | sim |  | `CREATE INDEX idx_favorite_item_reactions_list_id ON public.favorite_item_reactions USING btree (list_id)` |


## Policies (RLS)

### `Owners delete own list reactions`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| WITH CHECK |  |

### `Public can insert reactions on shared lists`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now())))))` |

### `Read reactions: admin, owner or shared list`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `(is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))) OR (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_item_reactions.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now()))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
