# public.quote_item_personalizations

> Personalização (gravação) de cada item de orçamento. Cada item pode ter múltiplas técnicas/posições. Cascateia delete com quote_items.

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
| 2 | `quote_item_id` | `uuid` | não |  |  |  |
| 3 | `technique_id` | `uuid` | sim |  |  |  |
| 4 | `technique_name` | `text` | sim |  |  |  |
| 5 | `colors_count` | `integer` | não | `1` |  |  |
| 6 | `positions_count` | `integer` | não | `1` |  |  |
| 7 | `area_cm2` | `numeric(8,2)` | sim |  |  |  |
| 8 | `width_cm` | `numeric(8,2)` | sim |  |  |  |
| 9 | `height_cm` | `numeric(8,2)` | sim |  |  |  |
| 10 | `personalized_quantity` | `integer` | sim |  |  |  |
| 11 | `setup_cost` | `numeric(10,2)` | não | `0` |  |  |
| 12 | `unit_cost` | `numeric(10,2)` | não | `0` |  |  |
| 13 | `total_cost` | `numeric(10,2)` | não | `0` |  |  |
| 14 | `notes` | `text` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `location_code` | `text` | sim |  |  |  |
| 18 | `location_name` | `text` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| quote_item_personalizations_colors_count_check | CHECK | `CHECK (colors_count > 0)` |  |  | sim |
| quote_item_personalizations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| quote_item_personalizations_positions_count_check | CHECK | `CHECK (positions_count > 0)` |  |  | sim |
| quote_item_personalizations_quote_item_id_fkey | FOREIGN KEY | `FOREIGN KEY (quote_item_id) REFERENCES quote_items(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| quote_item_personalizations_setup_cost_check | CHECK | `CHECK (setup_cost >= 0::numeric)` |  |  | sim |
| quote_item_personalizations_total_cost_check | CHECK | `CHECK (total_cost >= 0::numeric)` |  |  | sim |
| quote_item_personalizations_unit_cost_check | CHECK | `CHECK (unit_cost >= 0::numeric)` |  |  | sim |
| trg_quote_personalizations_discount_integrity_deferred | t | `TRIGGER DEFERRABLE INITIALLY DEFERRED` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_qip_quote_item | btree | quote_item_id | não | sim |  | `CREATE INDEX idx_qip_quote_item ON public.quote_item_personalizations USING btree (quote_item_id)` |
| quote_item_personalizations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX quote_item_personalizations_pkey ON public.quote_item_personalizations USING btree (id)` |


## Policies (RLS)

### `qip_delete_own_quote`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |

### `qip_insert_own_quote`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |

### `qip_select_own_quote`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |

### `qip_update_own_quote`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM (quote_items qi      JOIN quotes q ON ((q.id = qi.quote_id)))   WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_qip_parent_immutable | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_quote_children_enforce_parent_immutability |
| trg_qip_propagate | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_qip_propagate_to_quote_items |
| trg_qip_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |
| trg_quote_personalizations_discount_integrity_deferred | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_deferred_quote_discount_integrity |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
