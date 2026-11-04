# public.category_ancestors

> Closure table (pre-computed ancestor-descendant pairs) derivada do parent_id.
FKs: ON DELETE CASCADE (rows auto-removidas ao deletar categoria).
Rebuild manual: SELECT * FROM fn_rebuild_category_ancestors().
Corrigido em: 2026-06-23 — FKs NO ACTION → CASCADE.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | internal.mv_product_leaf_category |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `descendant_id` | `uuid` | não |  |  |  |
| 2 | `ancestor_id` | `uuid` | não |  |  |  |
| 3 | `depth` | `smallint` | não | `1` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| category_ancestors_ancestor_id_fkey | FOREIGN KEY | `FOREIGN KEY (ancestor_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE CASCADE` | CASCADE | CASCADE | sim |
| category_ancestors_descendant_id_fkey | FOREIGN KEY | `FOREIGN KEY (descendant_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE CASCADE` | CASCADE | CASCADE | sim |
| category_ancestors_pkey | PRIMARY KEY | `PRIMARY KEY (descendant_id, ancestor_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| cat_ancestors_anc_idx | btree | ancestor_id | não | sim |  | `CREATE INDEX cat_ancestors_anc_idx ON public.category_ancestors USING btree (ancestor_id)` |
| category_ancestors_pkey | btree | descendant_id, ancestor_id | sim | sim |  | `CREATE UNIQUE INDEX category_ancestors_pkey ON public.category_ancestors USING btree (descendant_id, ancestor_id)` |


## Policies (RLS)

### `category_ancestors_select_public`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `true` |
| WITH CHECK |  |

### `category_ancestors_write_service_only`

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
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
