# public.profiles

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.bi_quotes_summary, public.v_quote_seller_kpis |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `email` | `text` | sim |  |  |  |
| 3 | `full_name` | `text` | sim |  |  |  |
| 4 | `role` | `text` | sim | `'user'::text` |  | DERIVADO/read-only (vocabulario EN: admin/manager/sales). Fonte de verdade = public.user_roles (enum PT). Sincronizado pelo trigger user_roles_sync_profile_role via fn_map_role_enum_to_profile. Nao escrever manualmente. |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `avatar_url` | `text` | sim |  |  |  |
| 8 | `phone` | `text` | sim |  |  |  |
| 9 | `department` | `text` | sim |  |  |  |
| 10 | `is_active` | `boolean` | sim | `true` |  |  |
| 11 | `last_login_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `preferences` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 13 | `bitrix_id` | `integer` | sim |  |  | ID do usuário no Bitrix24 CRM |
| 14 | `user_id` | `uuid` | sim |  |  |  |
| 15 | `organization_id` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| profiles_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| profiles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| profiles_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| profiles_user_id_key | UNIQUE | `UNIQUE (user_id)` |  |  | sim |
| profiles_valid_role | CHECK | `CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'sales'::text, 'seller'::text]))` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.audit_log | audit_log_user_id_fkey | user_id | SET NULL |
| public.discount_approval_audit | discount_approval_audit_actor_id_fkey | actor_id | SET NULL |
| public.discount_approval_requests | discount_approval_requests_admin_id_fkey | admin_id | SET NULL |
| public.discount_approval_requests | discount_approval_requests_seller_id_fkey | seller_id | NO ACTION |
| public.markup_configurations | markup_configurations_created_by_fkey | created_by | NO ACTION |
| public.price_history | price_history_changed_by_fkey | changed_by | NO ACTION |
| public.product_novelties | fk_pn_created_by | created_by | SET NULL |
| public.quotes | quotes_assigned_to_fkey | assigned_to | SET NULL |
| public.quotes | quotes_created_by_fkey | created_by | SET NULL |
| public.quotes | quotes_seller_id_fkey | seller_id | NO ACTION |
| public.seller_discount_limits | seller_discount_limits_set_by_fkey | set_by | SET NULL |
| public.seller_discount_limits | seller_discount_limits_user_id_fkey | user_id | CASCADE |
| public.user_roles | user_roles_user_id_profiles_fkey | user_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_profiles_bitrix_id | btree | bitrix_id | sim | sim | `(bitrix_id IS NOT NULL)` | `CREATE UNIQUE INDEX idx_profiles_bitrix_id ON public.profiles USING btree (bitrix_id) WHERE (bitrix_id IS NOT NULL)` |
| idx_profiles_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_profiles_organization_id ON public.profiles USING btree (organization_id)` |
| profiles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)` |
| profiles_user_id_key | btree | user_id | sim | sim |  | `CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id)` |


## Policies (RLS)

### `profiles_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) AND (( SELECT ( SELECT auth.uid() AS uid) AS uid) = id))` |

### `profiles_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id) OR is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid)))` |
| WITH CHECK |  |

### `profiles_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |
| WITH CHECK | `(( SELECT ( SELECT auth.uid() AS uid) AS uid) = user_id)` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_audit_profiles | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_audit_row_change |
| trg_grant_default_role | AFTER | INSERT | ROW | enabled | public.fn_grant_default_role_on_profile |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
