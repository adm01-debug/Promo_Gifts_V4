# public.supplier_value_mappings

> Mapeamento de valores específicos (tamanhos, cores, status)

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
| 3 | `field_type` | `character varying(50)` | não |  |  | Tipo: size, color, status, capacity_format, etc |
| 4 | `source_value` | `character varying(512)` | não |  |  | Valor como vem do fornecedor |
| 5 | `target_value` | `character varying(256)` | não |  |  | Valor interno padronizado |
| 6 | `display_value` | `character varying(100)` | sim |  |  | Valor para exibição ao cliente (opcional) |
| 7 | `sort_order` | `integer` | sim |  |  | Ordem de classificação (P=1, M=2, G=3...) |
| 8 | `is_active` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_value_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_value_mappings_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| uq_value_mapping | UNIQUE | `UNIQUE (supplier_id, field_type, source_value)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_value_mappings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_value_mappings_pkey ON public.supplier_value_mappings USING btree (id)` |
| uq_value_mapping | btree | supplier_id, field_type, source_value | sim | sim |  | `CREATE UNIQUE INDEX uq_value_mapping ON public.supplier_value_mappings USING btree (supplier_id, field_type, source_value)` |


## Policies (RLS)

### `auth_read_supplier_value_mappings`

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
