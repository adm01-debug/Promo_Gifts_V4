# public.quotes

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
| usada por views | public.bi_quotes_summary, public.v_db_health_audit, public.v_quote_seller_kpis, public.v_system_health_dashboard |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `quote_number` | `text` | não |  |  |  |
| 3 | `client_id` | `uuid` | sim |  |  |  |
| 4 | `client_name` | `text` | não |  |  |  |
| 5 | `created_by` | `uuid` | sim |  |  |  |
| 6 | `assigned_to` | `uuid` | sim |  |  |  |
| 7 | `status` | `text` | sim | `'draft'::text` |  |  |
| 8 | `stage` | `text` | sim | `'elaboration'::text` |  |  |
| 9 | `priority` | `text` | sim | `'normal'::text` |  |  |
| 10 | `subtotal` | `numeric(10,2)` | sim | `0` |  |  |
| 12 | `discount_amount` | `numeric(10,2)` | sim | `0` |  |  |
| 13 | `shipping_cost` | `numeric(10,2)` | sim | `0` |  |  |
| 14 | `tax_amount` | `numeric(10,2)` | sim | `0` |  |  |
| 15 | `total` | `numeric(10,2)` | sim | `0` |  |  |
| 16 | `valid_until` | `date` | sim |  |  |  |
| 17 | `estimated_delivery_days` | `integer` | sim |  |  |  |
| 18 | `notes` | `text` | sim |  |  |  |
| 19 | `internal_notes` | `text` | sim |  |  |  |
| 20 | `payment_terms` | `text` | sim |  |  |  |
| 22 | `tags` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 23 | `approval_token` | `text` | sim |  |  |  |
| 24 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 25 | `approved_by_client_name` | `text` | sim |  |  |  |
| 26 | `client_feedback` | `text` | sim |  |  |  |
| 27 | `viewed_at` | `timestamp with time zone` | sim |  |  |  |
| 28 | `view_count` | `integer` | sim | `0` |  |  |
| 29 | `last_sent_at` | `timestamp with time zone` | sim |  |  |  |
| 30 | `converted_to_order_id` | `uuid` | sim |  |  |  |
| 31 | `converted_at` | `timestamp with time zone` | sim |  |  |  |
| 32 | `conversion_notes` | `text` | sim |  |  |  |
| 33 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 34 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 35 | `organization_id` | `uuid` | não |  |  |  |
| 36 | `seller_id` | `uuid` | não |  |  | [Etapa 7] Espelho de created_by. Hook applySellerScope filtra por seller_id por padrão. Sincronizado via trigger. |
| 37 | `discount_percent` | `numeric(5,2)` | sim | `0` |  | Desconto exposto ao cliente (% sobre subtotal). Coexiste com discount_percentage legacy — código novo usa discount_percent. |
| 38 | `negotiation_markup_percent` | `numeric(5,2)` | sim | `0` |  | Markup INTERNO 0–50%. Infla subtotal apresentado para criar margem psicológica de desconto. NUNCA exposto ao cliente. |
| 39 | `real_subtotal` | `numeric(10,2)` | sim | `0` |  | Subtotal real (sem markup de negociação). Calculado por trigger no cutover. Read-only. |
| 40 | `real_discount_percent` | `numeric(5,2)` | sim | `0` |  | Desconto efetivo real vs real_subtotal. Validado contra alçada do vendedor. Read-only. |
| 41 | `version` | `integer` | não | `1` |  |  |
| 42 | `client_email` | `text` | sim |  |  |  |
| 43 | `client_phone` | `text` | sim |  |  |  |
| 44 | `client_company` | `text` | sim |  |  |  |
| 45 | `client_cnpj` | `text` | sim |  |  |  |
| 46 | `delivery_time` | `text` | sim |  |  |  |
| 47 | `shipping_type` | `text` | sim |  |  |  |
| 48 | `bitrix_deal_id` | `text` | sim |  |  |  |
| 49 | `bitrix_quote_id` | `text` | sim |  |  |  |
| 50 | `synced_to_bitrix` | `boolean` | não | `false` |  |  |
| 51 | `synced_at` | `timestamp with time zone` | sim |  |  |  |
| 52 | `client_response` | `text` | sim |  |  |  |
| 53 | `client_response_at` | `timestamp with time zone` | sim |  |  |  |
| 54 | `client_response_notes` | `text` | sim |  |  |  |
| 55 | `shipping_method` | `text` | sim |  |  |  |
| 56 | `parent_quote_id` | `uuid` | sim |  |  | Wave 3.2.C 2026-05-22: versionamento de orcamento, FK auto-referente. |
| 57 | `is_latest_version` | `boolean` | não | `true` |  | Wave 3.2.C 2026-05-22: marca a versao mais recente para queries (paridade Lovable). |
| 58 | `payment_method` | `text` | sim |  |  |  |
| 59 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 60 | `contact_id` | `uuid` | sim |  |  | ID do contato no CRM externo (pgxfvjmuubtbowutlide). Sem FK — banco externo. |
| 61 | `discount_approval_status` | `text` | sim |  |  |  |
| 62 | `discount_approved_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_quotes_discount_approval_status | CHECK | `CHECK (discount_approval_status IS NULL OR (discount_approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))` |  |  | sim |
| quotes_approval_token_key | UNIQUE | `UNIQUE (approval_token)` |  |  | sim |
| quotes_assigned_to_fkey | FOREIGN KEY | `FOREIGN KEY (assigned_to) REFERENCES profiles(user_id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quotes_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quotes_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quotes_parent_quote_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_quote_id) REFERENCES quotes(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quotes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quotes_quote_number_key | UNIQUE | `UNIQUE (quote_number)` |  |  | sim |
| quotes_seller_id_fkey | FOREIGN KEY | `FOREIGN KEY (seller_id) REFERENCES profiles(user_id)` | NO ACTION | NO ACTION | sim |
| trg_quotes_discount_integrity_deferred | t | `TRIGGER DEFERRABLE INITIALLY DEFERRED` |  |  | sim |
| valid_discount_amount_nonnegative | CHECK | `CHECK (discount_amount IS NULL OR discount_amount >= 0::numeric)` |  |  | sim |
| valid_discount_percent_range | CHECK | `CHECK (discount_percent IS NULL OR discount_percent >= 0::numeric AND discount_percent <= 100::numeric)` |  |  | sim |
| valid_negotiation_markup_range | CHECK | `CHECK (negotiation_markup_percent IS NULL OR negotiation_markup_percent >= 0::numeric AND negotiation_markup_percent <= 50::numeric)` |  |  | sim |
| valid_priority | CHECK | `CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))` |  |  | sim |
| valid_quote_status | CHECK | `CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'pending_approval'::text, 'sent'::text, 'viewed'::text, 'approved'::text, 'converted'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text]))` |  |  | sim |
| valid_real_discount_pct_max | CHECK | `CHECK (real_discount_percent IS NULL OR real_discount_percent <= 100::numeric)` |  |  | sim |
| valid_shipping_cost_nonnegative | CHECK | `CHECK (shipping_cost IS NULL OR shipping_cost >= 0::numeric)` |  |  | sim |
| valid_shipping_type | CHECK | `CHECK (shipping_type IS NULL OR (shipping_type = ANY (ARRAY['cif'::text, 'fob'::text, 'fob_pre'::text])))` |  |  | sim |
| valid_subtotal_nonnegative | CHECK | `CHECK (subtotal IS NULL OR subtotal >= 0::numeric)` |  |  | sim |
| valid_total_nonnegative | CHECK | `CHECK (total IS NULL OR total >= 0::numeric)` |  |  | sim |
| valid_until_not_expired_for_active | CHECK | `CHECK ((status = ANY (ARRAY['draft'::text, 'expired'::text, 'cancelled'::text, 'rejected'::text, 'converted'::text])) OR valid_until IS NULL OR valid_until >= CURRENT_DATE)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.discount_approval_requests | discount_approval_requests_quote_id_fkey | quote_id | CASCADE |
| public.kit_quote_requests | kit_quote_requests_quote_id_fkey | quote_id | RESTRICT |
| public.quote_history | quote_history_quote_id_fkey | quote_id | CASCADE |
| public.quote_items | quote_items_quote_id_fkey | quote_id | CASCADE |
| public.quote_versions | quote_versions_quote_id_fkey | quote_id | CASCADE |
| public.quotes | quotes_parent_quote_id_fkey | parent_quote_id | SET NULL |
| public.webhook_dispatcher_log | webhook_dispatcher_log_quote_id_fkey | quote_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quotes_assigned_to | btree | assigned_to | não | sim |  | `CREATE INDEX idx_quotes_assigned_to ON public.quotes USING btree (assigned_to)` |
| idx_quotes_client_id | btree | client_id | não | sim | `(client_id IS NOT NULL)` | `CREATE INDEX idx_quotes_client_id ON public.quotes USING btree (client_id) WHERE (client_id IS NOT NULL)` |
| idx_quotes_created_at_desc | btree | created_at | não | sim |  | `CREATE INDEX idx_quotes_created_at_desc ON public.quotes USING btree (created_at DESC)` |
| idx_quotes_created_at_status | btree | created_at, status, seller_id | não | sim | `(status = ANY (ARRAY['approved'::text, 'converted'::text]))` | `CREATE INDEX idx_quotes_created_at_status ON public.quotes USING btree (created_at, status, seller_id) WHERE (status = ANY (ARRAY['approved'::text, 'converted'::text]))` |
| idx_quotes_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_quotes_created_by ON public.quotes USING btree (created_by)` |
| idx_quotes_discount_approval_status | btree | discount_approval_status | não | sim | `(discount_approval_status IS NOT NULL)` | `CREATE INDEX idx_quotes_discount_approval_status ON public.quotes USING btree (discount_approval_status) WHERE (discount_approval_status IS NOT NULL)` |
| idx_quotes_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_quotes_organization_id ON public.quotes USING btree (organization_id)` |
| idx_quotes_parent_quote_id | btree | parent_quote_id | não | sim |  | `CREATE INDEX idx_quotes_parent_quote_id ON public.quotes USING btree (parent_quote_id)` |
| idx_quotes_seller_org_status | btree | seller_id, organization_id, status | não | sim |  | `CREATE INDEX idx_quotes_seller_org_status ON public.quotes USING btree (seller_id, organization_id, status)` |
| idx_quotes_valid_until | btree | valid_until | não | sim | `(status <> ALL (ARRAY['expired'::text, 'cancelled'::text, 'converted'::text, 'rejected'::text, 'draft'::text]))` | `CREATE INDEX idx_quotes_valid_until ON public.quotes USING btree (valid_until) WHERE (status <> ALL (ARRAY['expired'::text, 'cancelled'::text, 'converted'::text, 'rejected'::text, 'draft'::text]))` |
| quotes_approval_token_key | btree | approval_token | sim | sim |  | `CREATE UNIQUE INDEX quotes_approval_token_key ON public.quotes USING btree (approval_token)` |
| quotes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quotes_pkey ON public.quotes USING btree (id)` |
| quotes_quote_number_key | btree | quote_number | sim | sim |  | `CREATE UNIQUE INDEX quotes_quote_number_key ON public.quotes USING btree (quote_number)` |


## Policies (RLS)

### `org_admins_delete_quotes`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `org_members_create_quotes`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |

### `quotes_select_scope`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `quotes_update_scope`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK | `(user_is_org_member(organization_id) AND (is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (created_by = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR (assigned_to = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_quote_number | BEFORE | INSERT | ROW | enabled | public.generate_quote_number |
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_audit_quotes | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_row_change |
| trg_notify_quote_status_change | AFTER | UPDATE | ROW | enabled | public.notify_quote_status_change |
| trg_quotes_calc_real_values | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_quotes_calc_real_values |
| trg_quotes_discount_integrity_deferred | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_deferred_quote_discount_integrity |
| trg_quotes_immutability | BEFORE | UPDATE | ROW | enabled | public.fn_quotes_enforce_immutability |
| trg_quotes_notify_champions | AFTER | UPDATE | ROW | enabled | public.fn_notify_champions_on_quote_status |
| trg_quotes_sync_seller | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_quotes_sync_seller |
| trg_quotes_validate_discount | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_quotes_validate_discount |
| trg_quotes_version | BEFORE | UPDATE | ROW | enabled | public.increment_quote_version |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
