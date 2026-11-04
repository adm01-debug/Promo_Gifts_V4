# public.color_equivalences

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
| usada por views | public.vw_color_coverage, public.vw_color_mapping, public.vw_supplier_color_mappings |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `promo_variation_id` | `uuid` | não |  |  |  |
| 4 | `promo_nuance_id` | `uuid` | sim |  |  |  |
| 5 | `supplier_color_id` | `uuid` | não |  |  |  |
| 6 | `match_quality` | `character varying(50)` | sim | `'exact'::character varying` |  |  |
| 7 | `confidence_score` | `integer` | sim | `100` |  |  |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `verified` | `boolean` | sim | `false` |  |  |
| 10 | `verified_by` | `uuid` | sim |  |  |  |
| 11 | `verified_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `source` | `character varying(50)` | sim | `'manual'::character varying` |  |  |
| 13 | `notes` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 16 | `is_primary` | `boolean` | não | `false` |  | Equivalencia primaria/canonica desta supplier_color. Backfill por precedencia: match_quality(exact>close>approximate) > confidence_score DESC > internal_code num ASC > id. Garantido <=1 ativa por supplier_color via uq_color_equivalences_one_primary. fix_version 2026-06-26 - NAO REMOVER (anti-regressao). |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| color_equivalences_organization_id_promo_variation_id_promo_key | UNIQUE | `UNIQUE (organization_id, promo_variation_id, promo_nuance_id, supplier_color_id)` |  |  | sim |
| color_equivalences_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| color_equivalences_promo_nuance_id_fkey | FOREIGN KEY | `FOREIGN KEY (promo_nuance_id) REFERENCES color_nuances(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| color_equivalences_promo_variation_id_fkey | FOREIGN KEY | `FOREIGN KEY (promo_variation_id) REFERENCES color_variations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| color_equivalences_supplier_color_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_color_id) REFERENCES supplier_colors(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| unique_supplier_promo_color | UNIQUE | `UNIQUE (supplier_color_id, promo_variation_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| color_equivalences_organization_id_promo_variation_id_promo_key | btree | organization_id, promo_variation_id, promo_nuance_id, supplier_color_id | sim | sim |  | `CREATE UNIQUE INDEX color_equivalences_organization_id_promo_variation_id_promo_key ON public.color_equivalences USING btree (organization_id, promo_variation_id, promo_nuance_id, supplier_color_id)` |
| color_equivalences_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX color_equivalences_pkey ON public.color_equivalences USING btree (id)` |
| idx_color_equivalences_promo_nuance_id | btree | promo_nuance_id | não | sim |  | `CREATE INDEX idx_color_equivalences_promo_nuance_id ON public.color_equivalences USING btree (promo_nuance_id)` |
| idx_color_equivalences_promo_variation_id | btree | promo_variation_id | não | sim |  | `CREATE INDEX idx_color_equivalences_promo_variation_id ON public.color_equivalences USING btree (promo_variation_id)` |
| unique_supplier_promo_color | btree | supplier_color_id, promo_variation_id | sim | sim |  | `CREATE UNIQUE INDEX unique_supplier_promo_color ON public.color_equivalences USING btree (supplier_color_id, promo_variation_id)` |
| uq_color_equivalences_one_primary | btree | supplier_color_id | sim | sim | `(is_primary AND is_active)` | `CREATE UNIQUE INDEX uq_color_equivalences_one_primary ON public.color_equivalences USING btree (supplier_color_id) WHERE (is_primary AND is_active)` |


## Policies (RLS)

### `color_equivalences_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK |  |

### `color_equivalences_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `color_equivalences_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_org_owner_or_admin(organization_id)` |
| WITH CHECK | `is_org_owner_or_admin(organization_id)` |

### `color_equivalences_select_org`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `user_belongs_to_org(organization_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_color_equiv_clear_primary_on_inactive | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_color_equiv_clear_primary_on_inactive |
| trg_color_equiv_ensure_primary | AFTER | INSERT OR DELETE OR UPDATE | STATEMENT | enabled | public.fn_color_equiv_ensure_primary |
| trg_color_equiv_ensure_primary_stmt | AFTER | INSERT OR DELETE OR UPDATE | STATEMENT | enabled | public.fn_color_equiv_ensure_primary_stmt |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
