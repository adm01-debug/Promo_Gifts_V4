# public.webhook_outbox

> FIX QBP-05 (2026-06-22): Outbox assíncrono para webhooks de orçamento. Substitui http_post() síncrono no trigger dispatch_quote_webhook_event, eliminando latência de até 5s por transação de orçamento.

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
| 2 | `event` | `text` | não |  |  |  |
| 3 | `payload` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 4 | `status` | `text` | não | `'pending'::text` |  |  |
| 5 | `attempts` | `integer` | não | `0` |  |  |
| 6 | `max_attempts` | `integer` | não | `3` |  |  |
| 7 | `next_attempt_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_outbox_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_outbox_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text, 'dead_letter'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_outbox_pending | btree | next_attempt_at | não | sim | `(status = ANY (ARRAY['pending'::text, 'processing'::text]))` | `CREATE INDEX idx_webhook_outbox_pending ON public.webhook_outbox USING btree (next_attempt_at) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]))` |
| webhook_outbox_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_outbox_pkey ON public.webhook_outbox USING btree (id)` |


## Policies (RLS)

### `webhook_outbox_service_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
