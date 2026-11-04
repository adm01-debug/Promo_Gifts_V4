# public.product_notebook_specs

> Especificações técnicas de produtos de material gráfico (cadernos, blocos, agendas). 1 linha por produto. FK → products (Gold).

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
| usada por views | public.vw_product_notebook_complete |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `paper_format_id` | `uuid` | sim |  |  |  |
| 4 | `paper_ruling_id` | `uuid` | sim |  |  |  |
| 5 | `paper_weight_id` | `uuid` | sim |  |  |  |
| 6 | `paper_color_id` | `uuid` | sim |  |  |  |
| 7 | `binding_type_id` | `uuid` | sim |  |  |  |
| 8 | `binding_color_id` | `uuid` | sim |  |  |  |
| 9 | `cover_type_id` | `uuid` | sim |  |  |  |
| 10 | `cover_material_id` | `uuid` | sim |  |  |  |
| 11 | `cover_finish_id` | `uuid` | sim |  |  |  |
| 12 | `sheet_count` | `integer` | sim |  |  |  |
| 13 | `source_supplier` | `text` | sim |  |  |  |
| 14 | `extraction_notes` | `text` | sim |  |  |  |
| 15 | `confidence_score` | `numeric(3,2)` | sim |  |  | 0.0 a 1.0 — confiança do parser automático. 1.0 = revisão manual. |
| 16 | `manually_reviewed` | `boolean` | não | `false` |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_notebook_specs_binding_color_id_fkey | FOREIGN KEY | `FOREIGN KEY (binding_color_id) REFERENCES binding_colors(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_binding_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (binding_type_id) REFERENCES binding_types(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_confidence_score_check | CHECK | `CHECK (confidence_score IS NULL OR confidence_score >= 0::numeric AND confidence_score <= 1::numeric)` |  |  | sim |
| product_notebook_specs_cover_finish_id_fkey | FOREIGN KEY | `FOREIGN KEY (cover_finish_id) REFERENCES cover_finishes(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_cover_material_id_fkey | FOREIGN KEY | `FOREIGN KEY (cover_material_id) REFERENCES cover_materials(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_cover_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (cover_type_id) REFERENCES cover_types(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_paper_color_id_fkey | FOREIGN KEY | `FOREIGN KEY (paper_color_id) REFERENCES paper_colors(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_paper_format_id_fkey | FOREIGN KEY | `FOREIGN KEY (paper_format_id) REFERENCES paper_formats(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_paper_ruling_id_fkey | FOREIGN KEY | `FOREIGN KEY (paper_ruling_id) REFERENCES paper_rulings(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_paper_weight_id_fkey | FOREIGN KEY | `FOREIGN KEY (paper_weight_id) REFERENCES paper_weights(id)` | NO ACTION | NO ACTION | sim |
| product_notebook_specs_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_notebook_specs_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_notebook_specs_product_id_key | UNIQUE | `UNIQUE (product_id)` |  |  | sim |
| product_notebook_specs_sheet_count_check | CHECK | `CHECK (sheet_count IS NULL OR sheet_count > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pns_cover_mat | btree | cover_material_id | não | sim |  | `CREATE INDEX idx_pns_cover_mat ON public.product_notebook_specs USING btree (cover_material_id)` |
| idx_product_notebook_specs_binding_color_id | btree | binding_color_id | não | sim |  | `CREATE INDEX idx_product_notebook_specs_binding_color_id ON public.product_notebook_specs USING btree (binding_color_id)` |
| idx_product_notebook_specs_binding_type_id | btree | binding_type_id | não | sim |  | `CREATE INDEX idx_product_notebook_specs_binding_type_id ON public.product_notebook_specs USING btree (binding_type_id)` |
| idx_product_notebook_specs_cover_finish_id | btree | cover_finish_id | não | sim |  | `CREATE INDEX idx_product_notebook_specs_cover_finish_id ON public.product_notebook_specs USING btree (cover_finish_id)` |
| idx_product_notebook_specs_cover_type_id | btree | cover_type_id | não | sim |  | `CREATE INDEX idx_product_notebook_specs_cover_type_id ON public.product_notebook_specs USING btree (cover_type_id)` |
| idx_product_notebook_specs_paper_color_id | btree | paper_color_id | não | sim |  | `CREATE INDEX idx_product_notebook_specs_paper_color_id ON public.product_notebook_specs USING btree (paper_color_id)` |
| idx_product_notebook_specs_paper_format_id | btree | paper_format_id | não | sim |  | `CREATE INDEX idx_product_notebook_specs_paper_format_id ON public.product_notebook_specs USING btree (paper_format_id)` |
| idx_product_notebook_specs_paper_ruling_id | btree | paper_ruling_id | não | sim |  | `CREATE INDEX idx_product_notebook_specs_paper_ruling_id ON public.product_notebook_specs USING btree (paper_ruling_id)` |
| idx_product_notebook_specs_paper_weight_id | btree | paper_weight_id | não | sim |  | `CREATE INDEX idx_product_notebook_specs_paper_weight_id ON public.product_notebook_specs USING btree (paper_weight_id)` |
| product_notebook_specs_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_notebook_specs_pkey ON public.product_notebook_specs USING btree (id)` |
| product_notebook_specs_product_id_key | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_notebook_specs_product_id_key ON public.product_notebook_specs USING btree (product_id)` |


## Policies (RLS)

### `ref_select_public`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pns_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_update_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
