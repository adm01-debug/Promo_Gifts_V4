# public.kill_switch_hits

> Telemetria de hits do kill-switch (front-end e back-end). Sem PII.
Permite decidir quando é seguro desligar definitivamente uma função descontinuada.
Rotação semanal via cron — ver kill_switch_hits_purge_weekly.

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
| usada por views | public.v_kill_switch_hits_summary |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `bigint` | não | `nextval('kill_switch_hits_id_seq'::regclass)` |  |  |
| 2 | `switch_name` | `text` | não |  |  |  |
| 3 | `source` | `text` | não |  |  |  |
| 4 | `operation` | `text` | sim |  |  |  |
| 5 | `target` | `text` | sim |  |  |  |
| 6 | `origin` | `text` | sim |  |  |  |
| 7 | `user_role` | `text` | sim | `'anon'::text` |  |  |
| 8 | `occurred_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kill_switch_hits_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| kill_switch_hits_source_check | CHECK | `CHECK (source = ANY (ARRAY['front'::text, 'back'::text]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kill_switch_hits_occurred_at | btree | occurred_at | não | sim |  | `CREATE INDEX idx_kill_switch_hits_occurred_at ON public.kill_switch_hits USING btree (occurred_at DESC)` |
| kill_switch_hits_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kill_switch_hits_pkey ON public.kill_switch_hits USING btree (id)` |


## Policies (RLS)

### `kill_switch_hits_anon_select_deny`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
| USING | `false` |
| WITH CHECK |  |

### `kill_switch_hits_delete_admin`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `kill_switch_hits_insert_validated`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | anon, authenticated, service_role |
| USING |  |
| WITH CHECK | `((switch_name IS NOT NULL) AND ((length(switch_name) >= 3) AND (length(switch_name) <= 100)) AND (source IS NOT NULL) AND (occurred_at <= (now() + '00:05:00'::interval)) AND (occurred_at >= (now() - '01:00:00'::interval)) AND ((origin IS NULL) OR (length(origin) <= 500)) AND ((operation IS NULL) OR (length(operation) <= 200)) AND ((target IS NULL) OR (length(target) <= 200)))` |

### `kill_switch_hits_read_admin`

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
| trg_anon_rate_guard | BEFORE | INSERT | ROW | enabled | public.fn_anon_insert_rate_guard |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
