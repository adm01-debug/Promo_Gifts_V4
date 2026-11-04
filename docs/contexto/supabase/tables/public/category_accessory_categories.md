# public.category_accessory_categories

> Vincula categorias de produtos a categorias de acessórios/embalagens disponíveis.

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
| usada por views | public.vw_category_accessories |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `category_id` | `uuid` | não |  |  | Categoria do produto principal (ex: Canetas \| Semi Metal). |
| 3 | `accessory_category_id` | `uuid` | não |  |  | Categoria de acessórios disponíveis (ex: Embalagem \| Canetas). |
| 4 | `relationship_type` | `character varying(50)` | não | `'accessory'::character varying` |  |  |
| 5 | `is_required` | `boolean` | sim | `false` |  |  |
| 6 | `include_children` | `boolean` | sim | `true` |  | Se TRUE, inclui todas as subcategorias do acessório. |
| 7 | `display_order` | `integer` | sim | `0` |  |  |
| 8 | `display_label` | `character varying(100)` | sim |  |  | Label para exibição no frontend (ex: "Escolha a embalagem"). |
| 9 | `is_active` | `boolean` | não | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_accessory_categories_accessory_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (accessory_category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_accessory_categories_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_accessory_categories_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| chk_different_categories | CHECK | `CHECK (category_id <> accessory_category_id)` |  |  | sim |
| chk_relationship_type | CHECK | `CHECK (relationship_type::text = ANY (ARRAY['accessory'::character varying, 'packaging'::character varying, 'complement'::character varying, 'upsell'::character varying, 'cross_sell'::character varying]::text[]))` |  |  | sim |
| uq_category_accessory | UNIQUE | `UNIQUE (category_id, accessory_category_id, relationship_type)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_accessory_categories_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_accessory_categories_pkey ON public.category_accessory_categories USING btree (id)` |
| idx_cat_acc_category | btree | category_id | não | sim |  | `CREATE INDEX idx_cat_acc_category ON public.category_accessory_categories USING btree (category_id)` |
| idx_category_accessory_categories_accessory_category_id | btree | accessory_category_id | não | sim |  | `CREATE INDEX idx_category_accessory_categories_accessory_category_id ON public.category_accessory_categories USING btree (accessory_category_id)` |
| uq_category_accessory | btree | category_id, accessory_category_id, relationship_type | sim | sim |  | `CREATE UNIQUE INDEX uq_category_accessory ON public.category_accessory_categories USING btree (category_id, accessory_category_id, relationship_type)` |


## Policies (RLS)

### `auth_read_category_accessory_categories`

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
| trg_cat_acc_updated | BEFORE | UPDATE | ROW | enabled | public.fn_update_cat_acc_timestamp |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
