# public.favorite_items

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `list_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `product_id` | `uuid` | não |  |  |  |
| 5 | `variant_id` | `uuid` | sim |  |  |  |
| 6 | `variant_info` | `jsonb` | sim |  |  |  |
| 7 | `note` | `text` | sim |  |  |  |
| 8 | `price_at_save` | `numeric(12,2)` | sim |  |  |  |
| 9 | `position` | `integer` | não | `0` |  |  |
| 10 | `added_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| favorite_items_list_id_fkey | FOREIGN KEY | `FOREIGN KEY (list_id) REFERENCES favorite_lists(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| favorite_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| favorite_items_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| favorite_items_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.favorite_item_reactions | favorite_item_reactions_item_id_fkey | item_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| favorite_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX favorite_items_pkey ON public.favorite_items USING btree (id)` |
| idx_favorite_items_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_favorite_items_product_id ON public.favorite_items USING btree (product_id)` |
| idx_fi_list | btree | list_id, position, added_at | não | sim |  | `CREATE INDEX idx_fi_list ON public.favorite_items USING btree (list_id, "position", added_at)` |
| idx_fi_user | btree | user_id | não | sim |  | `CREATE INDEX idx_fi_user ON public.favorite_items USING btree (user_id)` |
| uniq_fi_list_product_variant | btree | list_id, product_id, variant_id | sim | sim |  | `CREATE UNIQUE INDEX uniq_fi_list_product_variant ON public.favorite_items USING btree (list_id, product_id, variant_id) NULLS NOT DISTINCT` |


## Policies (RLS)

### `fi_anon_via_shared_list`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_items.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now())) AND (l.is_archived = false))))` |
| WITH CHECK |  |

### `fi_delete_own`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `fi_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_items.list_id) AND (l.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |

### `fi_select_own_list_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM favorite_lists l   WHERE ((l.id = favorite_items.list_id) AND (l.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |

### `fi_update_own`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_fi_soft_delete | BEFORE | DELETE | ROW | enabled | public.fn_favorite_items_soft_delete |
| trg_fi_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
