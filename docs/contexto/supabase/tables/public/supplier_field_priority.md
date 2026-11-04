# public.supplier_field_priority

> Define qual fornecedor prevalece para cada campo quando há múltiplos

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
| 2 | `target_table` | `character varying(50)` | não |  |  |  |
| 3 | `target_field` | `character varying(100)` | não |  |  |  |
| 4 | `supplier_id` | `uuid` | não |  |  |  |
| 5 | `priority` | `integer` | não |  |  | 1 = maior prioridade |
| 6 | `condition_config` | `jsonb` | sim |  |  | Condições: {"only_if_null": true}, {"min_value": 0} |
| 7 | `is_active` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_field_priority_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_field_priority_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| uq_field_priority | UNIQUE | `UNIQUE (target_table, target_field, supplier_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_field_priority_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_supplier_field_priority_supplier_id ON public.supplier_field_priority USING btree (supplier_id)` |
| supplier_field_priority_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_field_priority_pkey ON public.supplier_field_priority USING btree (id)` |
| uq_field_priority | btree | target_table, target_field, supplier_id | sim | sim |  | `CREATE UNIQUE INDEX uq_field_priority ON public.supplier_field_priority USING btree (target_table, target_field, supplier_id)` |


## Policies (RLS)

### `auth_read_supplier_field_priority`

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
