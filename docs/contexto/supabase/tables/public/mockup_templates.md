# public.mockup_templates

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
| 2 | `product_id` | `uuid` | sim |  |  |  |
| 3 | `name` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `template_image_url` | `text` | não |  |  |  |
| 6 | `predefined_areas` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 7 | `default_technique_id` | `uuid` | sim |  |  |  |
| 8 | `available_colors` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 9 | `usage_count` | `integer` | sim | `0` |  |  |
| 10 | `is_featured` | `boolean` | sim | `false` |  |  |
| 11 | `is_active` | `boolean` | sim | `true` |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mockup_templates_default_technique_id_fkey | FOREIGN KEY | `FOREIGN KEY (default_technique_id) REFERENCES personalization_techniques(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| mockup_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| mockup_templates_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_mockup_templates_default_technique_id | btree | default_technique_id | não | sim |  | `CREATE INDEX idx_mockup_templates_default_technique_id ON public.mockup_templates USING btree (default_technique_id)` |
| idx_mockup_templates_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_mockup_templates_product_id ON public.mockup_templates USING btree (product_id)` |
| mockup_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX mockup_templates_pkey ON public.mockup_templates USING btree (id)` |


## Policies (RLS)

### `mt_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `mt_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `mt_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `mt_select_active_or_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((is_active = true) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_mt_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
