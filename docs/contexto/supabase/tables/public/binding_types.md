# public.binding_types

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
| 2 | `code` | `character varying(20)` | não |  |  |  |
| 3 | `name_pt` | `character varying(60)` | não |  |  |  |
| 4 | `name_en` | `character varying(60)` | sim |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `max_sheets` | `integer` | sim |  |  |  |
| 7 | `display_order` | `integer` | sim | `0` |  |  |
| 8 | `is_active` | `boolean` | não | `true` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| binding_types_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| binding_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_notebook_specs | product_notebook_specs_binding_type_id_fkey | binding_type_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| binding_types_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX binding_types_code_key ON public.binding_types USING btree (code)` |
| binding_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX binding_types_pkey ON public.binding_types USING btree (id)` |


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
| trg_binding_types_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_update_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
