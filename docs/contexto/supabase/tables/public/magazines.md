# public.magazines

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
| 4 | `title` | `text` | não | `'Nova Revista'::text` |  |  |
| 5 | `subtitle` | `text` | não | `''::text` |  |  |
| 6 | `template_id` | `text` | não | `'editorial-vogue'::text` |  |  |
| 7 | `branding` | `jsonb` | não | `jsonb_build_object('clientName', NULL::unknown, 'clientLogoUrl', NULL::unknown, 'clientCrmId', NULL::unknown, 'colors', jsonb_build_object('primary', '#2e4a3a', 'secondary', '#e86f2e', 'text', '#1a1a1a'), 'category', 'technology')` |  |  |
| 8 | `content_settings` | `jsonb` | não | `jsonb_build_object('showPrice', true, 'showCode', true, 'showPersonalization', true, 'showDescription', true, 'showDimensions', false, 'showMaterials', false, 'showColors', true, 'groupByCategory', false)` |  |  |
| 9 | `page_order` | `jsonb` | sim |  |  |  |
| 10 | `status` | `magazine_status` | não | `'draft'::magazine_status` |  |  |
| 11 | `public_token` | `text` | sim |  |  |  |
| 12 | `view_count` | `integer` | não | `0` |  |  |
| 13 | `published_at` | `timestamp with time zone` | sim |  |  |  |
| 14 | `archived_at` | `timestamp with time zone` | sim |  |  |  |
| 15 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 17 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 18 | `edit_version` | `bigint` | não | `0` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| magazines_edit_version_nonnegative | CHECK | `CHECK (edit_version >= 0)` |  |  | sim |
| magazines_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| magazines_owner_id_fkey | FOREIGN KEY | `FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| magazines_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| magazines_public_token_key | UNIQUE | `UNIQUE (public_token)` |  |  | sim |
| magazines_subtitle_len | CHECK | `CHECK (char_length(subtitle) <= 300)` |  |  | sim |
| magazines_template_id_fk | FOREIGN KEY | `FOREIGN KEY (template_id) REFERENCES magazine_templates_catalog(template_id)` | NO ACTION | NO ACTION | sim |
| magazines_title_len | CHECK | `CHECK (char_length(title) <= 200)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.magazine_duplicate_requests | magazine_duplicate_requests_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_duplicate_requests | magazine_duplicate_requests_source_magazine_id_fkey | source_magazine_id | CASCADE |
| public.magazine_items | magazine_items_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_reactions | magazine_public_reactions_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_2026_07 | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_2026_08 | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_2026_09 | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_2026_10 | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_2026_11 | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_2026_12 | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_2027_01 | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_2027_02 | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |
| public.magazine_public_view_events_default | magazine_public_view_events_magazine_id_fkey | magazine_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_magazines_not_deleted | btree | owner_id, updated_at | não | sim | `(deleted_at IS NULL)` | `CREATE INDEX idx_magazines_not_deleted ON public.magazines USING btree (owner_id, updated_at DESC) WHERE (deleted_at IS NULL)` |
| idx_magazines_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_magazines_organization_id ON public.magazines USING btree (organization_id)` |
| idx_magazines_published | btree | status, published_at | não | sim | `(status = 'published'::magazine_status)` | `CREATE INDEX idx_magazines_published ON public.magazines USING btree (status, published_at DESC) WHERE (status = 'published'::magazine_status)` |
| idx_magazines_template_id | btree | template_id | não | sim |  | `CREATE INDEX idx_magazines_template_id ON public.magazines USING btree (template_id)` |
| magazines_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX magazines_pkey ON public.magazines USING btree (id)` |
| magazines_public_token_key | btree | public_token | sim | sim |  | `CREATE UNIQUE INDEX magazines_public_token_key ON public.magazines USING btree (public_token)` |


## Policies (RLS)

### `magazines_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `magazines_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |

### `magazines_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (deleted_at IS NULL)) OR ((organization_id IS NOT NULL) AND (deleted_at IS NULL) AND (EXISTS ( SELECT 1    FROM organization_members om   WHERE ((om.organization_id = magazines.organization_id) AND (om.user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))))))` |
| WITH CHECK |  |

### `magazines_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR ((owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) AND (deleted_at IS NULL)))` |
| WITH CHECK | `(has_role(( SELECT ( SELECT auth.uid() AS uid) AS uid), 'admin'::app_role) OR (owner_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_magazines_guard_and_version_v2 | BEFORE | INSERT OR UPDATE | ROW | enabled | public.magazine_guard_and_version_v2 |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
