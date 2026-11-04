# public.product_category_assignments

> Bug RLS corrigido na Etapa 6: removida product_category_assignments_public_read que anulava _select_org.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | classification_audit.v_gaps_acionaveis, classification_audit.v_kits_para_revisao, internal.mv_product_leaf_category, public.v_products_complete, public.vw_category_completeness, public.vw_product_color_category_links |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `category_id` | `uuid` | não |  |  |  |
| 4 | `is_primary` | `boolean` | sim | `false` |  |  |
| 5 | `display_order` | `integer` | sim | `0` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_category_assignments_category_id_fkey | FOREIGN KEY | `FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_category_assignments_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_category_assignments_product_id_category_id_key | UNIQUE | `UNIQUE (product_id, category_id)` |  |  | sim |
| product_category_assignments_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pca_product_id_noncovering | btree | product_id | não | sim |  | `CREATE INDEX idx_pca_product_id_noncovering ON public.product_category_assignments USING btree (product_id)` |
| product_category_assignments_category_id_idx | btree | category_id | não | sim |  | `CREATE INDEX product_category_assignments_category_id_idx ON public.product_category_assignments USING btree (category_id)` |
| product_category_assignments_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_category_assignments_pkey ON public.product_category_assignments USING btree (id)` |
| product_category_assignments_product_id_category_id_key | btree | product_id, category_id | sim | sim |  | `CREATE UNIQUE INDEX product_category_assignments_product_id_category_id_key ON public.product_category_assignments USING btree (product_id, category_id)` |
| product_category_primary_idx | btree | product_id | sim | sim | `(is_primary = true)` | `CREATE UNIQUE INDEX product_category_primary_idx ON public.product_category_assignments USING btree (product_id) WHERE (is_primary = true)` |


## Policies (RLS)

### `product_category_assignments_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK |  |

### `product_category_assignments_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |

### `product_category_assignments_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |

### `product_category_assignments_select_org`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_category_assignments.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE (uo.user_id = ( SELECT auth.uid() AS uid)))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pca_sync_products_count | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_trigger_sync_pca_products_count |
| trg_sync_main_category_from_pca | AFTER | INSERT OR UPDATE | ROW | enabled | public.fn_sync_main_category_from_pca |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
