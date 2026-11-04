# public.system_kill_switches

> Switches para desligar features/edge-functions legadas a quente. Edge functions devem checar esta tabela antes de processar.

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
| 1 | `switch_name` | `text` | não |  |  |  |
| 2 | `enabled` | `boolean` | não | `true` |  |  |
| 3 | `reason` | `text` | sim |  |  |  |
| 4 | `legacy_message` | `text` | sim |  |  |  |
| 5 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 6 | `updated_by` | `uuid` | sim |  |  |  |
| 7 | `rollout_percentage` | `smallint` | não | `100` |  | Porcentagem de tráfego (0-100) que recebe o kill-switch quando enabled=false. 100 = todos os clientes (default). 5 = apenas 5% (canary). Útil para A/B testing antes de desligar definitivamente. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| system_kill_switches_pkey | PRIMARY KEY | `PRIMARY KEY (switch_name)` |  |  | sim |
| system_kill_switches_rollout_percentage_check | CHECK | `CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)` |  |  | sim |
| system_kill_switches_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_system_kill_switches_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_system_kill_switches_updated_by ON public.system_kill_switches USING btree (updated_by)` |
| system_kill_switches_pkey | btree | switch_name | sim | sim |  | `CREATE UNIQUE INDEX system_kill_switches_pkey ON public.system_kill_switches USING btree (switch_name)` |


## Policies (RLS)

### `kill_switches_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `kill_switches_insert_admin`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `kill_switches_update_admin`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `rls_restrictive_system_kill_switches`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated, service_role |
| USING | `true` |
| WITH CHECK |  |

### `system_kill_switches_authenticated_select`

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
| anon | SELECT |
| authenticated | SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
