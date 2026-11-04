# public.category_colors

> Vínculo N:N entre categorias cliente e grupos de cores

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
| usada por views | public.vw_product_color_category_links |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `category_id` | `uuid` | não |  |  |  |
| 3 | `color_group_id` | `uuid` | não |  |  |  |
| 4 | `is_primary` | `boolean` | sim | `false` |  |  |
| 5 | `display_order` | `integer` | sim | `0` |  |  |
| 6 | `is_active` | `boolean` | sim | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_colors_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| fk_category_colors_category | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| fk_category_colors_color_group | FOREIGN KEY | `FOREIGN KEY (color_group_id) REFERENCES color_groups(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| uq_category_color_unique | UNIQUE | `UNIQUE (category_id, color_group_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_colors_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_colors_pkey ON public.category_colors USING btree (id)` |
| idx_category_colors_color_group_id | btree | color_group_id | não | sim |  | `CREATE INDEX idx_category_colors_color_group_id ON public.category_colors USING btree (color_group_id)` |
| uq_category_color_unique | btree | category_id, color_group_id | sim | sim |  | `CREATE UNIQUE INDEX uq_category_color_unique ON public.category_colors USING btree (category_id, color_group_id)` |


## Policies (RLS)

### `auth_read_category_colors`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `cat_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cat_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cat_dev_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
