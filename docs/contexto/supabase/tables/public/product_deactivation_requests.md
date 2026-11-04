# public.product_deactivation_requests

> Solicitações de desativação de produtos — requerem aprovação de usuário credenciado (admin+). Regra: produto NUNCA é desativado automaticamente pelo pipeline.

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
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `supplier_id` | `uuid` | sim |  |  |  |
| 4 | `supplier_reference` | `text` | sim |  |  |  |
| 5 | `product_name` | `text` | sim |  |  |  |
| 6 | `reason` | `text` | não |  |  |  |
| 7 | `reason_code` | `text` | não | `'manual'::text` |  |  |
| 8 | `requested_by` | `uuid` | sim |  |  |  |
| 9 | `requested_by_name` | `text` | sim |  |  |  |
| 10 | `requested_at` | `timestamp with time zone` | não | `now()` |  |  |
| 11 | `approved_by` | `uuid` | sim |  |  |  |
| 12 | `approved_by_name` | `text` | sim |  |  |  |
| 13 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `rejected_by` | `uuid` | sim |  |  |  |
| 15 | `rejected_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `rejection_reason` | `text` | sim |  |  |  |
| 17 | `executed_at` | `timestamp with time zone` | sim |  |  |  |
| 18 | `status` | `text` | não | `'pending'::text` |  |  |
| 19 | `notes` | `text` | sim |  |  |  |
| 20 | `organization_id` | `uuid` | sim | `'5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid` |  |  |
| 21 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_deactivation_requests_approved_by_fkey | FOREIGN KEY | `FOREIGN KEY (approved_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| product_deactivation_requests_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_deactivation_requests_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_deactivation_requests_reason_code_check | CHECK | `CHECK (reason_code = ANY (ARRAY['manual'::text, 'duplicate'::text, 'discontinued'::text, 'quality'::text, 'legal'::text, 'catalog_cleanup'::text]))` |  |  | sim |
| product_deactivation_requests_rejected_by_fkey | FOREIGN KEY | `FOREIGN KEY (rejected_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| product_deactivation_requests_requested_by_fkey | FOREIGN KEY | `FOREIGN KEY (requested_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| product_deactivation_requests_status_check | CHECK | `CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'executed'::text, 'cancelled'::text]))` |  |  | sim |
| product_deactivation_requests_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_deactivation_tokens | _deactivation_auth_request_id_fkey | request_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pdr_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_pdr_product_id ON public.product_deactivation_requests USING btree (product_id)` |
| idx_product_deactivation_requests_approved_by | btree | approved_by | não | sim |  | `CREATE INDEX idx_product_deactivation_requests_approved_by ON public.product_deactivation_requests USING btree (approved_by)` |
| idx_product_deactivation_requests_rejected_by | btree | rejected_by | não | sim |  | `CREATE INDEX idx_product_deactivation_requests_rejected_by ON public.product_deactivation_requests USING btree (rejected_by)` |
| idx_product_deactivation_requests_requested_by | btree | requested_by | não | sim |  | `CREATE INDEX idx_product_deactivation_requests_requested_by ON public.product_deactivation_requests USING btree (requested_by)` |
| idx_product_deactivation_requests_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_product_deactivation_requests_supplier_id ON public.product_deactivation_requests USING btree (supplier_id)` |
| product_deactivation_requests_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_deactivation_requests_pkey ON public.product_deactivation_requests USING btree (id)` |


## Policies (RLS)

### `authenticated_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `service_role_full`

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
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
