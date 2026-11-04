# public.magazine_items

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
| 2 | `magazine_id` | `uuid` | não |  |  |  |
| 3 | `product_id` | `uuid` | não |  |  |  |
| 4 | `variant_color_name` | `text` | sim |  |  |  |
| 5 | `position` | `numeric` | não | `0` |  |  |
| 6 | `page_number` | `integer` | sim |  |  |  |
| 7 | `product_snapshot` | `jsonb` | não |  |  |  |
| 8 | `overrides` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magazine_items_magazine_id_fkey | FOREIGN KEY | `FOREIGN KEY (magazine_id) REFERENCES magazines(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magazine_items_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| magazine_items_position_unique | UNIQUE | `UNIQUE (magazine_id, "position") DEFERRABLE INITIALLY DEFERRED` |  |  | sim |
| magazine_items_unique_product | UNIQUE | `UNIQUE (magazine_id, product_id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.magazine_public_reactions | magazine_public_reactions_item_id_fkey | item_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| magazine_items_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magazine_items_pkey ON public.magazine_items USING btree (id)` |
| magazine_items_position_unique | btree | magazine_id, position | sim | sim |  | `CREATE UNIQUE INDEX magazine_items_position_unique ON public.magazine_items USING btree (magazine_id, "position")` |
| magazine_items_unique_product | btree | magazine_id, product_id | sim | sim |  | `CREATE UNIQUE INDEX magazine_items_unique_product ON public.magazine_items USING btree (magazine_id, product_id)` |


## Policies (RLS)

### `magazine_items_via_owner_or_org`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_items.magazine_id) AND ((m.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR ((m.organization_id IS NOT NULL) AND (EXISTS ( SELECT 1            FROM organization_members om           WHERE ((om.organization_id = m.organization_id) AND (om.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM magazines m   WHERE ((m.id = magazine_items.magazine_id) AND (m.owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_magazine_items_guard_v2 | BEFORE | INSERT OR DELETE OR UPDATE | ROW | enabled | public.magazine_items_guard_v2 |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
