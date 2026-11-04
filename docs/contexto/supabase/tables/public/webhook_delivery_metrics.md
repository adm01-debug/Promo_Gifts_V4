# public.webhook_delivery_metrics

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
| 2 | `request_id` | `text` | sim |  |  |  |
| 3 | `event_type` | `text` | sim |  |  |  |
| 4 | `source` | `text` | sim |  |  |  |
| 5 | `direction` | `text` | sim | `'inbound'::text` |  |  |
| 6 | `endpoint` | `text` | sim |  |  |  |
| 7 | `http_status` | `integer` | sim |  |  |  |
| 8 | `duration_ms` | `integer` | sim |  |  |  |
| 9 | `attempt` | `integer` | sim | `1` |  |  |
| 10 | `success` | `boolean` | sim | `true` |  |  |
| 11 | `error_class` | `text` | sim |  |  |  |
| 12 | `error_message` | `text` | sim |  |  |  |
| 13 | `payload_bytes` | `integer` | sim |  |  |  |
| 14 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 15 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| webhook_delivery_metrics_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| webhook_delivery_metrics_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX webhook_delivery_metrics_pkey ON public.webhook_delivery_metrics USING btree (id)` |


## Policies (RLS)

### `wdm_insert_service_role`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | service_role |
| USING |  |
| WITH CHECK | `true` |

### `wdm_select_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
