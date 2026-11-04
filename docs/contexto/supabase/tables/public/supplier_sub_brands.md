# public.supplier_sub_brands

> Catálogo de sub-marcas/linhas de produto por fornecedor.
Ex: SPOT/Stricker → hi!dea™ (linha básica), Cerruti 1881 (linha premium),
Branve (linha outdoor), Ekston (linha tech).

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
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `slug` | `text` | sim |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `is_premium` | `boolean` | não | `false` |  |  |
| 7 | `is_active` | `boolean` | não | `true` |  |  |
| 8 | `products_count` | `integer` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_sub_brands_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_sub_brands_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| supplier_sub_brands_supplier_id_name_key | UNIQUE | `UNIQUE (supplier_id, name)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.products | products_sub_brand_id_fkey | sub_brand_id | NO ACTION |
| public.produtos_padronizacao | produtos_padronizacao_sub_brand_id_fkey | sub_brand_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_sub_brands_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_sub_brands_pkey ON public.supplier_sub_brands USING btree (id)` |
| supplier_sub_brands_supplier_id_name_key | btree | supplier_id, name | sim | sim |  | `CREATE UNIQUE INDEX supplier_sub_brands_supplier_id_name_key ON public.supplier_sub_brands USING btree (supplier_id, name)` |


## Policies (RLS)

### `supplier_sub_brands_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
