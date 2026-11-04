# public.magazine_public_reactions

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
| 2 | `magazine_id` | `uuid` | não |  |  |  |
| 3 | `page_index` | `integer` | sim |  |  |  |
| 4 | `item_id` | `uuid` | sim |  |  |  |
| 5 | `kind` | `magazine_reaction_kind` | não |  |  |  |
| 6 | `viewer_fingerprint` | `text` | não |  |  |  |
| 7 | `ip_hash` | `text` | não |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magazine_public_reactions_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (item_id) REFERENCES magazine_items(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magazine_public_reactions_magazine_id_fkey | FOREIGN KEY | `FOREIGN KEY (magazine_id) REFERENCES magazines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magazine_public_reactions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| reactions_unique_toggle | UNIQUE | `UNIQUE NULLS NOT DISTINCT (magazine_id, viewer_fingerprint, kind, page_index, item_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mag_reactions_item | btree | item_id | não | sim | `(item_id IS NOT NULL)` | `CREATE INDEX idx_mag_reactions_item ON public.magazine_public_reactions USING btree (item_id) WHERE (item_id IS NOT NULL)` |
| idx_mag_reactions_mag | btree | magazine_id, kind, created_at | não | sim |  | `CREATE INDEX idx_mag_reactions_mag ON public.magazine_public_reactions USING btree (magazine_id, kind, created_at DESC)` |
| magazine_public_reactions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magazine_public_reactions_pkey ON public.magazine_public_reactions USING btree (id)` |
| reactions_unique_toggle | btree | magazine_id, viewer_fingerprint, kind, page_index, item_id | sim | sim |  | `CREATE UNIQUE INDEX reactions_unique_toggle ON public.magazine_public_reactions USING btree (magazine_id, viewer_fingerprint, kind, page_index, item_id) NULLS NOT DISTINCT` |


## Policies (RLS)

### `reactions_read_owner`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_public_reactions.magazine_id) AND (m.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |
| WITH CHECK |  |

### `reactions_service_all`

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
