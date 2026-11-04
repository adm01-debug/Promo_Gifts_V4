# public.enrichment_log

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
| usada por views | public.v_monthly_costs |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `contact_id` | `uuid` | sim |  |  |  |
| 3 | `enrichment_level` | `integer` | sim |  |  |  |
| 4 | `provider_name` | `text` | sim |  |  |  |
| 5 | `success` | `boolean` | sim |  |  |  |
| 6 | `data_found` | `jsonb` | sim |  |  |  |
| 7 | `error_message` | `text` | sim |  |  |  |
| 8 | `credits_used` | `numeric(10,4)` | sim | `0` |  |  |
| 9 | `cost_usd` | `numeric(10,4)` | sim | `0` |  |  |
| 10 | `response_time_ms` | `integer` | sim |  |  |  |
| 11 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| enrichment_log_contact_id_fkey | FOREIGN KEY | `FOREIGN KEY (contact_id) REFERENCES enriched_contacts(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| enrichment_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| enrichment_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX enrichment_log_pkey ON public.enrichment_log USING btree (id)` |
| idx_enrichment_log_contact_id | btree | contact_id | não | sim |  | `CREATE INDEX idx_enrichment_log_contact_id ON public.enrichment_log USING btree (contact_id)` |


## Policies (RLS)

### `li_deny_anon`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `false` |
| WITH CHECK | `false` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
