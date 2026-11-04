# public.mockup_credit_transactions

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
| 3 | `credit_account_id` | `uuid` | não |  |  |  |
| 4 | `type` | `text` | não |  |  |  |
| 5 | `amount` | `numeric(10,4)` | não |  |  |  |
| 6 | `balance_before` | `numeric(10,2)` | não |  |  |  |
| 7 | `balance_after` | `numeric(10,2)` | não |  |  |  |
| 8 | `mockup_id` | `uuid` | sim |  |  |  |
| 9 | `job_id` | `uuid` | sim |  |  |  |
| 10 | `description` | `text` | sim |  |  |  |
| 11 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_credit_transactions_credit_account_id_fkey | FOREIGN KEY | `FOREIGN KEY (credit_account_id) REFERENCES mockup_credits(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| mockup_credit_transactions_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES mockup_generation_jobs(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| mockup_credit_transactions_mockup_id_fkey | FOREIGN KEY | `FOREIGN KEY (mockup_id) REFERENCES generated_mockups(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| mockup_credit_transactions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| mockup_credit_transactions_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| valid_transaction_type | CHECK | `CHECK (type = ANY (ARRAY['charge'::text, 'refund'::text, 'grant'::text, 'bonus'::text, 'purchase'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mockup_credit_transactions_credit_account_id | btree | credit_account_id | não | sim |  | `CREATE INDEX idx_mockup_credit_transactions_credit_account_id ON public.mockup_credit_transactions USING btree (credit_account_id)` |
| idx_mockup_credit_transactions_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_mockup_credit_transactions_job_id ON public.mockup_credit_transactions USING btree (job_id)` |
| idx_mockup_credit_transactions_mockup_id | btree | mockup_id | não | sim |  | `CREATE INDEX idx_mockup_credit_transactions_mockup_id ON public.mockup_credit_transactions USING btree (mockup_id)` |
| idx_mockup_credit_transactions_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_mockup_credit_transactions_user_id ON public.mockup_credit_transactions USING btree (user_id)` |
| mockup_credit_transactions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_credit_transactions_pkey ON public.mockup_credit_transactions USING btree (id)` |


## Policies (RLS)

### `mct_select_own_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
