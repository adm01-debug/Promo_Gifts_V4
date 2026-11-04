# public.supplier_import_batches

> Controle de lotes de importação de fornecedores

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
| 3 | `started_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 4 | `finished_at` | `timestamp with time zone` | sim |  |  |  |
| 5 | `status` | `character varying(20)` | sim | `'running'::character varying` |  | Status: running, completed, failed, cancelled |
| 6 | `products_imported` | `integer` | sim | `0` |  |  |
| 7 | `products_updated` | `integer` | sim | `0` |  |  |
| 8 | `products_errors` | `integer` | sim | `0` |  |  |
| 9 | `variants_imported` | `integer` | sim | `0` |  |  |
| 10 | `variants_updated` | `integer` | sim | `0` |  |  |
| 11 | `variants_errors` | `integer` | sim | `0` |  |  |
| 12 | `error_log` | `jsonb` | sim |  |  |  |
| 13 | `notes` | `text` | sim |  |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_import_batches_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_import_batches_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.supplier_customization_raw | supplier_customization_raw_import_batch_id_fkey | import_batch_id | SET NULL |
| public.supplier_products_raw | supplier_products_raw_import_batch_id_fkey | import_batch_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_import_batches_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_supplier_import_batches_supplier_id ON public.supplier_import_batches USING btree (supplier_id)` |
| supplier_import_batches_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_import_batches_pkey ON public.supplier_import_batches USING btree (id)` |


## Policies (RLS)

### `auth_read_supplier_import_batches`

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
| trg_update_supplier_last_sync | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_update_supplier_last_sync |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
