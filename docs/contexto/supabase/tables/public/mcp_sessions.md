# public.mcp_sessions

> Sessoes de portais externos usadas por MCPs (cookie + auto-refresh).

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
| 1 | `chave` | `text` | não |  |  |  |
| 2 | `cookie` | `text` | não |  |  |  |
| 3 | `atualizado_em` | `timestamp with time zone` | não | `now()` |  |  |
| 4 | `ultimo_check` | `timestamp with time zone` | sim |  |  |  |
| 5 | `viva` | `boolean` | sim |  |  |  |
| 6 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| mcp_sessions_pkey | PRIMARY KEY | `PRIMARY KEY (chave)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| mcp_sessions_pkey | btree | chave | sim | sim |  | `CREATE UNIQUE INDEX mcp_sessions_pkey ON public.mcp_sessions USING btree (chave)` |


## Policies (RLS)

### `mcp_sessions_service_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
