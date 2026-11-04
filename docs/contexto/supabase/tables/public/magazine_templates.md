# public.magazine_templates

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
| 2 | `owner_id` | `uuid` | não |  |  |  |
| 3 | `organization_id` | `uuid` | sim |  |  |  |
| 4 | `name` | `text` | não |  |  |  |
| 5 | `template_id` | `text` | não |  |  |  |
| 6 | `content_settings` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 7 | `branding` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 8 | `shared_in_org` | `boolean` | não | `false` |  |  |
| 9 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 10 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magazine_templates_name_check | CHECK | `CHECK (char_length(name) <= 120)` |  |  | sim |
| magazine_templates_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| magazine_templates_owner_id_fkey | FOREIGN KEY | `FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magazine_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| magazine_templates_template_id_fkey | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES magazine_templates_catalog(template_id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magazine_templates_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_magazine_templates_organization_id ON public.magazine_templates USING btree (organization_id)` |
| idx_magazine_templates_owner_id | btree | owner_id | não | sim |  | `CREATE INDEX idx_magazine_templates_owner_id ON public.magazine_templates USING btree (owner_id)` |
| idx_magazine_templates_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_magazine_templates_template_id ON public.magazine_templates USING btree (template_id)` |
| magazine_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magazine_templates_pkey ON public.magazine_templates USING btree (id)` |


## Policies (RLS)

### `magazine_templates_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `magazine_templates_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `magazine_templates_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR ((shared_in_org = true) AND (organization_id IS NOT NULL) AND (EXISTS ( SELECT 1    FROM organization_members om   WHERE ((om.organization_id = magazine_templates.organization_id) AND (om.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))` |
| WITH CHECK |  |

### `magazine_templates_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `(owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_magazine_templates_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_updated_at_column |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
