# supplier_stricker.sync_log

> Log de sincronizações com a API Stricker

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | não |
| RLS forçado (owner) | não |
| policies | 0 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `sync_type` | `character varying(50)` | não |  |  |  |
| 3 | `sync_source` | `character varying(50)` | sim | `'api'::character varying` |  |  |
| 4 | `records_fetched` | `integer` | sim | `0` |  |  |
| 5 | `records_inserted` | `integer` | sim | `0` |  |  |
| 6 | `records_updated` | `integer` | sim | `0` |  |  |
| 7 | `records_deleted` | `integer` | sim | `0` |  |  |
| 8 | `status` | `character varying(20)` | sim | `'running'::character varying` |  |  |
| 9 | `error_message` | `text` | sim |  |  |  |
| 10 | `started_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `duration_seconds` | `integer` | sim |  |  |  |
| 13 | `triggered_by` | `character varying(50)` | sim | `'n8n'::character varying` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| sync_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_stricker_synclog_started | btree | started_at | não | sim |  | `CREATE INDEX idx_stricker_synclog_started ON supplier_stricker.sync_log USING btree (started_at)` |
| idx_stricker_synclog_status | btree | status | não | sim |  | `CREATE INDEX idx_stricker_synclog_status ON supplier_stricker.sync_log USING btree (status)` |
| idx_stricker_synclog_type | btree | sync_type | não | sim |  | `CREATE INDEX idx_stricker_synclog_type ON supplier_stricker.sync_log USING btree (sync_type)` |
| sync_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX sync_log_pkey ON supplier_stricker.sync_log USING btree (id)` |


## Policies (RLS)

> ⚠️ RLS **desabilitado** nesta tabela.



## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | SELECT |
