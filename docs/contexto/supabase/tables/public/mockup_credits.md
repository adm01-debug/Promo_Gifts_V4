# public.mockup_credits

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
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `balance` | `numeric(10,2)` | não | `0.00` |  |  |
| 4 | `lifetime_earned` | `numeric(10,2)` | não | `0.00` |  |  |
| 5 | `lifetime_spent` | `numeric(10,2)` | não | `0.00` |  |  |
| 6 | `monthly_limit` | `numeric(10,2)` | sim |  |  |  |
| 7 | `daily_limit` | `numeric(10,2)` | sim |  |  |  |
| 8 | `current_month_spent` | `numeric(10,2)` | sim | `0.00` |  |  |
| 9 | `current_day_spent` | `numeric(10,2)` | sim | `0.00` |  |  |
| 10 | `last_reset_month` | `date` | sim |  |  |  |
| 11 | `last_reset_day` | `date` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_credits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| mockup_credits_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| mockup_credits_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |
| positive_balance | CHECK | `CHECK (balance >= 0::numeric)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.mockup_credit_transactions | mockup_credit_transactions_credit_account_id_fkey | credit_account_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| mockup_credits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_credits_pkey ON public.mockup_credits USING btree (id)` |
| mockup_credits_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX mockup_credits_user_id_key ON public.mockup_credits USING btree (user_id)` |


## Policies (RLS)

### `mc_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `mc_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `mc_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `mc_select_own_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_mc_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
