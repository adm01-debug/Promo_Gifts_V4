# public.quote_templates

> Modelos reutilizáveis de orçamento por vendedor ou sistema. Podem pré-preencher itens, condições comerciais, pagamento, prazo e modalidade/custo de frete; revisar preço, desconto, estoque e disponibilidade antes de aplicar a uma nova cotação. Schema unificado na Wave 3.3.C.1.

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `category` | `text` | sim |  |  |  |
| 5 | `items` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 6 | `payment_terms` | `text` | sim |  |  | Condição padrão de pagamento em texto livre. Formatos recomendados: avista, N dias, N/N/... dias ou sob consulta. Ajustar ao negociar; não é enum nem possui CHECK. |
| 7 | `delivery_time` | `text` | sim |  |  | Prazo padrão prometido em texto para o template: imediato, N dias úteis, N a M dias úteis ou sob consulta. Rever/confirmar antes de aplicar ao orçamento. |
| 8 | `notes` | `text` | sim |  |  |  |
| 9 | `is_active` | `boolean` | sim | `true` |  |  |
| 10 | `usage_count` | `integer` | sim | `0` |  |  |
| 11 | `created_by` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `seller_id` | `uuid` | sim |  |  |  |
| 15 | `template_data` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 16 | `discount_percent` | `numeric` | sim | `0` |  | Percentual de desconto padrão do template (percentual, não valor monetário). O valor em reais correspondente é registrado separadamente em discount_amount. |
| 17 | `discount_amount` | `numeric` | sim | `0` |  | Valor monetário de desconto padrão do template em BRL (reais com centavos), distinto de discount_percent. |
| 18 | `internal_notes` | `text` | sim |  |  |  |
| 19 | `is_default` | `boolean` | sim | `false` |  |  |
| 20 | `validity_days` | `integer` | sim | `30` |  |  |
| 21 | `shipping_type` | `text` | sim |  |  | Modalidade/responsabilidade de frete padrão do template. Valores permitidos pelo CHECK: cif, fob e fob_pre (FOB com custo pré-negociado). Não representa o meio de transporte. |
| 22 | `payment_method` | `text` | sim |  |  | Forma de pagamento padrão a preencher ao aplicar o template. Vocabulário recomendado: pix, boleto, credit_card, bank_transfer, cash ou other; usar códigos minúsculos. Documentação apenas, sem CHECK. |
| 23 | `shipping_cost` | `numeric` | sim | `0` |  | Custo de frete padrão do template em BRL (reais com centavos), especialmente para custo FOB pré-negociado; não é preço unitário de produto. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| qt_discount_ssot | CHECK | `CHECK (NOT (COALESCE(discount_percent, 0::numeric) > 0::numeric AND COALESCE(discount_amount, 0::numeric) > 0::numeric))` |  |  | sim |
| quote_templates_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| quote_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_templates_shipping_cost_check | CHECK | `CHECK (shipping_cost IS NULL OR shipping_cost >= 0::numeric)` |  |  | sim |
| quote_templates_shipping_type_check | CHECK | `CHECK (shipping_type IS NULL OR (shipping_type = ANY (ARRAY['cif'::text, 'fob'::text, 'fob_pre'::text])))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_quote_templates_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_quote_templates_created_by ON public.quote_templates USING btree (created_by)` |
| quote_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_templates_pkey ON public.quote_templates USING btree (id)` |


## Policies (RLS)

### `quote_templates_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` |
| WITH CHECK |  |

### `quote_templates_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` |

### `quote_templates_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by) OR (is_default = true) OR (is_active = true))` |
| WITH CHECK |  |

### `quote_templates_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = created_by)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
