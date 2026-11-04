# public.mockup_drafts

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
| 3 | `draft_key` | `text` | não | `'default'::text` |  |  |
| 4 | `product_id` | `text` | sim |  |  |  |
| 5 | `product_name` | `text` | sim |  |  |  |
| 6 | `technique_id` | `text` | sim |  |  |  |
| 7 | `technique_name` | `text` | sim |  |  |  |
| 8 | `client_id` | `text` | sim |  |  |  |
| 9 | `client_name` | `text` | sim |  |  |  |
| 10 | `personalization_areas` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 11 | `logo_data` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_drafts_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| mockup_drafts_user_id_draft_key_key | UNIQUE | `UNIQUE (user_id, draft_key)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| mockup_drafts_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_drafts_pkey ON public.mockup_drafts USING btree (id)` |
| mockup_drafts_user_id_draft_key_key | btree | user_id, draft_key | sim | sim |  | `CREATE UNIQUE INDEX mockup_drafts_user_id_draft_key_key ON public.mockup_drafts USING btree (user_id, draft_key)` |


## Policies (RLS)

### `Users can manage own drafts`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__mockup_drafts__user_id | BEFORE | INSERT | ROW | enabled | public.enforce_user_id_owner |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
