# public.packagings

> Cadastro de embalagens com dimensões e características

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
| usada por views | public.vw_packaging_health, public.vw_packaging_suppliers, public.vw_product_packaging_options |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `code` | `character varying(50)` | sim |  |  |  |
| 3 | `name` | `character varying(200)` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `packaging_type_id` | `uuid` | sim |  |  |  |
| 6 | `internal_width_cm` | `numeric(8,2)` | sim |  |  |  |
| 7 | `internal_height_cm` | `numeric(8,2)` | sim |  |  |  |
| 8 | `internal_length_cm` | `numeric(8,2)` | sim |  |  |  |
| 9 | `internal_diameter_cm` | `numeric(8,2)` | sim |  |  |  |
| 10 | `external_width_cm` | `numeric(8,2)` | sim |  |  |  |
| 11 | `external_height_cm` | `numeric(8,2)` | sim |  |  |  |
| 12 | `external_length_cm` | `numeric(8,2)` | sim |  |  |  |
| 13 | `external_diameter_cm` | `numeric(8,2)` | sim |  |  |  |
| 14 | `weight_g` | `integer` | sim |  |  |  |
| 15 | `material` | `character varying(100)` | sim |  |  |  |
| 16 | `color` | `character varying(50)` | sim |  |  |  |
| 17 | `is_customizable` | `boolean` | sim | `false` |  |  |
| 18 | `print_area_width_cm` | `numeric(6,2)` | sim |  |  |  |
| 19 | `print_area_height_cm` | `numeric(6,2)` | sim |  |  |  |
| 20 | `active` | `boolean` | sim | `true` |  |  |
| 21 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| packagings_code_unique | UNIQUE | `UNIQUE (code)` |  |  | sim |
| packagings_packaging_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (packaging_type_id) REFERENCES packaging_types(id)` | NO ACTION | NO ACTION | sim |
| packagings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_packagings | product_packagings_packaging_id_fkey | packaging_id | CASCADE |
| public.supplier_packagings | supplier_packagings_packaging_id_fkey | packaging_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_packagings_packaging_type_id | btree | packaging_type_id | não | sim |  | `CREATE INDEX idx_packagings_packaging_type_id ON public.packagings USING btree (packaging_type_id)` |
| packagings_code_unique | btree | code | sim | sim |  | `CREATE UNIQUE INDEX packagings_code_unique ON public.packagings USING btree (code)` |
| packagings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX packagings_pkey ON public.packagings USING btree (id)` |


## Policies (RLS)

### `auth_read_packagings`

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
