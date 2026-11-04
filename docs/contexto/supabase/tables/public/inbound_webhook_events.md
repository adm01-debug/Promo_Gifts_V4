# public.inbound_webhook_events

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `endpoint_id` | `uuid` | sim |  |  |  |
| 3 | `event_type` | `text` | não |  |  |  |
| 4 | `payload` | `jsonb` | não |  |  |  |
| 5 | `headers` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 6 | `ip_address` | `text` | sim |  |  |  |
| 7 | `signature_valid` | `boolean` | sim |  |  |  |
| 8 | `processed` | `boolean` | não | `false` |  |  |
| 9 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `contract_version` | `text` | não | `'1'::text` |  | Versao de contrato negociada via header accept-version. Default 1 (compat com payloads legados). |
| 13 | `idempotency_key` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| inbound_webhook_events_endpoint_id_fkey | FOREIGN KEY | `FOREIGN KEY (endpoint_id) REFERENCES inbound_webhook_endpoints(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| inbound_webhook_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_idempotency | btree | endpoint_id, idempotency_key | sim | sim | `(idempotency_key IS NOT NULL)` | `CREATE UNIQUE INDEX idx_webhook_idempotency ON public.inbound_webhook_events USING btree (endpoint_id, idempotency_key) WHERE (idempotency_key IS NOT NULL)` |
| inbound_webhook_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX inbound_webhook_events_pkey ON public.inbound_webhook_events USING btree (id)` |


## Policies (RLS)

### `Admins delete inbound_webhook_events`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `Admins read inbound_webhook_events`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
