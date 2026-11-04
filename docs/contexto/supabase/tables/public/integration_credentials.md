# public.integration_credentials

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
| 2 | `provider` | `text` | não |  |  |  |
| 3 | `secret_name` | `text` | não |  |  | Nome canônico do secret (ex: BITRIX_API_KEY, EXTERNAL_PROMOBRIND_URL). Match com helper supabase/functions/_shared/credentials.ts. |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `credential_type` | `text` | não | `'api_key'::text` |  |  |
| 6 | `secret_value` | `text` | não |  |  | Valor do secret. Lido pelo helper resolveCredential() via service_role. RLS bloqueia agente/supervisor de SELECT. |
| 7 | `metadata` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 8 | `is_active` | `boolean` | não | `true` |  |  |
| 9 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_by` | `uuid` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 12 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `notes` | `text` | sim |  |  | Anotação livre sobre a credencial (substitui description; ambos coexistem). |
| 14 | `updated_by` | `uuid` | sim |  |  | Última pessoa (uuid) que rotacionou/definiu este secret via /admin/conexoes. |
| 15 | `masked_suffix` | `text` | sim |  |  | Últimos 4 caracteres do secret_value (preenchido por trigger BIU). UI exibe sem revelar valor. |
| 16 | `length` | `integer` | sim |  |  | Tamanho do secret_value em caracteres (preenchido por trigger BIU). UI exibe sem revelar valor. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| integration_credentials_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| integration_credentials_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| integration_credentials_secret_name_key | UNIQUE | `UNIQUE (secret_name)` |  |  | sim |
| integration_credentials_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_integration_credentials_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_integration_credentials_created_by ON public.integration_credentials USING btree (created_by)` |
| idx_integration_credentials_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_integration_credentials_updated_by ON public.integration_credentials USING btree (updated_by)` |
| integration_credentials_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX integration_credentials_pkey ON public.integration_credentials USING btree (id)` |
| integration_credentials_secret_name_key | btree | secret_name | sim | sim |  | `CREATE UNIQUE INDEX integration_credentials_secret_name_key ON public.integration_credentials USING btree (secret_name)` |


## Policies (RLS)

### `Admins can delete integration credentials`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `Admins can insert integration credentials`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `Admins can update integration credentials`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `Admins can view integration credentials`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tg_integration_credentials_derive_biu | BEFORE | INSERT OR UPDATE | ROW | enabled | public.tg_integration_credentials_derive |
| trg_integration_credentials_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, SELECT, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
