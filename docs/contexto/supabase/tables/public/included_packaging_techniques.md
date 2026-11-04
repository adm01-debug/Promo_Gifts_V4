# public.included_packaging_techniques

> Técnicas de personalização permitidas em embalagens ORIGINAIS/inclusas, com custos. FK opcional para personalization_techniques.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.vw_packaging_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `packaging_id` | `uuid` | não |  |  |  |
| 3 | `technique_id` | `uuid` | sim |  |  |  |
| 4 | `technique_code` | `character varying(50)` | sim |  |  |  |
| 5 | `technique_name` | `character varying(100)` | sim |  |  |  |
| 6 | `is_recommended` | `boolean` | sim | `false` |  |  |
| 7 | `has_custom_pricing` | `boolean` | sim | `false` |  |  |
| 8 | `setup_cost` | `numeric(10,2)` | sim |  |  |  |
| 9 | `unit_cost` | `numeric(10,2)` | sim |  |  |  |
| 10 | `min_quantity` | `integer` | sim |  |  |  |
| 11 | `max_colors` | `integer` | sim |  |  |  |
| 12 | `notes` | `text` | sim |  |  |  |
| 13 | `display_order` | `integer` | sim | `0` |  |  |
| 14 | `active` | `boolean` | sim | `true` |  |  |
| 15 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 16 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| included_packaging_techniques_max_colors_check | CHECK | `CHECK (max_colors > 0)` |  |  | sim |
| included_packaging_techniques_min_quantity_check | CHECK | `CHECK (min_quantity > 0)` |  |  | sim |
| included_packaging_techniques_packaging_id_fkey | FOREIGN KEY | `FOREIGN KEY (packaging_id) REFERENCES product_included_packagings(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| included_packaging_techniques_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| included_packaging_techniques_setup_cost_check | CHECK | `CHECK (setup_cost >= 0::numeric)` |  |  | sim |
| included_packaging_techniques_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (technique_id) REFERENCES personalization_techniques(id)` | NO ACTION | NO ACTION | sim |
| included_packaging_techniques_unit_cost_check | CHECK | `CHECK (unit_cost >= 0::numeric)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_included_packaging_techniques_technique_id | btree | technique_id | não | sim |  | `CREATE INDEX idx_included_packaging_techniques_technique_id ON public.included_packaging_techniques USING btree (technique_id)` |
| idx_ipt_packaging | btree | packaging_id | não | sim |  | `CREATE INDEX idx_ipt_packaging ON public.included_packaging_techniques USING btree (packaging_id)` |
| idx_ipt_packaging_technique | btree | packaging_id, technique_id | sim | sim | `(technique_id IS NOT NULL)` | `CREATE UNIQUE INDEX idx_ipt_packaging_technique ON public.included_packaging_techniques USING btree (packaging_id, technique_id) WHERE (technique_id IS NOT NULL)` |
| included_packaging_techniques_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX included_packaging_techniques_pkey ON public.included_packaging_techniques USING btree (id)` |
| uq_ipt_packaging_technique_code | btree | packaging_id, technique_code | sim | sim |  | `CREATE UNIQUE INDEX uq_ipt_packaging_technique_code ON public.included_packaging_techniques USING btree (packaging_id, technique_code)` |


## Policies (RLS)

### `auth_read_ipt`

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
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
