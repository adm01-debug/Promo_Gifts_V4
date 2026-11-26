# ops.wraparound_monitor_log

> PLANO_DBA E33 — snapshot diário de risco de wraparound de XID/multixact, uso de sequências int4/int2, WAL retido por replication slot e proporção TOAST/heap (top 10), alimentada pelo cron wraparound-toast-sequence-monitor (fn_cron_safe_run p_key=167). RLS deny-all intencional (ver .security/rls-no-policy-allowlist.json) — só service_role/postgres lê/escreve; zero policies, sem GRANT a anon/authenticated. Consumida pelo workflow diário wraparound-monitor-report.yml (scripts/wraparound-monitor-check.mjs).

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
| 1 | `id` | `bigint` | não |  | a |  |
| 2 | `captured_at` | `timestamp with time zone` | não | `now()` |  |  |
| 3 | `metric` | `text` | não |  |  |  |
| 4 | `object_name` | `text` | sim |  |  |  |
| 5 | `value_numeric` | `numeric` | sim |  |  |  |
| 6 | `value_pct` | `numeric` | sim |  |  |  |
| 7 | `unit` | `text` | sim |  |  |  |
| 8 | `detail` | `jsonb` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| wraparound_monitor_log_metric_check | CHECK | `CHECK (metric = ANY (ARRAY['xid_age'::text, 'mxid_age'::text, 'sequence_pct_used'::text, 'replication_slot_retained_bytes'::text, 'toast_pct_of_heap'::text]))` |  |  | sim |
| wraparound_monitor_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_wraparound_monitor_log_metric_captured | btree | metric, captured_at | não | sim |  | `CREATE INDEX idx_wraparound_monitor_log_metric_captured ON ops.wraparound_monitor_log USING btree (metric, captured_at DESC)` |
| wraparound_monitor_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX wraparound_monitor_log_pkey ON ops.wraparound_monitor_log USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS habilitado **sem policies**: nenhum acesso via API (anon/authenticated).



## Triggers

_nenhum_


## Grants

_nenhum_
