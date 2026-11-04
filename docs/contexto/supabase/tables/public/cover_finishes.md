# public.cover_finishes

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
| 3 | `name` | `character varying(50)` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `display_order` | `integer` | sim | `0` |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| cover_finishes_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| cover_finishes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_notebook_specs | product_notebook_specs_cover_finish_id_fkey | cover_finish_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cover_finishes_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX cover_finishes_code_key ON public.cover_finishes USING btree (code)` |
| cover_finishes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX cover_finishes_pkey ON public.cover_finishes USING btree (id)` |


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
| trg_cover_finishes_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_update_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
