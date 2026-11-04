# public.paper_weights

> Gramatura em g/m² do papel dos cadernos

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
| 2 | `weight_gsm` | `integer` | não |  |  |  |
| 3 | `description` | `character varying(50)` | sim |  |  |  |
| 4 | `typical_use` | `character varying(100)` | sim |  |  |  |
| 5 | `display_order` | `integer` | sim | `0` |  |  |
| 6 | `is_active` | `boolean` | não | `true` |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| paper_weights_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| paper_weights_weight_gsm_key | UNIQUE | `UNIQUE (weight_gsm)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_notebook_specs | product_notebook_specs_paper_weight_id_fkey | paper_weight_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| paper_weights_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX paper_weights_pkey ON public.paper_weights USING btree (id)` |
| paper_weights_weight_gsm_key | btree | weight_gsm | sim | sim |  | `CREATE UNIQUE INDEX paper_weights_weight_gsm_key ON public.paper_weights USING btree (weight_gsm)` |


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
| trg_paper_weights_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_update_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
