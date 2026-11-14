# public.stock_notes

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `variant_id` | `uuid` | não |  |  |  |
| 3 | `supplier_id` | `uuid` | sim |  |  |  |
| 4 | `created_by` | `uuid` | não |  |  |  |
| 5 | `note` | `text` | não |  |  |  |
| 6 | `is_pinned` | `boolean` | não | `false` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| stock_notes_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| stock_notes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| stock_notes_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| stock_notes_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_stock_notes_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_stock_notes_created_by ON public.stock_notes USING btree (created_by)` |
| idx_stock_notes_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_stock_notes_supplier_id ON public.stock_notes USING btree (supplier_id)` |
| stock_notes_active_idx | btree | variant_id | não | sim | `(deleted_at IS NULL)` | `CREATE INDEX stock_notes_active_idx ON public.stock_notes USING btree (variant_id) WHERE (deleted_at IS NULL)` |
| stock_notes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX stock_notes_pkey ON public.stock_notes USING btree (id)` |
| stock_notes_variant_idx | btree | variant_id | não | sim |  | `CREATE INDEX stock_notes_variant_idx ON public.stock_notes USING btree (variant_id)` |


## Policies (RLS)

### `stock_notes_delete_own`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(created_by = ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `stock_notes_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(created_by = ( SELECT auth.uid() AS uid))` |

### `stock_notes_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `stock_notes_update_own`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(created_by = ( SELECT auth.uid() AS uid))` |
| WITH CHECK | `(created_by = ( SELECT auth.uid() AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_stock_notes_updated_at | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
