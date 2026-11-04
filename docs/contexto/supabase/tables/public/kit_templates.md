# public.kit_templates

> Templates curados de kits. Vendedor clona via increment_kit_template_usage RPC. Schema extraído de useKitTemplates.ts.

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `category` | `text` | não | `'general'::text` |  |  |
| 5 | `color` | `text` | não | `'#3B82F6'::text` |  |  |
| 6 | `icon` | `text` | não | `'Package'::text` |  |  |
| 7 | `tag` | `text` | sim |  |  |  |
| 8 | `cover_image_url` | `text` | sim |  |  |  |
| 9 | `box_data` | `jsonb` | sim |  |  |  |
| 10 | `items_data` | `jsonb` | não | `'[]'::jsonb` |  |  |
| 11 | `personalization_data` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 12 | `total_price` | `numeric(12,2)` | não | `0` |  |  |
| 13 | `volume_usage_percent` | `numeric(5,2)` | não | `0` |  |  |
| 14 | `usage_count` | `integer` | não | `0` |  |  |
| 15 | `is_active` | `boolean` | não | `true` |  |  |
| 16 | `created_by` | `uuid` | sim |  |  |  |
| 17 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_templates_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| kit_templates_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kit_templates_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_kit_templates_created_by ON public.kit_templates USING btree (created_by)` |
| kit_templates_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_templates_pkey ON public.kit_templates USING btree (id)` |


## Policies (RLS)

### `kt_delete_dev`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `kt_insert_coord`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `kt_select_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((is_active = true) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `kt_update_coord`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_kit_templates_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
