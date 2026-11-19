# public.product_endomarketing

> Vincula produtos a temas de endomarketing. source: manual (aba Marketing) ou category (herdado).

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


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `theme_id` | `uuid` | não |  |  |  |
| 4 | `source` | `character varying(20)` | não | `'manual'::character varying` |  |  |
| 5 | `is_active` | `boolean` | não | `true` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_endomarketing_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_endomarketing_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_endomarketing_source_check | CHECK | `CHECK (source::text = ANY (ARRAY['category'::character varying, 'manual'::character varying]::text[]))` |  |  | sim |
| product_endomarketing_theme_id_fkey | FOREIGN KEY | `FOREIGN KEY (theme_id) REFERENCES endomarketing_themes(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| uq_product_endomarketing | UNIQUE | `UNIQUE (product_id, theme_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_endomarketing_theme_id | btree | theme_id | não | sim |  | `CREATE INDEX idx_product_endomarketing_theme_id ON public.product_endomarketing USING btree (theme_id)` |
| product_endomarketing_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_endomarketing_pkey ON public.product_endomarketing USING btree (id)` |
| uq_product_endomarketing | btree | product_id, theme_id | sim | sim |  | `CREATE UNIQUE INDEX uq_product_endomarketing ON public.product_endomarketing USING btree (product_id, theme_id)` |


## Policies (RLS)

### `product_endomarketing_auth_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `product_endomarketing_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_endomarketing.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK |  |

### `product_endomarketing_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_endomarketing.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |

### `product_endomarketing_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_endomarketing.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_endomarketing.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
