# public.category_variation_types

> Vincula tipos de variação às categorias. Subcategorias herdam da categoria pai.

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
| usada por views | public.vw_category_variation_types |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `category_id` | `uuid` | não |  |  |  |
| 3 | `variation_type_id` | `uuid` | não |  |  |  |
| 4 | `is_required` | `boolean` | sim | `false` |  | Se TRUE, produtos desta categoria DEVEM ter esta variação |
| 5 | `inherit_from_parent` | `boolean` | sim | `true` |  | Se TRUE, subcategorias herdam automaticamente esta configuração |
| 6 | `display_order` | `integer` | sim | `0` |  |  |
| 7 | `is_active` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_variation_types_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_variation_types_category_id_variation_type_id_key | UNIQUE | `UNIQUE (category_id, variation_type_id)` |  |  | sim |
| category_variation_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| category_variation_types_variation_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (variation_type_id) REFERENCES variation_types(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_variation_types_category_id_variation_type_id_key | btree | category_id, variation_type_id | sim | sim |  | `CREATE UNIQUE INDEX category_variation_types_category_id_variation_type_id_key ON public.category_variation_types USING btree (category_id, variation_type_id)` |
| category_variation_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_variation_types_pkey ON public.category_variation_types USING btree (id)` |
| idx_cvt_category | btree | category_id | não | sim |  | `CREATE INDEX idx_cvt_category ON public.category_variation_types USING btree (category_id)` |
| idx_cvt_variation | btree | variation_type_id | não | sim |  | `CREATE INDEX idx_cvt_variation ON public.category_variation_types USING btree (variation_type_id)` |


## Policies (RLS)

### `auth_read_category_variation_types`

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
