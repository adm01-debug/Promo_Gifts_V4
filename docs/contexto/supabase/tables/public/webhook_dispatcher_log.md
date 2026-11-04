# public.webhook_dispatcher_log

> Log de deliveries do trigger trg_quotes_notify_champions → Champions V2. Criado em 2026-07-10. ANTI-REGRESSÃO v1.

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
| usada por views | public.v_webhook_delivery_stats |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `trigger_event` | `text` | não |  |  |  |
| 3 | `quote_id` | `uuid` | sim |  |  |  |
| 4 | `quote_status` | `text` | sim |  |  |  |
| 5 | `seller_id` | `uuid` | sim |  |  |  |
| 6 | `target_url` | `text` | não |  |  |  |
| 7 | `http_status` | `smallint` | sim |  |  |  |
| 8 | `response_body` | `text` | sim |  |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `payload_hash` | `text` | sim |  |  |  |
| 11 | `correlation_key` | `text` | sim |  |  |  |
| 12 | `duration_ms` | `integer` | sim |  |  |  |
| 13 | `fired_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `responded_at` | `timestamp with time zone` | sim |  |  |  |
| 15 | `delivery_status` | `text` | não | `'pending'::text` |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_dispatcher_log_delivery_status_check | CHECK | `CHECK (delivery_status = ANY (ARRAY['pending'::text, 'delivered'::text, 'failed'::text, 'timeout'::text]))` |  |  | sim |
| webhook_dispatcher_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| webhook_dispatcher_log_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_dispatcher_log_delivery_status | btree | delivery_status, fired_at | não | sim |  | `CREATE INDEX idx_webhook_dispatcher_log_delivery_status ON public.webhook_dispatcher_log USING btree (delivery_status, fired_at DESC)` |
| idx_webhook_dispatcher_log_fired_at | btree | fired_at | não | sim |  | `CREATE INDEX idx_webhook_dispatcher_log_fired_at ON public.webhook_dispatcher_log USING btree (fired_at DESC)` |
| idx_webhook_dispatcher_log_http_status | btree | http_status, fired_at | não | sim |  | `CREATE INDEX idx_webhook_dispatcher_log_http_status ON public.webhook_dispatcher_log USING btree (http_status, fired_at DESC)` |
| idx_webhook_dispatcher_log_quote_id | btree | quote_id | não | sim | `(quote_id IS NOT NULL)` | `CREATE INDEX idx_webhook_dispatcher_log_quote_id ON public.webhook_dispatcher_log USING btree (quote_id) WHERE (quote_id IS NOT NULL)` |
| webhook_dispatcher_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_dispatcher_log_pkey ON public.webhook_dispatcher_log USING btree (id)` |


## Policies (RLS)

### `Admins podem ler dispatcher_log`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM profiles   WHERE ((profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (profiles.role = 'admin'::text))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
