# public.product_notebook_features

> Features e acessórios dos cadernos (N:N). Cada linha = 1 feature confirmada para 1 produto.

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
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `feature_id` | `uuid` | não |  |  |  |
| 4 | `source_text` | `text` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_notebook_features_feature_id_fkey | FOREIGN KEY | `FOREIGN KEY (feature_id) REFERENCES notebook_features(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_notebook_features_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_notebook_features_product_id_feature_id_key | UNIQUE | `UNIQUE (product_id, feature_id)` |  |  | sim |
| product_notebook_features_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pnf_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_pnf_product_id ON public.product_notebook_features USING btree (product_id)` |
| idx_product_notebook_features_feature_id | btree | feature_id | não | sim |  | `CREATE INDEX idx_product_notebook_features_feature_id ON public.product_notebook_features USING btree (feature_id)` |
| product_notebook_features_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_notebook_features_pkey ON public.product_notebook_features USING btree (id)` |
| product_notebook_features_product_id_feature_id_key | btree | product_id, feature_id | sim | sim |  | `CREATE UNIQUE INDEX product_notebook_features_product_id_feature_id_key ON public.product_notebook_features USING btree (product_id, feature_id)` |


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
| trg_pnf_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_update_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
