# public.generated_mockups

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
| 2 | `job_id` | `uuid` | sim |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `product_id` | `uuid` | sim |  |  |  |
| 5 | `product_name` | `text` | não |  |  |  |
| 6 | `product_sku` | `text` | sim |  |  |  |
| 7 | `technique_id` | `uuid` | sim |  |  |  |
| 8 | `technique_name` | `text` | não |  |  |  |
| 9 | `product_color_hex` | `text` | não | `'#FFFFFF'::text` |  |  |
| 10 | `product_color_name` | `text` | sim |  |  |  |
| 11 | `area_name` | `text` | não |  |  |  |
| 12 | `area_config` | `jsonb` | não |  |  |  |
| 13 | `mockup_url` | `text` | não |  |  |  |
| 14 | `logo_url` | `text` | sim |  |  |  |
| 15 | `thumbnail_url` | `text` | sim |  |  |  |
| 16 | `ai_model_used` | `text` | não |  |  |  |
| 17 | `generation_time_seconds` | `integer` | sim |  |  |  |
| 18 | `prompt_used` | `text` | sim |  |  |  |
| 19 | `seed_used` | `integer` | sim |  |  |  |
| 20 | `quality_score` | `numeric(3,2)` | sim |  |  |  |
| 21 | `has_errors` | `boolean` | sim | `false` |  |  |
| 22 | `error_details` | `text` | sim |  |  |  |
| 23 | `approval_status` | `text` | sim | `'pending'::text` |  |  |
| 24 | `approved_by_user_id` | `uuid` | sim |  |  |  |
| 25 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 26 | `client_feedback` | `text` | sim |  |  |  |
| 27 | `generation_cost` | `numeric(10,4)` | sim |  |  |  |
| 28 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 29 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 30 | `position_x` | `numeric(5,2)` | sim | `50` |  |  |
| 31 | `position_y` | `numeric(5,2)` | sim | `50` |  |  |
| 32 | `logo_width_cm` | `numeric` | sim | `5` |  |  |
| 33 | `logo_height_cm` | `numeric` | sim | `3` |  |  |
| 34 | `layout_url` | `text` | sim |  |  |  |
| 35 | `client_id` | `text` | sim |  |  |  |
| 36 | `client_name` | `text` | sim |  |  |  |
| 37 | `logo_rotation` | `numeric` | sim | `0` |  |  |
| 38 | `logo_scale` | `numeric` | sim | `100` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| generated_mockups_approved_by_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (approved_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| generated_mockups_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES mockup_generation_jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| generated_mockups_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| generated_mockups_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| generated_mockups_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES personalization_techniques(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| generated_mockups_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| valid_approval_status | CHECK | `CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved_internal'::text, 'approved_client'::text, 'rejected'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.mockup_credit_transactions | mockup_credit_transactions_mockup_id_fkey | mockup_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| generated_mockups_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX generated_mockups_pkey ON public.generated_mockups USING btree (id)` |
| idx_generated_mockups_approved_by_user_id | btree | approved_by_user_id | não | sim |  | `CREATE INDEX idx_generated_mockups_approved_by_user_id ON public.generated_mockups USING btree (approved_by_user_id)` |
| idx_generated_mockups_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_generated_mockups_job_id ON public.generated_mockups USING btree (job_id)` |
| idx_generated_mockups_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_generated_mockups_product_id ON public.generated_mockups USING btree (product_id)` |
| idx_generated_mockups_technique_id | btree | technique_id | não | sim |  | `CREATE INDEX idx_generated_mockups_technique_id ON public.generated_mockups USING btree (technique_id)` |
| idx_generated_mockups_user_created | btree | user_id, created_at | não | sim |  | `CREATE INDEX idx_generated_mockups_user_created ON public.generated_mockups USING btree (user_id, created_at DESC)` |


## Policies (RLS)

### `gm_delete_own_or_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `gm_insert_self`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `gm_select_own_or_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `gm_update_own_or_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_gm_update_job_progress | AFTER | INSERT | ROW | enabled | public.update_mockup_job_progress |
| trg_gm_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
