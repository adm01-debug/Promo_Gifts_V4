# public.discount_approval_requests

> Workflow de aprovação de desconto acima do limite. Vendedor solicita, supervisor+ aprova/rejeita. Schema oficial extraído de useDiscountApproval.ts.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | sim |
| replica identity | full |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `quote_id` | `uuid` | não |  |  |  |
| 3 | `seller_id` | `uuid` | não |  |  |  |
| 4 | `requested_discount_percent` | `numeric(5,2)` | não |  |  |  |
| 5 | `max_allowed_percent` | `numeric(5,2)` | não |  |  |  |
| 6 | `status` | `text` | não | `'pending'::text` |  |  |
| 7 | `admin_id` | `uuid` | sim |  |  |  |
| 8 | `admin_notes` | `text` | sim |  |  |  |
| 9 | `seller_notes` | `text` | sim |  |  |  |
| 10 | `responded_at` | `timestamp with time zone` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `valid_until` | `timestamp with time zone` | sim |  |  |  |
| 14 | `quote_snapshot_hash` | `text` | sim |  |  |  |
| 15 | `version` | `integer` | não | `1` |  | Optimistic locking: incrementado por trg_discount_approval_version a cada UPDATE com mudança real. Cliente concorrente deve enviar WHERE version = <esperado> e tratar 0 linhas afetadas como conflito. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| dar_valid_until_required_when_approved | CHECK | `CHECK (status <> 'approved'::text OR valid_until IS NOT NULL)` |  |  | sim |
| discount_approval_requests_admin_id_fkey | FOREIGN KEY | `FOREIGN KEY (admin_id) REFERENCES profiles(user_id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| discount_approval_requests_max_allowed_percent_check | CHECK | `CHECK (max_allowed_percent >= 0::numeric AND max_allowed_percent <= 100::numeric)` |  |  | sim |
| discount_approval_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| discount_approval_requests_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| discount_approval_requests_requested_discount_percent_check | CHECK | `CHECK (requested_discount_percent >= 0::numeric AND requested_discount_percent <= 100::numeric)` |  |  | sim |
| discount_approval_requests_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES profiles(user_id)` | NO ACTION | NO ACTION | sim |
| discount_approval_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text]))` |  |  | sim |
| trg_dar_quote_integrity_deferred | t | `TRIGGER DEFERRABLE INITIALLY DEFERRED` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.discount_approval_audit | discount_approval_audit_request_id_fkey | request_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| discount_approval_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX discount_approval_requests_pkey ON public.discount_approval_requests USING btree (id)` |
| idx_dar_pending | btree | created_at | não | sim | `(status = 'pending'::text)` | `CREATE INDEX idx_dar_pending ON public.discount_approval_requests USING btree (created_at DESC) WHERE (status = 'pending'::text)` |
| idx_dar_quote_id | btree | quote_id | não | sim |  | `CREATE INDEX idx_dar_quote_id ON public.discount_approval_requests USING btree (quote_id)` |
| idx_dar_status | btree | status, created_at | não | sim |  | `CREATE INDEX idx_dar_status ON public.discount_approval_requests USING btree (status, created_at DESC)` |
| idx_discount_approval_requests_admin_id | btree | admin_id | não | sim |  | `CREATE INDEX idx_discount_approval_requests_admin_id ON public.discount_approval_requests USING btree (admin_id)` |
| idx_discount_approval_requests_seller_id | btree | seller_id | não | sim |  | `CREATE INDEX idx_discount_approval_requests_seller_id ON public.discount_approval_requests USING btree (seller_id)` |
| uniq_dar_quote_pending | btree | quote_id | sim | sim | `(status = 'pending'::text)` | `CREATE UNIQUE INDEX uniq_dar_quote_pending ON public.discount_approval_requests USING btree (quote_id) WHERE (status = 'pending'::text)` |


## Policies (RLS)

### `dar_delete_dev_only`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `dar_insert_scope`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `dar_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `dar_update_scope`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_audit_discount_approval | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_audit_discount_approval |
| trg_audit_discount_approval_requests | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_row_change |
| trg_dar_check_valid_until_future | BEFORE | UPDATE | ROW | enabled | public.fn_dar_check_valid_until_future |
| trg_dar_enforce_initial_status | BEFORE | INSERT | ROW | enabled | public.fn_dar_enforce_initial_status |
| trg_dar_enforce_seller_id | BEFORE | INSERT | ROW | enabled | public.fn_dar_enforce_seller_id |
| trg_dar_forbid_reopen | BEFORE | UPDATE | ROW | enabled | public.fn_dar_forbid_reopen |
| trg_dar_quote_integrity_deferred | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_deferred_dar_quote_integrity |
| trg_dar_set_snapshot_hash | BEFORE | INSERT | ROW | enabled | public.fn_dar_set_snapshot_hash |
| trg_dar_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |
| trg_discount_approval_version | BEFORE | UPDATE | ROW | enabled | public.increment_discount_approval_version |
| trg_notify_discount_approval | AFTER | INSERT OR UPDATE | ROW | enabled | public.notify_discount_approval_request |
| trg_sync_quote_dar | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.sync_quote_discount_approval |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
