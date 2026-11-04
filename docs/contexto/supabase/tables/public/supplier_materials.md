# public.supplier_materials

> Bug RLS GRAVE corrigido na Etapa 6: supplier_materials_public_read liberava pra anon. Removida.

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
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `api_material_key` | `character varying(100)` | não |  |  |  |
| 4 | `api_material_name` | `character varying(200)` | sim |  |  |  |
| 5 | `api_material_group` | `character varying(100)` | sim |  |  |  |
| 6 | `raw_data` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 7 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| supplier_materials_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_materials_supplier_id_api_material_key_key | UNIQUE | `UNIQUE (supplier_id, api_material_key)` |  |  | sim |
| supplier_materials_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.material_equivalences | material_equivalences_supplier_material_id_fkey | supplier_material_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_supplier_materials_supplier | btree | supplier_id | não | sim |  | `CREATE INDEX idx_supplier_materials_supplier ON public.supplier_materials USING btree (supplier_id)` |
| supplier_materials_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_materials_pkey ON public.supplier_materials USING btree (id)` |
| supplier_materials_supplier_id_api_material_key_key | btree | supplier_id, api_material_key | sim | sim |  | `CREATE UNIQUE INDEX supplier_materials_supplier_id_api_material_key_key ON public.supplier_materials USING btree (supplier_id, api_material_key)` |


## Policies (RLS)

### `sm_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(supplier_id IN ( SELECT suppliers.id    FROM suppliers   WHERE (suppliers.organization_id IN ( SELECT suppliers.organization_id            FROM profiles           WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |

### `sm_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(supplier_id IN ( SELECT suppliers.id    FROM suppliers   WHERE (suppliers.organization_id IN ( SELECT suppliers.organization_id            FROM profiles           WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |

### `sm_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(supplier_id IN ( SELECT suppliers.id    FROM suppliers   WHERE (suppliers.organization_id IN ( SELECT suppliers.organization_id            FROM profiles           WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |

### `sm_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(supplier_id IN ( SELECT suppliers.id    FROM suppliers   WHERE (suppliers.organization_id IN ( SELECT suppliers.organization_id            FROM profiles           WHERE (profiles.id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| update_supplier_materials_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
