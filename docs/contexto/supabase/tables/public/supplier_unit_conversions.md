# public.supplier_unit_conversions

> Regras de conversão de unidades (global ou por fornecedor)

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
| 2 | `supplier_id` | `uuid` | sim |  |  | NULL = regra global para todos fornecedores |
| 3 | `source_unit` | `character varying(20)` | não |  |  |  |
| 4 | `target_unit` | `character varying(20)` | não |  |  |  |
| 5 | `multiplier` | `numeric(20,10)` | não |  |  | Fator: valor_destino = valor_origem * multiplier |
| 6 | `unit_type` | `character varying(20)` | sim |  |  | Tipo: length, weight, volume, capacity |
| 7 | `description` | `character varying(255)` | sim |  |  |  |
| 8 | `is_default` | `boolean` | sim | `false` |  |  |
| 9 | `is_active` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_unit_conversions_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_unit_conversions_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |
| uq_unit_conversion | UNIQUE | `UNIQUE (supplier_id, source_unit, target_unit)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| supplier_unit_conversions_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_unit_conversions_pkey ON public.supplier_unit_conversions USING btree (id)` |
| uq_unit_conversion | btree | supplier_id, source_unit, target_unit | sim | sim |  | `CREATE UNIQUE INDEX uq_unit_conversion ON public.supplier_unit_conversions USING btree (supplier_id, source_unit, target_unit)` |


## Policies (RLS)

### `auth_read_supplier_unit_conversions`

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
