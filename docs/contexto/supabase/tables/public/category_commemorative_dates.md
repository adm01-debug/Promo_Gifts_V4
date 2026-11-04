# public.category_commemorative_dates

> Vincula categorias de produtos às datas comemorativas relevantes.

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
| usada por views | public.vw_category_commemorative_dates |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `category_id` | `uuid` | não |  |  |  |
| 3 | `commemorative_date_id` | `uuid` | não |  |  |  |
| 4 | `is_primary` | `boolean` | sim | `false` |  | Se TRUE, é a data principal/mais relevante para esta categoria. |
| 5 | `relevance_score` | `integer` | sim | `5` |  | Score de relevância de 1 a 10. Maior = mais relevante para a categoria. |
| 6 | `display_order` | `integer` | sim | `0` |  |  |
| 7 | `custom_message` | `text` | sim |  |  | Mensagem customizada para exibição no frontend. |
| 8 | `is_active` | `boolean` | não | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_commemorative_dates_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_commemorative_dates_commemorative_date_id_fkey | FOREIGN KEY | `FOREIGN KEY (commemorative_date_id) REFERENCES commemorative_dates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| category_commemorative_dates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| uq_category_commemorative | UNIQUE | `UNIQUE (category_id, commemorative_date_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| category_commemorative_dates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX category_commemorative_dates_pkey ON public.category_commemorative_dates USING btree (id)` |
| idx_cat_comm_category | btree | category_id | não | sim |  | `CREATE INDEX idx_cat_comm_category ON public.category_commemorative_dates USING btree (category_id)` |
| idx_category_commemorative_dates_commemorative_date_id | btree | commemorative_date_id | não | sim |  | `CREATE INDEX idx_category_commemorative_dates_commemorative_date_id ON public.category_commemorative_dates USING btree (commemorative_date_id)` |
| uq_category_commemorative | btree | category_id, commemorative_date_id | sim | sim |  | `CREATE UNIQUE INDEX uq_category_commemorative ON public.category_commemorative_dates USING btree (category_id, commemorative_date_id)` |


## Policies (RLS)

### `auth_read_category_commemorative_dates`

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
| trg_cat_comm_updated | BEFORE | UPDATE | ROW | enabled | public.fn_update_cat_comm_timestamp |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
