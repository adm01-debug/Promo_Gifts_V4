# public.material_equivalences

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
| 2 | `supplier_material_id` | `uuid` | não |  |  |  |
| 3 | `promo_variation_id` | `uuid` | sim |  |  |  |
| 4 | `promo_type_id` | `uuid` | sim |  |  |  |
| 5 | `promo_group_id` | `uuid` | sim |  |  |  |
| 6 | `match_level` | `character varying(20)` | não | `'type'::character varying` |  |  |
| 7 | `match_quality` | `character varying(20)` | sim | `'manual'::character varying` |  |  |
| 8 | `confidence_score` | `numeric(3,2)` | sim | `1.00` |  |  |
| 9 | `notes` | `text` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| material_equivalences_confidence_score_check | CHECK | `CHECK (confidence_score >= 0::numeric AND confidence_score <= 1::numeric)` |  |  | sim |
| material_equivalences_match_level_check | CHECK | `CHECK (match_level::text = ANY (ARRAY['group'::character varying, 'type'::character varying, 'variation'::character varying]::text[]))` |  |  | sim |
| material_equivalences_match_quality_check | CHECK | `CHECK (match_quality::text = ANY (ARRAY['exact'::character varying, 'similar'::character varying, 'manual'::character varying, 'ai_suggested'::character varying]::text[]))` |  |  | sim |
| material_equivalences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| material_equivalences_promo_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (promo_group_id) REFERENCES material_groups(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| material_equivalences_promo_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (promo_type_id) REFERENCES material_types(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| material_equivalences_promo_variation_id_fkey | FOREIGN KEY | `FOREIGN KEY (promo_variation_id) REFERENCES material_variations(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| material_equivalences_supplier_material_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_material_id) REFERENCES supplier_materials(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| material_equivalences_supplier_material_id_key | UNIQUE | `UNIQUE (supplier_material_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_material_equiv_type | btree | promo_type_id | não | sim |  | `CREATE INDEX idx_material_equiv_type ON public.material_equivalences USING btree (promo_type_id)` |
| idx_material_equivalences_promo_group_id | btree | promo_group_id | não | sim |  | `CREATE INDEX idx_material_equivalences_promo_group_id ON public.material_equivalences USING btree (promo_group_id)` |
| idx_material_equivalences_promo_variation_id | btree | promo_variation_id | não | sim |  | `CREATE INDEX idx_material_equivalences_promo_variation_id ON public.material_equivalences USING btree (promo_variation_id)` |
| material_equivalences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX material_equivalences_pkey ON public.material_equivalences USING btree (id)` |
| material_equivalences_supplier_material_id_key | btree | supplier_material_id | sim | sim |  | `CREATE UNIQUE INDEX material_equivalences_supplier_material_id_key ON public.material_equivalences USING btree (supplier_material_id)` |


## Policies (RLS)

### `me_all_service`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |

### `me_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_material_equivalences_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
