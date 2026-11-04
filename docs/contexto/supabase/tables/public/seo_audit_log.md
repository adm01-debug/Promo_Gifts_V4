# public.seo_audit_log

> Histórico de auditorias SEO para tracking de melhorias ao longo do tempo.

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
| 2 | `entity_type` | `text` | não |  |  |  |
| 3 | `entity_id` | `uuid` | não |  |  |  |
| 4 | `seo_score` | `integer` | não |  |  |  |
| 5 | `previous_score` | `integer` | sim |  |  |  |
| 6 | `issues` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 7 | `warnings` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 8 | `passed_checks` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 9 | `suggestions` | `jsonb` | sim | `'[]'::jsonb` |  |  |
| 10 | `meta_snapshot` | `jsonb` | sim |  |  |  |
| 11 | `audited_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 12 | `audit_trigger` | `text` | sim | `'manual'::text` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| seo_audit_log_audit_trigger_check | CHECK | `CHECK (audit_trigger = ANY (ARRAY['manual'::text, 'insert'::text, 'update'::text, 'scheduled'::text]))` |  |  | sim |
| seo_audit_log_entity_type_check | CHECK | `CHECK (entity_type = ANY (ARRAY['product'::text, 'category'::text, 'article'::text, 'page'::text]))` |  |  | sim |
| seo_audit_log_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| seo_audit_log_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seo_audit_log_pkey ON public.seo_audit_log USING btree (id)` |


## Policies (RLS)

### `seo_audit_log_select_supervisor_or_above`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_supervisor_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
