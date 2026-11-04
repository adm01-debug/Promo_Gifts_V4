# public.mockup_generation_jobs

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
| 3 | `client_id` | `uuid` | sim |  |  | FK pra bitrix_clients removida na Etapa 5 — tabela não existe ainda. Quando bitrix_clients for criada, adicionar REFERENCES. |
| 4 | `product_id` | `uuid` | sim |  |  |  |
| 5 | `product_name` | `text` | não |  |  |  |
| 6 | `product_sku` | `text` | sim |  |  |  |
| 7 | `technique_id` | `uuid` | sim |  |  |  |
| 8 | `technique_name` | `text` | não |  |  |  |
| 9 | `logo_url` | `text` | não |  |  |  |
| 10 | `logo_filename` | `text` | sim |  |  |  |
| 11 | `product_colors` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 12 | `colors_count` | `integer` | não | `1` |  |  |
| 13 | `areas_config` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 14 | `art_colors_count` | `integer` | sim | `1` |  |  |
| 15 | `custom_prompt` | `text` | sim |  |  |  |
| 16 | `ai_model` | `text` | sim | `'pro'::text` |  |  |
| 17 | `status` | `text` | não | `'pending'::text` |  |  |
| 18 | `total_mockups` | `integer` | não | `0` |  |  |
| 19 | `completed_mockups` | `integer` | sim | `0` |  |  |
| 20 | `failed_mockups` | `integer` | sim | `0` |  |  |
| 21 | `estimated_cost` | `numeric(10,2)` | sim |  |  |  |
| 22 | `actual_cost` | `numeric(10,2)` | sim |  |  |  |
| 23 | `error_message` | `text` | sim |  |  |  |
| 24 | `processing_started_at` | `timestamp with time zone` | sim |  |  |  |
| 25 | `processing_completed_at` | `timestamp with time zone` | sim |  |  |  |
| 26 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 27 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_generation_jobs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| mockup_generation_jobs_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| mockup_generation_jobs_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES personalization_techniques(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| mockup_generation_jobs_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| valid_ai_model | CHECK | `CHECK (ai_model = ANY (ARRAY['standard'::text, 'pro'::text]))` |  |  | sim |
| valid_status | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.generated_mockups | generated_mockups_job_id_fkey | job_id | CASCADE |
| public.mockup_approval_links | mockup_approval_links_job_id_fkey | job_id | CASCADE |
| public.mockup_credit_transactions | mockup_credit_transactions_job_id_fkey | job_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mockup_generation_jobs_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_mockup_generation_jobs_product_id ON public.mockup_generation_jobs USING btree (product_id)` |
| idx_mockup_generation_jobs_technique_id | btree | technique_id | não | sim |  | `CREATE INDEX idx_mockup_generation_jobs_technique_id ON public.mockup_generation_jobs USING btree (technique_id)` |
| idx_mockup_generation_jobs_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_mockup_generation_jobs_user_id ON public.mockup_generation_jobs USING btree (user_id)` |
| mockup_generation_jobs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_generation_jobs_pkey ON public.mockup_generation_jobs USING btree (id)` |


## Policies (RLS)

### `mgj_delete_dev`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `mgj_insert_self`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |

### `mgj_select_own_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `mgj_update_own_or_coord`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_mgj_calculate_cost | BEFORE | INSERT OR UPDATE | ROW | enabled | public.calculate_mockup_job_estimated_cost |
| trg_mgj_charge_credits | AFTER | INSERT OR UPDATE | ROW | enabled | public.charge_mockup_credits_for_job |
| trg_mgj_increment_template_usage | AFTER | INSERT | ROW | enabled | public.increment_mockup_template_usage |
| trg_mgj_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
