# public.saved_stock_views

> Views salvas do painel de estoque: nome, filtros (jsonb), descricao, fixacao e contador de uso, por usuario autenticado.

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `filters` | `jsonb` | não | `'{}'::jsonb` |  | Filtros do painel /estoque serializados: {"activeLevel": <nivel EMA\|null>}; schema validado em src/lib/stock/saved-views.ts. |
| 6 | `is_pinned` | `boolean` | não | `false` |  |  |
| 7 | `use_count` | `integer` | não | `0` |  | Quantas vezes o operador aplicou a view; incrementado pela UI do menu de views salvas. |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| saved_stock_views_filters_object_check | CHECK | `CHECK (jsonb_typeof(filters) = 'object'::text)` |  |  | sim |
| saved_stock_views_name_len_check | CHECK | `CHECK (char_length(btrim(name)) >= 1 AND char_length(btrim(name)) <= 80)` |  |  | sim |
| saved_stock_views_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| saved_stock_views_use_count_check | CHECK | `CHECK (use_count >= 0)` |  |  | sim |
| saved_stock_views_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| saved_stock_views_user_name_key | UNIQUE | `UNIQUE (user_id, name)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| saved_stock_views_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX saved_stock_views_pkey ON public.saved_stock_views USING btree (id)` |
| saved_stock_views_user_name_key | btree | user_id, name | sim | sim |  | `CREATE UNIQUE INDEX saved_stock_views_user_name_key ON public.saved_stock_views USING btree (user_id, name)` |
| saved_stock_views_user_order_idx | btree | user_id, is_pinned, created_at | não | sim |  | `CREATE INDEX saved_stock_views_user_order_idx ON public.saved_stock_views USING btree (user_id, is_pinned DESC, created_at DESC)` |


## Policies (RLS)

### `saved_stock_views_delete_own`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |

### `saved_stock_views_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = auth.uid())` |

### `saved_stock_views_select_own`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK |  |

### `saved_stock_views_update_own`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = auth.uid())` |
| WITH CHECK | `(user_id = auth.uid())` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_saved_stock_views_updated_at | BEFORE | UPDATE | ROW | enabled | public.handle_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
