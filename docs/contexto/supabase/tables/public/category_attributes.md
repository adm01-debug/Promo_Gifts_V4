# public.category_attributes

> Atributos customizados por categoria (ex: material_permitido, tamanho_minimo)

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `category_id` | `uuid` | não |  |  |  |
| 3 | `attribute_key` | `text` | não |  |  |  |
| 4 | `attribute_value` | `text` | sim |  |  |  |
| 5 | `attribute_type` | `text` | sim |  |  |  |
| 6 | `is_filterable` | `boolean` | sim | `false` |  |  |
| 7 | `display_order` | `integer` | sim | `0` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_attributes_attribute_type_check | CHECK | `CHECK (attribute_type = ANY (ARRAY['text'::text, 'number'::text, 'boolean'::text, 'json'::text]))` |  |  | sim |
| category_attributes_category_id_attribute_key_key | UNIQUE | `UNIQUE (category_id, attribute_key)` |  |  | sim |
| category_attributes_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_attributes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_attributes_category_id_attribute_key_key | btree | category_id, attribute_key | sim | sim |  | `CREATE UNIQUE INDEX category_attributes_category_id_attribute_key_key ON public.category_attributes USING btree (category_id, attribute_key)` |
| category_attributes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_attributes_pkey ON public.category_attributes USING btree (id)` |


## Policies (RLS)

### `category_attributes_follows_category`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(category_id IN ( SELECT categories.id    FROM categories   WHERE (categories.organization_id IN ( SELECT user_organizations.organization_id            FROM user_organizations           WHERE (user_organizations.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
