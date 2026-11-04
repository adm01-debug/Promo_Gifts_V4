# public.inbound_webhook_endpoints

> Wave 3.3.C.2 2026-05-22: unificado HMAC+api-key. 2 endpoints migrados do Lovable (created_by NULL, original guardado em metadata).

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
| 2 | `slug` | `text` | não |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `secret_key` | `text` | sim |  |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `allowed_ips` | `text[]` | sim |  |  |  |
| 8 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 9 | `created_by` | `uuid` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `source_system` | `text` | sim |  |  |  |
| 13 | `hmac_secret_ref` | `text` | sim |  |  |  |
| 14 | `allowed_events` | `text[]` | sim | `ARRAY[]::text[]` |  |  |
| 15 | `last_received_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `total_received` | `integer` | não | `0` |  |  |
| 17 | `total_invalid` | `integer` | não | `0` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| inbound_webhook_endpoints_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| inbound_webhook_endpoints_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| inbound_webhook_endpoints_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.inbound_webhook_events | inbound_webhook_events_endpoint_id_fkey | endpoint_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_inbound_webhook_endpoints_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_inbound_webhook_endpoints_created_by ON public.inbound_webhook_endpoints USING btree (created_by)` |
| inbound_webhook_endpoints_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX inbound_webhook_endpoints_pkey ON public.inbound_webhook_endpoints USING btree (id)` |
| inbound_webhook_endpoints_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX inbound_webhook_endpoints_slug_key ON public.inbound_webhook_endpoints USING btree (slug)` |


## Policies (RLS)

### `Admins manage inbound_webhook_endpoints`

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
| trg_inbound_webhook_endpoints_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
