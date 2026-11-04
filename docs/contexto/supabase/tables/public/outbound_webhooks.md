# public.outbound_webhooks

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `url` | `text` | não |  |  |  |
| 4 | `secret_ref` | `text` | sim |  |  |  |
| 5 | `events` | `text[]` | não | `ARRAY[]::text[]` |  |  |
| 6 | `active` | `boolean` | não | `true` |  |  |
| 7 | `retry_policy` | `jsonb` | não | `jsonb_build_object('max_attempts', 3, 'backoff_seconds', ARRAY[5, 30, 120])` |  |  |
| 8 | `description` | `text` | sim |  |  |  |
| 9 | `created_by` | `uuid` | não |  |  |  |
| 10 | `last_triggered_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `total_success` | `integer` | não | `0` |  |  |
| 12 | `total_failure` | `integer` | não | `0` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `consecutive_failures` | `integer` | não | `0` |  |  |
| 16 | `auto_disabled_at` | `timestamp with time zone` | sim |  |  |  |
| 17 | `auto_disabled_reason` | `text` | sim |  |  |  |
| 18 | `signature_header` | `text` | não | `'x-webhook-signature'::text` |  |  |
| 19 | `contract_version` | `text` | não | `'v1'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| outbound_webhooks_contract_version_check | CHECK | `CHECK (contract_version = ANY (ARRAY['v1'::text, 'v2'::text]))` |  |  | sim |
| outbound_webhooks_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| outbound_webhooks_signature_header_check | CHECK | `CHECK (signature_header = ANY (ARRAY['X-Signature-256'::text, 'x-webhook-signature'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.webhook_deliveries | webhook_deliveries_webhook_id_fkey | webhook_id | CASCADE |
| public.webhook_delivery_locks | fk_webhook_delivery_locks_webhook | webhook_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_outbound_webhooks_active_events | gin | events | não | sim | `(active = true)` | `CREATE INDEX idx_outbound_webhooks_active_events ON public.outbound_webhooks USING gin (events) WHERE (active = true)` |
| outbound_webhooks_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX outbound_webhooks_pkey ON public.outbound_webhooks USING btree (id)` |


## Policies (RLS)

### `Admins manage outbound_webhooks`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
