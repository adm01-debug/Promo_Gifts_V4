# public.system_documentation

> [META] Documentação do sistema dentro do próprio banco.

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
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `modulo` | `character varying(100)` | não |  |  |  |
| 3 | `tabela` | `character varying(100)` | sim |  |  |  |
| 4 | `proposito` | `text` | não |  |  |  |
| 5 | `relaciona_com` | `text[]` | sim |  |  |  |
| 6 | `observacoes` | `text` | sim |  |  |  |
| 7 | `criado_em` | `timestamp with time zone` | sim | `now()` |  |  |
| 8 | `atualizado_em` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| system_documentation_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| system_documentation_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX system_documentation_pkey ON public.system_documentation USING btree (id)` |


## Policies (RLS)

### `auth_read_system_documentation`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
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
