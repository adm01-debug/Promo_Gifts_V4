# public.webhook_delivery_locks

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
| 1 | `webhook_id` | `uuid` | não |  |  |  |
| 2 | `payload_hash` | `text` | não |  |  |  |
| 3 | `claimed_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| fk_webhook_delivery_locks_webhook | FOREIGN KEY | `FOREIGN KEY (webhook_id) REFERENCES outbound_webhooks(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| pk_webhook_delivery_locks | PRIMARY KEY | `PRIMARY KEY (webhook_id, payload_hash)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_webhook_deliveries_hash | btree | webhook_id, payload_hash | não | sim | `(payload_hash IS NOT NULL)` | `CREATE INDEX idx_webhook_deliveries_hash ON public.webhook_delivery_locks USING btree (webhook_id, payload_hash) WHERE (payload_hash IS NOT NULL)` |
| idx_webhook_delivery_locks_claimed_at | btree | claimed_at | não | sim |  | `CREATE INDEX idx_webhook_delivery_locks_claimed_at ON public.webhook_delivery_locks USING btree (claimed_at)` |
| pk_webhook_delivery_locks | btree | webhook_id, payload_hash | sim | sim |  | `CREATE UNIQUE INDEX pk_webhook_delivery_locks ON public.webhook_delivery_locks USING btree (webhook_id, payload_hash)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
