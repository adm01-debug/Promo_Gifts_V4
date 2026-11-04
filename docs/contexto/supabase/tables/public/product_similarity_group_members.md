# public.product_similarity_group_members

> Membros dos grupos de similaridade. Derivam pares em product_relationships automaticamente.

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
| 2 | `group_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `uuid` | não |  |  |  |
| 4 | `supplier_id` | `uuid` | não |  |  |  |
| 5 | `is_reference_product` | `boolean` | não | `false` |  |  |
| 6 | `similarity_score` | `numeric(3,2)` | não | `1.00` |  |  |
| 7 | `match_source` | `text` | não | `'automatic'::text` |  |  |
| 8 | `notes` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_similarity_group_members_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (group_id) REFERENCES product_similarity_groups(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_similarity_group_members_group_id_product_id_key | UNIQUE | `UNIQUE (group_id, product_id)` |  |  | sim |
| product_similarity_group_members_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_similarity_group_members_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id)` | NO ACTION | NO ACTION | sim |
| product_similarity_group_members_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_similarity_group_members_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_product_similarity_group_members_supplier_id ON public.product_similarity_group_members USING btree (supplier_id)` |
| idx_psgm_group | btree | group_id | não | sim |  | `CREATE INDEX idx_psgm_group ON public.product_similarity_group_members USING btree (group_id)` |
| idx_psgm_product | btree | product_id | não | sim |  | `CREATE INDEX idx_psgm_product ON public.product_similarity_group_members USING btree (product_id)` |
| product_similarity_group_members_group_id_product_id_key | btree | group_id, product_id | sim | sim |  | `CREATE UNIQUE INDEX product_similarity_group_members_group_id_product_id_key ON public.product_similarity_group_members USING btree (group_id, product_id)` |
| product_similarity_group_members_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_similarity_group_members_pkey ON public.product_similarity_group_members USING btree (id)` |


## Policies (RLS)

### `psgm_public_read`

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
| trg_derive_similarity_on_member_insert | AFTER | INSERT | ROW | enabled | public.fn_derive_similarity_pairs_on_insert |
| trg_remove_similarity_on_member_delete | AFTER | DELETE | ROW | enabled | public.fn_remove_similarity_pairs_on_delete |
| trg_validate_member_supplier | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_validate_member_supplier |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
