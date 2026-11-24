# public.permissions

> Catálogo de permissões disponíveis na aplicação. Cada permissão possui um código, uma categoria e rótulos para exibição e documentação.

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
| 1 | `code` | `text` | não |  |  | Código identificador da permissão. |
| 2 | `category` | `text` | não |  |  | Categoria usada para agrupar permissões relacionadas. |
| 3 | `label` | `text` | não |  |  | Rótulo legível da permissão para exibição. |
| 4 | `description` | `text` | sim |  |  | Descrição do propósito da permissão. |
| 5 | `created_at` | `timestamp with time zone` | não | `now()` |  | Data e hora de criação da permissão. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| permissions_pkey | PRIMARY KEY | `PRIMARY KEY (code)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.role_permissions | role_permissions_permission_code_fkey | permission_code | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| permissions_pkey | btree | code | sim | sim |  | `CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (code)` |


## Policies (RLS)

### `Authenticated read permissions`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `permissions_dev_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `permissions_dev_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `permissions_dev_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_dev(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
