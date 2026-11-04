# public.product_tags

> Bug RLS corrigido na Etapa 6: removida product_tags_public_read que anulava _select_org.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_product_tags_public, public.v_products_with_tags, public.v_super_filtro_options |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `tag_id` | `uuid` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_tags_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_tags_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_tags_product_id_tag_id_key | UNIQUE | `UNIQUE (product_id, tag_id)` |  |  | sim |
| product_tags_tag_id_fkey | FOREIGN KEY | `FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_tags_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_tags_pkey ON public.product_tags USING btree (id)` |
| product_tags_product_id_idx | btree | product_id | não | sim |  | `CREATE INDEX product_tags_product_id_idx ON public.product_tags USING btree (product_id)` |
| product_tags_product_id_tag_id_key | btree | product_id, tag_id | sim | sim |  | `CREATE UNIQUE INDEX product_tags_product_id_tag_id_key ON public.product_tags USING btree (product_id, tag_id)` |
| product_tags_tag_id_idx | btree | tag_id | não | sim |  | `CREATE INDEX product_tags_tag_id_idx ON public.product_tags USING btree (tag_id)` |


## Policies (RLS)

### `product_tags_anon_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `fn_product_active_for_rls(product_id)` |
| WITH CHECK |  |

### `product_tags_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK |  |

### `product_tags_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `product_tags_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `product_tags_select_org`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_tags.product_id) AND user_belongs_to_org(p.organization_id))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_update_tag_usage_count | AFTER | INSERT OR DELETE | ROW | enabled | public.trg_fn_update_tag_usage_count |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
