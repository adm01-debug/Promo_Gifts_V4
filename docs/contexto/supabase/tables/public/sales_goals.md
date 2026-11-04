# public.sales_goals

> Sales goals by seller and period. Consumed by useSalesGoals.

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `goal_type` | `text` | não |  |  |  |
| 4 | `target_value` | `numeric` | não | `0` |  |  |
| 5 | `current_value` | `numeric` | não | `0` |  |  |
| 6 | `target_quotes` | `integer` | não | `0` |  |  |
| 7 | `current_quotes` | `integer` | não | `0` |  |  |
| 8 | `target_conversions` | `integer` | não | `0` |  |  |
| 9 | `current_conversions` | `integer` | não | `0` |  |  |
| 10 | `start_date` | `date` | não |  |  |  |
| 11 | `end_date` | `date` | não |  |  |  |
| 12 | `is_achieved` | `boolean` | não | `false` |  |  |
| 13 | `achieved_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sales_goals_goal_type_check | CHECK | `CHECK (goal_type = ANY (ARRAY['monthly'::text, 'weekly'::text, 'quarterly'::text]))` |  |  | sim |
| sales_goals_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| sales_goals_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_sales_goals_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_sales_goals_user_id ON public.sales_goals USING btree (user_id)` |
| sales_goals_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sales_goals_pkey ON public.sales_goals USING btree (id)` |


## Policies (RLS)

### `sales_goals_owner_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_sales_goals_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
