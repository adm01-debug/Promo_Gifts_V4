# public.quote_history

> Audit trail de mudanças em orçamentos. Schema migrations/20251220131225 (com policies adaptadas: quotes.created_by/assigned_to em vez de seller_id que não existe).

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
| 2 | `quote_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `action` | `text` | não |  |  |  |
| 5 | `field_changed` | `text` | sim |  |  |  |
| 6 | `old_value` | `text` | sim |  |  |  |
| 7 | `new_value` | `text` | sim |  |  |  |
| 8 | `description` | `text` | não |  |  |  |
| 9 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_history_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_history_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_history_quote_id_ts | btree | quote_id, created_at | não | sim | `(quote_id IS NOT NULL)` | `CREATE INDEX idx_quote_history_quote_id_ts ON public.quote_history USING btree (quote_id, created_at DESC) WHERE (quote_id IS NOT NULL)` |
| idx_quote_history_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_quote_history_user_id ON public.quote_history USING btree (user_id)` |
| quote_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_history_pkey ON public.quote_history USING btree (id)` |


## Policies (RLS)

### `Sellers and coord create quote_history`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))))` |

### `Sellers and coord view quote_history`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (EXISTS ( SELECT 1    FROM quotes q   WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (q.assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | INSERT, SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
