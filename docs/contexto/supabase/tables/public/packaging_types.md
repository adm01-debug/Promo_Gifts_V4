# public.packaging_types

> Tipos/categorias de embalagem (caixa papelão, estojo, etc.)

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
| usada por views | public.vw_packaging_suppliers, public.vw_product_packaging_options |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `code` | `character varying(50)` | não |  |  |  |
| 3 | `name` | `character varying(100)` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `is_gift_box` | `boolean` | sim | `false` |  |  |
| 6 | `is_protective` | `boolean` | sim | `false` |  |  |
| 7 | `is_display` | `boolean` | sim | `false` |  |  |
| 8 | `active` | `boolean` | sim | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| packaging_types_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| packaging_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.packagings | packagings_packaging_type_id_fkey | packaging_type_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| packaging_types_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX packaging_types_code_key ON public.packaging_types USING btree (code)` |
| packaging_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX packaging_types_pkey ON public.packaging_types USING btree (id)` |


## Policies (RLS)

### `auth_read_packaging_types`

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
