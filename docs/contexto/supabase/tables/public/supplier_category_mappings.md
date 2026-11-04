# public.supplier_category_mappings

> DE>PARA de categorias GLOBAL (compartilhado entre fornecedores). Decisao de modelagem registrada em 2026-06-06: esta tabela NAO possui coluna supplier_id — o mapeamento e chaveado por supplier_category_id -> category_id (canonica) e vale para todos os fornecedores (ASIA, SPOT, XBZ, SM). Difere de supplier_colors e supplier_field_mappings, que sao POR-FORNECEDOR (possuem supplier_id). O campo confidence indica a forca/qualidade do match.

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
| usada por views | public.vw_category_mapping_gaps, public.vw_supplier_category_coverage |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_category_id` | `uuid` | não |  |  | Chave do de-para de categorias (escopo GLOBAL, sem supplier_id): identificador de categoria do fornecedor que mapeia para category_id canonica. |
| 3 | `category_id` | `uuid` | não |  |  | Categoria canonica (Gold) destino do de-para. |
| 4 | `confidence` | `numeric(3,2)` | sim | `1.00` |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_scm_confidence_range | CHECK | `CHECK (confidence IS NULL OR confidence >= 0::numeric AND confidence <= 1::numeric)` |  |  | sim |
| supplier_category_mappings_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| supplier_category_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_category_mappings_supplier_category_id_category_id_key | UNIQUE | `UNIQUE (supplier_category_id, category_id)` |  |  | sim |
| supplier_category_mappings_supplier_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_category_id) REFERENCES supplier_categories(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_category_mappings_category_id | btree | category_id | não | sim |  | `CREATE INDEX idx_supplier_category_mappings_category_id ON public.supplier_category_mappings USING btree (category_id)` |
| supplier_category_mappings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_category_mappings_pkey ON public.supplier_category_mappings USING btree (id)` |
| supplier_category_mappings_supplier_category_id_category_id_key | btree | supplier_category_id, category_id | sim | sim |  | `CREATE UNIQUE INDEX supplier_category_mappings_supplier_category_id_category_id_key ON public.supplier_category_mappings USING btree (supplier_category_id, category_id)` |


## Policies (RLS)

### `auth_read_supplier_category_mappings`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
