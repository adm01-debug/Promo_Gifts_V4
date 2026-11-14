# public.crm_seller_identity_links

> Mapeamento 1:1 canônico auth.users -> public.users.id do CRM externo usado pelo crm-db-bridge.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `auth_user_id` | `uuid` | não |  |  |  |
| 2 | `crm_seller_id` | `bigint` | não |  |  | Identificador inteiro de public.users.id no projeto CRM externo pgxfvjmuubtbowutlide. |
| 3 | `link_source` | `text` | não | `'email_bootstrap'::text` |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| crm_seller_identity_links_auth_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| crm_seller_identity_links_crm_seller_id_check | CHECK | `CHECK (crm_seller_id > 0)` |  |  | sim |
| crm_seller_identity_links_crm_seller_id_key | UNIQUE | `UNIQUE (crm_seller_id)` |  |  | sim |
| crm_seller_identity_links_link_source_check | CHECK | `CHECK (link_source = ANY (ARRAY['email_bootstrap'::text, 'manual'::text]))` |  |  | sim |
| crm_seller_identity_links_pkey | PRIMARY KEY | `PRIMARY KEY (auth_user_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| crm_seller_identity_links_crm_seller_id_key | btree | crm_seller_id | sim | sim |  | `CREATE UNIQUE INDEX crm_seller_identity_links_crm_seller_id_key ON public.crm_seller_identity_links USING btree (crm_seller_id)` |
| crm_seller_identity_links_pkey | btree | auth_user_id | sim | sim |  | `CREATE UNIQUE INDEX crm_seller_identity_links_pkey ON public.crm_seller_identity_links USING btree (auth_user_id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
