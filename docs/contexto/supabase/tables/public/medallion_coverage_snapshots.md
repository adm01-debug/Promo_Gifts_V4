# public.medallion_coverage_snapshots

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
| 1 | `id` | `bigint` | não |  | a |  |
| 2 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `fornecedor` | `text` | não |  |  |  |
| 4 | `camada` | `text` | não |  |  |  |
| 5 | `produtos` | `integer` | não |  |  |  |
| 6 | `ncm_pct` | `numeric` | sim |  |  |  |
| 7 | `materials_pct` | `numeric` | sim |  |  |  |
| 8 | `tags_pct` | `numeric` | sim |  |  |  |
| 9 | `meta_pct` | `numeric` | sim |  |  |  |
| 10 | `ipi_pct` | `numeric` | sim |  |  |  |
| 11 | `description_pct` | `numeric` | sim |  |  |  |
| 12 | `category_pct` | `numeric` | sim |  |  |  |
| 13 | `display_name_pct` | `numeric` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| medallion_coverage_snapshots_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| medallion_coverage_snapshots_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX medallion_coverage_snapshots_pkey ON public.medallion_coverage_snapshots USING btree (id)` |


## Policies (RLS)

### `mcs_admin_read`

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
