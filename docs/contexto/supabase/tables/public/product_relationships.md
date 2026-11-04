# public.product_relationships

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
| 3 | `related_product_id` | `uuid` | não |  |  |  |
| 4 | `relationship_type` | `character varying(30)` | não |  |  |  |
| 5 | `display_order` | `integer` | sim | `0` |  |  |
| 6 | `is_bidirectional` | `boolean` | sim | `false` |  |  |
| 7 | `is_active` | `boolean` | sim | `true` |  |  |
| 8 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_relationships_check | CHECK | `CHECK (product_id <> related_product_id)` |  |  | sim |
| product_relationships_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_relationships_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_relationships_product_id_related_product_id_relatio_key | UNIQUE | `UNIQUE (product_id, related_product_id, relationship_type)` |  |  | sim |
| product_relationships_related_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_relationships_canonical_pair | btree | relationship_type | sim | sim |  | `CREATE UNIQUE INDEX idx_product_relationships_canonical_pair ON public.product_relationships USING btree (LEAST((product_id)::text, (related_product_id)::text), GREATEST((product_id)::text, (related_product_id)::text), relationship_type)` |
| idx_product_relationships_related_product_id | btree | related_product_id | não | sim |  | `CREATE INDEX idx_product_relationships_related_product_id ON public.product_relationships USING btree (related_product_id)` |
| product_relationships_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_relationships_pkey ON public.product_relationships USING btree (id)` |
| product_relationships_product_id_related_product_id_relatio_key | btree | product_id, related_product_id, relationship_type | sim | sim |  | `CREATE UNIQUE INDEX product_relationships_product_id_related_product_id_relatio_key ON public.product_relationships USING btree (product_id, related_product_id, relationship_type)` |


## Policies (RLS)

### `product_relationships_oa_del`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_relationships.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK |  |

### `product_relationships_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_relationships.product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `product_relationships_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_relationships.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_relationships.product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `product_relationships_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
