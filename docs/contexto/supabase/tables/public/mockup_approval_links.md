# public.mockup_approval_links

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `job_id` | `uuid` | não |  |  |  |
| 3 | `client_id` | `uuid` | sim |  |  |  |
| 4 | `public_token` | `text` | não |  |  |  |
| 5 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `max_uses` | `integer` | sim |  |  |  |
| 7 | `current_uses` | `integer` | sim | `0` |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `first_accessed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `last_accessed_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `access_count` | `integer` | sim | `0` |  |  |
| 12 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `rejected_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `client_notes` | `text` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_approval_links_job_id_fkey | FOREIGN KEY | `FOREIGN KEY (job_id) REFERENCES mockup_generation_jobs(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| mockup_approval_links_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| mockup_approval_links_public_token_key | UNIQUE | `UNIQUE (public_token)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mockup_approval_links_job_id | btree | job_id | não | sim |  | `CREATE INDEX idx_mockup_approval_links_job_id ON public.mockup_approval_links USING btree (job_id)` |
| mockup_approval_links_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_approval_links_pkey ON public.mockup_approval_links USING btree (id)` |
| mockup_approval_links_public_token_key | btree | public_token | sim | sim |  | `CREATE UNIQUE INDEX mockup_approval_links_public_token_key ON public.mockup_approval_links USING btree (public_token)` |


## Policies (RLS)

### `mal_authenticated_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((is_active = true) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM mockup_generation_jobs j   WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |

### `mal_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `mal_insert_own_jobs`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM mockup_generation_jobs j   WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |

### `mal_public_select_active`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `(is_active = true)` |
| WITH CHECK |  |

### `mal_update_own_or_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM mockup_generation_jobs j   WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_mal_set_token | BEFORE | INSERT | ROW | enabled | public.set_mockup_approval_token |
| trg_mal_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
