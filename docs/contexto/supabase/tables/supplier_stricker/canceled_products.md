# supplier_stricker.canceled_products

> Produtos descontinuados do portfólio Stricker

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | não |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `prod_reference` | `character varying(20)` | não |  |  |  |
| 3 | `canceled_at` | `date` | sim |  |  |  |
| 4 | `reason` | `character varying(255)` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| canceled_products_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| canceled_products_prod_reference_key | UNIQUE | `UNIQUE (prod_reference)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| canceled_products_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX canceled_products_pkey ON supplier_stricker.canceled_products USING btree (id)` |
| canceled_products_prod_reference_key | btree | prod_reference | sim | sim |  | `CREATE UNIQUE INDEX canceled_products_prod_reference_key ON supplier_stricker.canceled_products USING btree (prod_reference)` |
| idx_stricker_canceled_date | btree | canceled_at | não | sim |  | `CREATE INDEX idx_stricker_canceled_date ON supplier_stricker.canceled_products USING btree (canceled_at)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
