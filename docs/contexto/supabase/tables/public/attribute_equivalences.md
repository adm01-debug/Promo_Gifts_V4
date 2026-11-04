# public.attribute_equivalences

> De-para entre valores de atributos de fornecedores e atributos padronizados do catálogo Promo Brindes. Alimenta fn_promote_padronizacao ao promover Silver→Gold para normalizar Properties/Certificates/Materials.

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
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `source` | `text` | não |  |  |  |
| 4 | `supplier_attr_key` | `text` | não |  |  |  |
| 5 | `supplier_attr_value` | `text` | não |  |  |  |
| 6 | `promo_attr_key` | `text` | não |  |  |  |
| 7 | `promo_attr_value` | `text` | não |  |  |  |
| 8 | `promo_attr_type` | `text` | não | `'text'::text` |  |  |
| 9 | `promo_attr_unit` | `text` | sim |  |  |  |
| 10 | `confidence` | `numeric(4,2)` | não | `1.00` |  |  |
| 11 | `match_quality` | `text` | não | `'manual'::text` |  |  |
| 12 | `verified` | `boolean` | não | `false` |  |  |
| 13 | `verified_by` | `uuid` | sim |  |  |  |
| 14 | `verified_at` | `timestamp with time zone` | sim |  |  |  |
| 15 | `notes` | `text` | sim |  |  |  |
| 16 | `is_active` | `boolean` | não | `true` |  |  |
| 17 | `organization_id` | `uuid` | sim |  |  |  |
| 18 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 19 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| attribute_equivalences_confidence_check | CHECK | `CHECK (confidence >= 0::numeric AND confidence <= 1::numeric)` |  |  | sim |
| attribute_equivalences_match_quality_check | CHECK | `CHECK (match_quality = ANY (ARRAY['exact'::text, 'partial'::text, 'manual'::text, 'ai_suggested'::text]))` |  |  | sim |
| attribute_equivalences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| attribute_equivalences_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| attribute_equivalences_supplier_id_supplier_attr_key_suppli_key | UNIQUE | `UNIQUE (supplier_id, supplier_attr_key, supplier_attr_value, promo_attr_key)` |  |  | sim |
| attribute_equivalences_verified_by_fkey | FOREIGN KEY | `FOREIGN KEY (verified_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| attribute_equivalences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX attribute_equivalences_pkey ON public.attribute_equivalences USING btree (id)` |
| attribute_equivalences_supplier_id_supplier_attr_key_suppli_key | btree | supplier_id, supplier_attr_key, supplier_attr_value, promo_attr_key | sim | sim |  | `CREATE UNIQUE INDEX attribute_equivalences_supplier_id_supplier_attr_key_suppli_key ON public.attribute_equivalences USING btree (supplier_id, supplier_attr_key, supplier_attr_value, promo_attr_key)` |
| idx_attribute_equivalences_verified_by | btree | verified_by | não | sim |  | `CREATE INDEX idx_attribute_equivalences_verified_by ON public.attribute_equivalences USING btree (verified_by)` |


## Policies (RLS)

### `aeq_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `aeq_write_service_role`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_aeq_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at_aeq |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
