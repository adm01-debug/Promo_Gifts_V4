# public.custom_kits

> Wave 3.3.A 2026-05-22: removidos 19 campos legacy. Schema consolidado.

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
| 2 | `organization_id` | `uuid` | não | `'5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid` |  |  |
| 3 | `name` | `text` | sim |  |  |  |
| 17 | `total_price` | `numeric(10,2)` | sim | `0` |  |  |
| 18 | `personalization_price` | `numeric(10,2)` | sim | `0` |  |  |
| 20 | `kit_quantity` | `integer` | sim | `1` |  |  |
| 21 | `status` | `text` | sim | `'draft'::text` |  |  |
| 22 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 23 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 29 | `user_id` | `uuid` | sim |  |  | Espelho de created_by mantido por trigger. Hook moderno (useCustomKitPersistence) usa user_id; código legado pode usar created_by. Ambos sincronizam. |
| 30 | `kit_type` | `text` | sim |  |  |  |
| 31 | `box_data` | `jsonb` | sim |  |  | [NOVA - hook moderno] Substitui packaging_* legados. JSON com dados estruturados da caixa/embalagem. |
| 32 | `items_data` | `jsonb` | sim | `'[]'::jsonb` |  | [NOVA - hook moderno] Substitui items legado. Array de objetos. |
| 33 | `personalization_data` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 34 | `box_price` | `numeric(12,2)` | sim | `0` |  |  |
| 35 | `items_price` | `numeric(12,2)` | sim | `0` |  |  |
| 36 | `volume_usage_percent` | `numeric(5,2)` | sim | `0` |  |  |
| 37 | `color` | `text` | sim | `'#3B82F6'::text` |  |  |
| 38 | `icon` | `text` | sim | `'Package'::text` |  |  |
| 39 | `tag` | `text` | sim |  |  |  |
| 40 | `description` | `text` | sim |  |  |  |
| 41 | `is_favorite` | `boolean` | não | `false` |  |  |
| 42 | `is_pinned` | `boolean` | não | `false` |  |  |
| 43 | `last_used_at` | `timestamp with time zone` | sim |  |  |  |
| 44 | `revision` | `integer` | não | `0` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| custom_kits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| custom_kits_revision_non_negative | CHECK | `CHECK (revision >= 0)` |  |  | sim |
| custom_kits_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.kit_collaborators | kit_collaborators_kit_id_fkey | kit_id | CASCADE |
| public.kit_comments | kit_comments_kit_id_fkey | kit_id | CASCADE |
| public.kit_save_requests | kit_save_requests_kit_id_fkey | kit_id | CASCADE |
| public.kit_share_tokens | kit_share_tokens_kit_id_fkey | kit_id | CASCADE |
| public.kit_variants | kit_variants_kit_master_id_fkey | kit_master_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| custom_kits_one_pinned_per_user_idx | btree | user_id | sim | sim | `is_pinned` | `CREATE UNIQUE INDEX custom_kits_one_pinned_per_user_idx ON public.custom_kits USING btree (user_id) WHERE is_pinned` |
| custom_kits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX custom_kits_pkey ON public.custom_kits USING btree (id)` |
| idx_custom_kits_favorite | btree | user_id, is_favorite | não | sim |  | `CREATE INDEX idx_custom_kits_favorite ON public.custom_kits USING btree (user_id, is_favorite)` |


## Policies (RLS)

### `ck_delete_own_or_coord`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `ck_insert_self`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `ck_select_own_or_coord`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `ck_update_own_or_coord`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK | `((user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid)) OR is_coord_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_custom_kits_sync_user_id | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_custom_kits_sync_user_id |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
