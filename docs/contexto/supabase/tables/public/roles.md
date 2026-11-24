# public.roles

> Registro de roles para a tela admin (RolesPage). Semeado do enum app_role.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 1 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | Identificador UUID do papel exibido na tela administrativa. |
| 2 | `name` | `text` | não |  |  | Nome do papel. |
| 3 | `description` | `text` | sim |  |  | Descrição legível do papel. |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  | Data e hora de criação do registro do papel. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| roles_name_key | UNIQUE | `UNIQUE (name)` |  |  | sim |
| roles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| roles_name_key | btree | name | sim | sim |  | `CREATE UNIQUE INDEX roles_name_key ON public.roles USING btree (name)` |
| roles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)` |


## Policies (RLS)

### `roles_admin_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
