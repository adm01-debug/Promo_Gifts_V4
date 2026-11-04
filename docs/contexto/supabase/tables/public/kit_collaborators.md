# public.kit_collaborators

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `kit_id` | `uuid` | não |  |  |  |
| 3 | `user_id` | `uuid` | não |  |  |  |
| 4 | `permission` | `text` | não | `'view'::text` |  |  |
| 5 | `invited_by` | `uuid` | sim |  |  |  |
| 6 | `invited_email` | `text` | sim |  |  |  |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_collaborators_kit_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_id) REFERENCES custom_kits(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_collaborators_kit_id_user_id_key | UNIQUE | `UNIQUE (kit_id, user_id)` |  |  | sim |
| kit_collaborators_permission_check | CHECK | `CHECK (permission = ANY (ARRAY['view'::text, 'edit'::text]))` |  |  | sim |
| kit_collaborators_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| kit_collaborators_kit_id_user_id_key | btree | kit_id, user_id | sim | sim |  | `CREATE UNIQUE INDEX kit_collaborators_kit_id_user_id_key ON public.kit_collaborators USING btree (kit_id, user_id)` |
| kit_collaborators_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_collaborators_pkey ON public.kit_collaborators USING btree (id)` |


## Policies (RLS)

### `Owner can invite collaborators`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_kit_owner(kit_id, ( SELECT auth.uid() AS uid))` |

### `Owner can remove collaborators`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_kit_owner(kit_id, ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `Owner can update collaborators`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_kit_owner(kit_id, ( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `View collaborators if owner or self`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(is_kit_owner(kit_id, ( SELECT auth.uid() AS uid)) OR (user_id = auth.uid()))` |
| WITH CHECK |  |

### `rls_restrictive_kit_collaborators`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated, service_role |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
