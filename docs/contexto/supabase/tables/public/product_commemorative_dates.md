# public.product_commemorative_dates

> Vincula produtos às datas comemorativas. Pode ser herdado da categoria ou manual.

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
| usada por views | public.v_super_filtro_options, public.vw_product_commemorative_dates, public.vw_products_by_date, public.vw_super_filtro_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `commemorative_date_id` | `uuid` | não |  |  |  |
| 4 | `source` | `character varying(20)` | sim | `'category'::character varying` |  | Origem do vínculo: category (herdado via trigger) ou manual (adicionado individualmente). |
| 5 | `category_id` | `uuid` | sim |  |  |  |
| 6 | `is_featured` | `boolean` | sim | `false` |  | Se TRUE, produto é destacado nas campanhas desta data. |
| 7 | `relevance_score` | `integer` | sim | `5` |  |  |
| 8 | `display_order` | `integer` | sim | `0` |  |  |
| 9 | `custom_message` | `text` | sim |  |  |  |
| 10 | `is_active` | `boolean` | não | `true` |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_commemorative_dates_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| product_commemorative_dates_commemorative_date_id_fkey | FOREIGN KEY | `FOREIGN KEY (commemorative_date_id) REFERENCES commemorative_dates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_commemorative_dates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_commemorative_dates_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| uq_product_commemorative_date | UNIQUE | `UNIQUE (product_id, commemorative_date_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_prod_comm_product | btree | product_id | não | sim |  | `CREATE INDEX idx_prod_comm_product ON public.product_commemorative_dates USING btree (product_id)` |
| idx_product_commemorative_dates_category_id | btree | category_id | não | sim |  | `CREATE INDEX idx_product_commemorative_dates_category_id ON public.product_commemorative_dates USING btree (category_id)` |
| idx_product_commemorative_dates_commemorative_date_id | btree | commemorative_date_id | não | sim |  | `CREATE INDEX idx_product_commemorative_dates_commemorative_date_id ON public.product_commemorative_dates USING btree (commemorative_date_id)` |
| product_commemorative_dates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_commemorative_dates_pkey ON public.product_commemorative_dates USING btree (id)` |
| uq_product_commemorative_date | btree | product_id, commemorative_date_id | sim | sim |  | `CREATE UNIQUE INDEX uq_product_commemorative_date ON public.product_commemorative_dates USING btree (product_id, commemorative_date_id)` |


## Policies (RLS)

### `pcd_read_public`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `(is_active = true)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_prod_comm_updated | BEFORE | UPDATE | ROW | enabled | public.fn_update_prod_comm_timestamp |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
