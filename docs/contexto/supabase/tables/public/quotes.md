# public.quotes

> Orçamentos comerciais e seu ciclo de vida: status operacional, etapa de funil, itens, condições, aprovação de desconto e conversão em pedido. Os itens ficam em public.quote_items. Subtotais reais e apresentados diferenciam markup interno; frete e impostos são campos separados.

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
| 8 | `stage` | `text` | sim | `'elaboration'::text` |  | Etapa comercial recomendada do funil, distinta de quotes.status (estado operacional). Vocabulário recomendado: elaboration (preparação; valor padrão atual), internal_approval (aprovação interna), sent_to_client (enviado ao cliente), negotiation (negociação/revisões), won (ganho; normalmente aprovado ou convertido em pedido) e lost (encerrado sem conversão). Documentação apenas: a coluna não possui CHECK e valores adicionais não são bloqueados pelo banco. |
| 9 | `priority` | `text` | sim | `'normal'::text` |  |  |
| 10 | `subtotal` | `numeric(10,2)` | sim | `0` |  | Subtotal comercial dos produtos/itens do orçamento em BRL (reais, com centavos; não centavos inteiros). Exclui frete e impostos, registrados separadamente. O subtotal apresentado pode refletir negotiation_markup_percent; real_subtotal registra a base interna sem esse markup. Convenção documental: subtotal antes do desconto global do orçamento. |
| 12 | `discount_amount` | `numeric(10,2)` | sim | `0` |  | Valor monetário do desconto global do orçamento, em BRL (reais com centavos), separado de discount_percent. Convention: subtrair do subtotal ao obter o total; não inclui frete nem impostos. |
| 13 | `shipping_cost` | `numeric(10,2)` | sim | `0` |  | Custo de frete do orçamento em BRL (reais com centavos), mantido separado do subtotal dos produtos. |
| 14 | `tax_amount` | `numeric(10,2)` | sim | `0` |  | Valor total de impostos do orçamento em BRL (reais com centavos), mantido separado do subtotal dos produtos e do frete. |
| 15 | `total` | `numeric(10,2)` | sim | `0` |  | Total comercial recomendado em BRL (reais com centavos): subtotal - discount_amount + shipping_cost + tax_amount. Documentação da regra de negócio; a coluna não é gerada nem possui constraint que imponha essa fórmula. |
| 16 | `valid_until` | `date` | sim |  |  |  |
| 17 | `estimated_delivery_days` | `integer` | sim |  |  |  |
| 18 | `notes` | `text` | sim |  |  |  |
| 19 | `internal_notes` | `text` | sim |  |  |  |
| 20 | `payment_terms` | `text` | sim |  |  | Condição comercial de pagamento em texto livre. Formatos recomendados: avista, N dias, N/N/... dias (ex.: 30/60/90 dias) ou sob consulta. Manter condições negociadas legíveis; não é um enum e não possui CHECK. |
| 22 | `tags` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 23 | `approval_token` | `text` | sim |  |  |  |
| 24 | `approved_at` | `timestamp with time zone` | sim |  |  |  |
| 25 | `approved_by_client_name` | `text` | sim |  |  |  |
| 26 | `client_feedback` | `text` | sim |  |  |  |
| 27 | `viewed_at` | `timestamp with time zone` | sim |  |  |  |
| 28 | `view_count` | `integer` | sim | `0` |  |  |
| 29 | `last_sent_at` | `timestamp with time zone` | sim |  |  |  |
| 30 | `converted_to_order_id` | `uuid` | sim |  |  | Referência lógica ao pedido criado a partir deste orçamento. O schema atual não declara FK para converted_to_order_id; não presumir integridade referencial imposta pelo banco. |
| 31 | `converted_at` | `timestamp with time zone` | sim |  |  |  |
| 32 | `conversion_notes` | `text` | sim |  |  |  |
| 33 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 34 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 35 | `organization_id` | `uuid` | não |  |  |  |
| 36 | `seller_id` | `uuid` | não |  |  | [Etapa 7] Espelho de created_by. Hook applySellerScope filtra por seller_id por padrão. Sincronizado via trigger. |
| 37 | `discount_percent` | `numeric(5,2)` | sim | `0` |  | Percentual de desconto comercial apresentado ao cliente (0–100), aplicado sobre a base comercial do orçamento; distinto do valor monetário discount_amount e do markup interno negotiation_markup_percent. |
| 38 | `negotiation_markup_percent` | `numeric(5,2)` | sim | `0` |  | Percentual de markup interno de negociação. Pode elevar o subtotal apresentado; é interno, não deve ser exposto ao cliente nem confundido com imposto ou desconto. |
| 39 | `real_subtotal` | `numeric(10,2)` | sim | `0` |  | Subtotal real dos produtos em BRL, antes de qualquer markup de negociação. Campo interno calculado pela aplicação/trigger; não inclui frete nem impostos. |
| 40 | `real_discount_percent` | `numeric(5,2)` | sim | `0` |  | Percentual de desconto efetivo calculado em relação a real_subtotal; campo interno usado na validação da alçada do vendedor, distinto do desconto mostrado ao cliente. |
| 41 | `version` | `integer` | não | `1` |  |  |
| 42 | `client_email` | `text` | sim |  |  |  |
| 43 | `client_phone` | `text` | sim |  |  |  |
| 44 | `client_company` | `text` | sim |  |  |  |
| 45 | `client_cnpj` | `text` | sim |  |  |  |
| 46 | `delivery_time` | `text` | sim |  |  | Prazo estimado/prometido para exibição em texto: imediato, N dias úteis, N a M dias úteis ou sob consulta. Para prazo numérico usar estimated_delivery_days; não confundir com estimated_delivery_date do pedido. |
| 47 | `shipping_type` | `text` | sim |  |  | Modalidade/responsabilidade do frete. Valores permitidos pelo CHECK desta coluna: cif, fob, fob_pre (FOB com custo pré-negociado). Não confundir com shipping_method. |
| 48 | `bitrix_deal_id` | `text` | sim |  |  |  |
| 49 | `bitrix_quote_id` | `text` | sim |  |  |  |
| 50 | `synced_to_bitrix` | `boolean` | não | `false` |  |  |
| 51 | `synced_at` | `timestamp with time zone` | sim |  |  |  |
| 52 | `client_response` | `text` | sim |  |  |  |
| 53 | `client_response_at` | `timestamp with time zone` | sim |  |  |  |
| 54 | `client_response_notes` | `text` | sim |  |  |  |
| 55 | `shipping_method` | `text` | sim |  |  | Meio de transporte recomendado: correios, transportadora, retirada, motoboy, entrega_propria ou outro. Descreve como será a entrega; shipping_type descreve a responsabilidade/modalidade do frete. |
| 56 | `parent_quote_id` | `uuid` | sim |  |  | Wave 3.2.C 2026-05-22: versionamento de orcamento, FK auto-referente. |
| 57 | `is_latest_version` | `boolean` | não | `true` |  | Wave 3.2.C 2026-05-22: marca a versao mais recente para queries (paridade Lovable). |
| 58 | `payment_method` | `text` | sim |  |  | Forma de pagamento recomendada: pix, boleto, credit_card, bank_transfer, cash ou other; usar códigos minúsculos. Documentação apenas: coluna text sem CHECK, portanto não é enum fechado. |
| 59 | `sent_at` | `timestamp with time zone` | sim |  |  |  |
| 60 | `contact_id` | `uuid` | sim |  |  | ID do contato no CRM externo (pgxfvjmuubtbowutlide). Sem FK — banco externo. |
| 61 | `discount_approval_status` | `text` | sim |  |  |  |
| 62 | `discount_approved_at` | `timestamp with time zone` | sim |  |  |  |
| 63 | `freight_plan` | `jsonb` | sim |  |  | Plano de volumes do frete calculado no orÃ§amento (objeto JSON com version, itemsHash, computedAt, caixas e totais). NULL = orÃ§amento sem plano calculado. Objeto com menos de 256 KB. |
| 64 | `freight_mix_mode` | `text` | sim |  |  | Escolha do vendedor para o frete: misturar produtos na mesma caixa ou separar. NULL = sem escolha. Produto marcado como "nÃ£o mistura" vence esta escolha. |
| 65 | `show_freight_plan_to_client` | `boolean` | não | `false` |  | true = o bloco "Volumes estimados para transporte" aparece no PDF e na proposta do cliente. PadrÃ£o false: o plano Ã© interno. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_quotes_discount_approval_status | CHECK | `CHECK (discount_approval_status IS NULL OR (discount_approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))` |  |  | sim |
| quotes_approval_token_key | UNIQUE | `UNIQUE (approval_token)` |  |  | sim |
| quotes_assigned_to_fkey | FOREIGN KEY | `FOREIGN KEY (assigned_to) REFERENCES profiles(user_id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quotes_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quotes_freight_mix_mode_check | CHECK | `CHECK (freight_mix_mode IS NULL OR (freight_mix_mode = ANY (ARRAY['misturar'::text, 'separar'::text])))` |  |  | sim |
| quotes_freight_plan_shape_check | CHECK | `CHECK (freight_plan IS NULL OR jsonb_typeof(freight_plan) = 'object'::text AND pg_column_size(freight_plan) < 262144)` |  |  | sim |
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
| public.quote_comments | quote_comments_quote_id_fkey | quote_id | CASCADE |
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
