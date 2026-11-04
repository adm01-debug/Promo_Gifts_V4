# public.ip_access_control

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
| 2 | `ip_address` | `text` | não |  |  |  |
| 3 | `list_type` | `text` | não |  |  |  |
| 4 | `reason` | `text` | sim |  |  |  |
| 5 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 6 | `created_by` | `uuid` | sim |  |  |  |
| 7 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| ip_access_control_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| ip_access_control_ip_address_list_type_key | UNIQUE | `UNIQUE (ip_address, list_type)` |  |  | sim |
| ip_access_control_list_type_check | CHECK | `CHECK (list_type = ANY (ARRAY['allow'::text, 'block'::text]))` |  |  | sim |
| ip_access_control_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ip_access_control_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_ip_access_control_created_by ON public.ip_access_control USING btree (created_by)` |
| idx_ip_access_control_expires | btree | expires_at | não | sim | `(expires_at IS NOT NULL)` | `CREATE INDEX idx_ip_access_control_expires ON public.ip_access_control USING btree (expires_at) WHERE (expires_at IS NOT NULL)` |
| ip_access_control_ip_address_list_type_key | btree | ip_address, list_type | sim | sim |  | `CREATE UNIQUE INDEX ip_access_control_ip_address_list_type_key ON public.ip_access_control USING btree (ip_address, list_type)` |
| ip_access_control_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ip_access_control_pkey ON public.ip_access_control USING btree (id)` |


## Policies (RLS)

### `Admins can manage ip_access_control`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at | BEFORE | UPDATE | ROW | enabled | public.tg_ip_access_control_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
