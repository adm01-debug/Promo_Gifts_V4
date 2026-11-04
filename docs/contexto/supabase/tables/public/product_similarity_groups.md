# public.product_similarity_groups

> Grupos de produtos semelhantes cross-supplier. Cada grupo agrupa produtos de diferentes fornecedores com mesma família de material e faixa de capacidade.

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `category_id` | `uuid` | sim |  |  |  |
| 4 | `material_family` | `text` | não |  |  | Família de material do corpo: ALUMINIO, INOX, PLASTICO, etc. |
| 5 | `capacity_band` | `text` | não |  |  | Faixa de capacidade: ~400ml, ~500ml, ~600ml, ~700ml, ~800ml, ~1000ml, ~1200ml+ |
| 6 | `capacity_min` | `integer` | sim |  |  |  |
| 7 | `capacity_max` | `integer` | sim |  |  |  |
| 8 | `match_criteria` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 9 | `match_source` | `text` | não | `'automatic'::text` |  |  |
| 10 | `is_active` | `boolean` | não | `true` |  |  |
| 11 | `notes` | `text` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_similarity_groups_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id)` | NO ACTION | NO ACTION | sim |
| product_similarity_groups_category_id_material_family_capac_key | UNIQUE | `UNIQUE (category_id, material_family, capacity_band)` |  |  | sim |
| product_similarity_groups_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_similarity_group_members | product_similarity_group_members_group_id_fkey | group_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_similarity_groups_category_id_material_family_capac_key | btree | category_id, material_family, capacity_band | sim | sim |  | `CREATE UNIQUE INDEX product_similarity_groups_category_id_material_family_capac_key ON public.product_similarity_groups USING btree (category_id, material_family, capacity_band)` |
| product_similarity_groups_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_similarity_groups_pkey ON public.product_similarity_groups USING btree (id)` |


## Policies (RLS)

### `psg_public_read`

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
| trg_toggle_group_similarity_pairs | AFTER | UPDATE | ROW | enabled | public.fn_toggle_group_similarity_pairs |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
