# public.seller_discount_limits

> Alçada de desconto por vendedor. max_discount_percent: limite hard (rejeita acima). approval_required_above: opcional, pra abrir discount_approval_request automaticamente. Defaults: 5% / 10%.

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
| 3 | `max_discount_percent` | `numeric(5,2)` | não | `5.0` |  |  |
| 4 | `approval_required_above` | `numeric(5,2)` | sim | `10.0` |  |  |
| 5 | `notes` | `text` | sim |  |  |  |
| 6 | `set_by` | `uuid` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| seller_discount_limits_approval_required_above_check | CHECK | `CHECK (approval_required_above >= 0::numeric AND approval_required_above <= 100::numeric)` |  |  | sim |
| seller_discount_limits_max_discount_percent_check | CHECK | `CHECK (max_discount_percent >= 0::numeric AND max_discount_percent <= 100::numeric)` |  |  | sim |
| seller_discount_limits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| seller_discount_limits_set_by_fkey | FOREIGN KEY | `FOREIGN KEY (set_by) REFERENCES profiles(user_id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| seller_discount_limits_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| seller_discount_limits_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_seller_discount_limits_set_by | btree | set_by | não | sim |  | `CREATE INDEX idx_seller_discount_limits_set_by ON public.seller_discount_limits USING btree (set_by)` |
| seller_discount_limits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seller_discount_limits_pkey ON public.seller_discount_limits USING btree (id)` |
| seller_discount_limits_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX seller_discount_limits_user_id_key ON public.seller_discount_limits USING btree (user_id)` |


## Policies (RLS)

### `sdl_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `sdl_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `sdl_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `sdl_select_own_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sdl_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
