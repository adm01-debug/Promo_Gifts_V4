# public.personalization_simulations

> Simulacoes de personalizacao salvas por vendedor. Consumida por src/hooks/simulation/useSimulation.ts.

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
| 2 | `seller_id` | `uuid` | não |  |  |  |
| 3 | `client_id` | `uuid` | sim |  |  |  |
| 4 | `product_id` | `uuid` | sim |  |  |  |
| 5 | `product_name` | `text` | sim |  |  |  |
| 6 | `product_sku` | `text` | sim |  |  |  |
| 7 | `quantity` | `integer` | sim |  |  |  |
| 8 | `product_unit_price` | `numeric` | sim |  |  |  |
| 9 | `simulation_data` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| personalization_simulations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| personalization_simulations_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| personalization_simulations_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_personalization_simulations_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_personalization_simulations_product_id ON public.personalization_simulations USING btree (product_id)` |
| idx_personalization_simulations_seller_id | btree | seller_id | não | sim |  | `CREATE INDEX idx_personalization_simulations_seller_id ON public.personalization_simulations USING btree (seller_id)` |
| personalization_simulations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX personalization_simulations_pkey ON public.personalization_simulations USING btree (id)` |


## Policies (RLS)

### `persim_delete_own_or_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `persim_insert_own`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `persim_select_own_or_supervisor`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `persim_update_own_or_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
