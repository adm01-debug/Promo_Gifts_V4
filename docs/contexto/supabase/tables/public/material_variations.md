# public.material_variations

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
| 2 | `organization_id` | `uuid` | não |  |  |  |
| 3 | `type_id` | `uuid` | não |  |  |  |
| 4 | `name` | `character varying(150)` | não |  |  |  |
| 5 | `slug` | `character varying(150)` | não |  |  |  |
| 6 | `description` | `text` | sim |  |  |  |
| 7 | `specifications` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `display_order` | `integer` | sim | `0` |  |  |
| 9 | `is_active` | `boolean` | sim | `true` |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| material_variations_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| material_variations_organization_id_slug_key | UNIQUE | `UNIQUE (organization_id, slug)` |  |  | sim |
| material_variations_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| material_variations_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (type_id) REFERENCES material_types(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.material_equivalences | material_equivalences_promo_variation_id_fkey | promo_variation_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_material_variations_type_id | btree | type_id | não | sim |  | `CREATE INDEX idx_material_variations_type_id ON public.material_variations USING btree (type_id)` |
| material_variations_organization_id_slug_key | btree | organization_id, slug | sim | sim |  | `CREATE UNIQUE INDEX material_variations_organization_id_slug_key ON public.material_variations USING btree (organization_id, slug)` |
| material_variations_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX material_variations_pkey ON public.material_variations USING btree (id)` |


## Policies (RLS)

### `mv_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT material_variations.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `mv_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT material_variations.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |

### `mv_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT material_variations.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |

### `mv_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT material_variations.organization_id    FROM profiles   WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_material_variations_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
