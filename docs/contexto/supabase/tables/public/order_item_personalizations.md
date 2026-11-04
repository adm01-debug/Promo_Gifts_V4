# public.order_item_personalizations

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
| 2 | `order_item_id` | `uuid` | não |  |  |  |
| 3 | `technique_id` | `uuid` | sim |  |  |  |
| 4 | `technique_name` | `text` | sim |  |  |  |
| 5 | `location_id` | `uuid` | sim |  |  |  |
| 6 | `location_name` | `text` | sim |  |  |  |
| 7 | `image_url` | `text` | sim |  |  |  |
| 8 | `personalization_text` | `text` | sim |  |  |  |
| 9 | `price_adjustment` | `numeric(10,2)` | sim | `0` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| order_item_personalizations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| order_item_personalizations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX order_item_personalizations_pkey ON public.order_item_personalizations USING btree (id)` |


## Policies (RLS)

### `order_item_p_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM (order_items oi      JOIN orders o ON ((o.id = oi.order_id)))   WHERE ((oi.id = order_item_personalizations.order_item_id) AND ((o.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR can_view_all_sales()))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
