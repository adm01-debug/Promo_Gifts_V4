# public.discount_approval_audit

> Trilha de auditoria de aprovações de desconto. Reconciliada em 2026-06-25 (migration Lovable 20260625161934 nunca aplicou em produção). Escrita apenas via trigger definer.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `request_id` | `uuid` | não |  |  |  |
| 3 | `quote_id` | `uuid` | não |  |  |  |
| 4 | `actor_id` | `uuid` | sim |  |  |  |
| 5 | `actor_role` | `text` | não |  |  |  |
| 6 | `event` | `text` | não |  |  |  |
| 7 | `requested_discount_percent` | `numeric` | sim |  |  |  |
| 8 | `max_allowed_percent` | `numeric` | sim |  |  |  |
| 9 | `real_discount_percent` | `numeric` | sim |  |  |  |
| 10 | `admin_notes` | `text` | sim |  |  |  |
| 11 | `seller_notes` | `text` | sim |  |  |  |
| 12 | `metadata` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| daa_max_allowed_percent_range | CHECK | `CHECK (max_allowed_percent IS NULL OR max_allowed_percent >= 0::numeric AND max_allowed_percent <= 100::numeric)` |  |  | sim |
| daa_real_discount_percent_range | CHECK | `CHECK (real_discount_percent IS NULL OR real_discount_percent >= 0::numeric AND real_discount_percent <= 100::numeric)` |  |  | sim |
| daa_requested_percent_range | CHECK | `CHECK (requested_discount_percent IS NULL OR requested_discount_percent >= 0::numeric AND requested_discount_percent <= 100::numeric)` |  |  | sim |
| discount_approval_audit_actor_id_fkey | FOREIGN KEY | `FOREIGN KEY (actor_id) REFERENCES profiles(user_id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| discount_approval_audit_actor_role_check | CHECK | `CHECK (actor_role = ANY (ARRAY['seller'::text, 'admin'::text, 'supervisor'::text, 'system'::text]))` |  |  | sim |
| discount_approval_audit_event_check | CHECK | `CHECK (event = ANY (ARRAY['requested'::text, 'approved'::text, 'rejected'::text, 'expired'::text]))` |  |  | sim |
| discount_approval_audit_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| discount_approval_audit_request_id_fkey | FOREIGN KEY | `FOREIGN KEY (request_id) REFERENCES discount_approval_requests(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| discount_approval_audit_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX discount_approval_audit_pkey ON public.discount_approval_audit USING btree (id)` |
| idx_daa_request_created | btree | request_id, created_at | não | sim |  | `CREATE INDEX idx_daa_request_created ON public.discount_approval_audit USING btree (request_id, created_at DESC)` |
| idx_discount_approval_audit_actor_id | btree | actor_id | não | sim |  | `CREATE INDEX idx_discount_approval_audit_actor_id ON public.discount_approval_audit USING btree (actor_id)` |


## Policies (RLS)

### `daa_no_direct_write_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK |  |

### `daa_no_direct_write_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `false` |

### `daa_no_direct_write_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `false` |
| WITH CHECK | `false` |

### `daa_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(can_view_all_sales() OR has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'supervisor'::app_role) OR (EXISTS ( SELECT 1    FROM discount_approval_requests r   WHERE ((r.id = discount_approval_audit.request_id) AND (r.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
