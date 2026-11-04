# public._bkp_kit_dims_20260619

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
| 1 | `id` | `uuid` | não |  |  |  |
| 2 | `name` | `text` | sim |  |  |  |
| 3 | `sku` | `text` | sim |  |  |  |
| 4 | `length_cm` | `numeric(8,2)` | sim |  |  |  |
| 5 | `width_cm` | `numeric(8,2)` | sim |  |  |  |
| 6 | `height_cm` | `numeric(8,2)` | sim |  |  |  |
| 7 | `weight_g` | `integer` | sim |  |  |  |
| 8 | `is_kit` | `boolean` | sim |  |  |  |
| 9 | `is_active` | `boolean` | sim |  |  |  |
| 10 | `updated_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bkp_kit_dims_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bkp_kit_dims_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bkp_kit_dims_pkey ON public._bkp_kit_dims_20260619 USING btree (id)` |


## Policies (RLS)

### `bkp_kit_dims_service_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
