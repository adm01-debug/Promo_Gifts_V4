# public.crm_callback_events

> Auditoria + chave de idempotência dos callbacks recebidos do CRM Promo Champions V2 via edge function receive-crm-callback.

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
| usada por views | public.v_crm_callback_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `external_quote_id` | `uuid` | não |  |  |  |
| 3 | `crm_quote_id` | `uuid` | sim |  |  |  |
| 4 | `event_type` | `text` | não |  |  |  |
| 5 | `occurred_at` | `timestamp with time zone` | não |  |  |  |
| 6 | `payload` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 7 | `result` | `text` | não |  |  |  |
| 8 | `error_message` | `text` | sim |  |  |  |
| 9 | `received_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| crm_callback_events_event_type_chk | CHECK | `CHECK (event_type = ANY (ARRAY['approved'::text, 'rejected'::text, 'order_created'::text, 'sent_to_client'::text, 'expired'::text]))` |  |  | sim |
| crm_callback_events_idempotency_uk | UNIQUE | `UNIQUE (external_quote_id, event_type, occurred_at)` |  |  | sim |
| crm_callback_events_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| crm_callback_events_result_chk | CHECK | `CHECK (result = ANY (ARRAY['applied'::text, 'duplicate_ignored'::text, 'error'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| crm_callback_events_idempotency_uk | btree | external_quote_id, event_type, occurred_at | sim | sim |  | `CREATE UNIQUE INDEX crm_callback_events_idempotency_uk ON public.crm_callback_events USING btree (external_quote_id, event_type, occurred_at)` |
| crm_callback_events_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX crm_callback_events_pkey ON public.crm_callback_events USING btree (id)` |
| idx_ccev_occurred_at | btree | occurred_at | não | sim |  | `CREATE INDEX idx_ccev_occurred_at ON public.crm_callback_events USING btree (occurred_at DESC)` |
| idx_crm_callback_events_result_received | btree | result, received_at | não | sim |  | `CREATE INDEX idx_crm_callback_events_result_received ON public.crm_callback_events USING btree (result, received_at DESC)` |
| idx_crm_callback_events_type | btree | event_type | não | sim |  | `CREATE INDEX idx_crm_callback_events_type ON public.crm_callback_events USING btree (event_type)` |


## Policies (RLS)

### `Admins can view crm callback events`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role)` |
| WITH CHECK |  |

### `Service role full access`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
