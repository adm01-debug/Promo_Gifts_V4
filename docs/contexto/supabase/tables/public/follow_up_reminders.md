# public.follow_up_reminders

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
| 2 | `quote_id` | `text` | não |  |  |  |
| 3 | `seller_id` | `uuid` | não |  |  |  |
| 4 | `reminder_type` | `text` | não | `'expiring'::text` |  |  |
| 5 | `scheduled_for` | `timestamp with time zone` | não |  |  |  |
| 6 | `is_sent` | `boolean` | não | `false` |  |  |
| 7 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `title` | `text` | sim | `''::text` |  |  |
| 10 | `notes` | `text` | sim |  |  |  |
| 11 | `is_completed` | `boolean` | não | `false` |  |  |
| 12 | `completed_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| follow_up_reminders_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| follow_up_reminders_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX follow_up_reminders_pkey ON public.follow_up_reminders USING btree (id)` |


## Policies (RLS)

### `Users can manage own reminders`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_owner__follow_up_reminders__seller_id | BEFORE | INSERT | ROW | enabled | public.enforce_seller_id_owner |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
