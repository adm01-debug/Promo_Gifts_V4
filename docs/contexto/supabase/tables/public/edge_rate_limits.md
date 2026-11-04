# public.edge_rate_limits

> Migrado do Lovable em 2026-05-22 (Lote B). Rate limit transitório (chave -> contador + reset_at). Dados NÃO migrados (transitórios).

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
| 1 | `key` | `text` | não |  |  |  |
| 2 | `count` | `integer` | não | `0` |  |  |
| 3 | `reset_at` | `timestamp with time zone` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 5 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| edge_rate_limits_pkey | PRIMARY KEY | `PRIMARY KEY (key)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| edge_rate_limits_pkey | btree | key | sim | sim |  | `CREATE UNIQUE INDEX edge_rate_limits_pkey ON public.edge_rate_limits USING btree (key)` |
| idx_edge_rate_limits_reset_at | btree | reset_at | não | sim |  | `CREATE INDEX idx_edge_rate_limits_reset_at ON public.edge_rate_limits USING btree (reset_at)` |


## Policies (RLS)

### `Service role can do everything on edge_rate_limits`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(( SELECT ( SELECT auth.role() AS role) AS role) = 'service_role'::text)` |
| WITH CHECK | `(( SELECT ( SELECT auth.role() AS role) AS role) = 'service_role'::text)` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
