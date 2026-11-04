# public.supplier_customization_raw

> Bronze (layer) das tabelas de preco de gravacao por fornecedor. Grao = table_code_option (catalogo-wide, ~289 p/ SPOT). Aplicabilidade por SKU ja vive em supplier_products_raw.raw_data (CustomizationTables/Area1/TableCodes1...).

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `table_code` | `text` | não |  |  |  |
| 4 | `table_code_option` | `text` | não |  |  |  |
| 5 | `customization_type` | `text` | sim |  |  |  |
| 6 | `raw_data` | `jsonb` | não |  |  |  |
| 7 | `content_hash` | `text` | não | `encode(digest((raw_data)::text, 'sha256'::text), 'hex'::text)` | s |  |
| 8 | `status` | `supplier_raw_status` | não | `'pending'::supplier_raw_status` |  |  |
| 9 | `source_channel` | `text` | não | `'n8n'::text` |  |  |
| 10 | `import_batch_id` | `uuid` | sim |  |  |  |
| 11 | `imported_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `process_errors` | `jsonb` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_customization_raw_import_batch_id_fkey | FOREIGN KEY | `FOREIGN KEY (import_batch_id) REFERENCES supplier_import_batches(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| supplier_customization_raw_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_customization_raw_raw_data_check | CHECK | `CHECK (jsonb_typeof(raw_data) = 'object'::text)` |  |  | sim |
| supplier_customization_raw_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| uq_scr_supplier_option | UNIQUE | `UNIQUE (supplier_id, table_code_option)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_customization_raw_import_batch_id | btree | import_batch_id | não | sim |  | `CREATE INDEX idx_supplier_customization_raw_import_batch_id ON public.supplier_customization_raw USING btree (import_batch_id)` |
| supplier_customization_raw_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_customization_raw_pkey ON public.supplier_customization_raw USING btree (id)` |
| uq_scr_supplier_option | btree | supplier_id, table_code_option | sim | sim |  | `CREATE UNIQUE INDEX uq_scr_supplier_option ON public.supplier_customization_raw USING btree (supplier_id, table_code_option)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
