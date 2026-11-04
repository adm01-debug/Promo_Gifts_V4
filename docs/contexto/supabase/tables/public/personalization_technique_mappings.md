# public.personalization_technique_mappings

> Ponte entre personalization_techniques (geração de mockup) e tecnicas_gravacao (precificação). Permite que uma técnica de UI mapeie para 1+ grupos de preço. Criado 2026-06-23 — fix Bug #5 arquitetura gravação.

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
| 2 | `personalization_tech_id` | `uuid` | não |  |  |  |
| 3 | `tecnica_gravacao_codigo` | `text` | não |  |  |  |
| 4 | `is_primary` | `boolean` | não | `true` |  |  |
| 5 | `notes` | `text` | sim |  |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| personalization_technique_map_personalization_tech_id_tecni_key | UNIQUE | `UNIQUE (personalization_tech_id, tecnica_gravacao_codigo)` |  |  | sim |
| personalization_technique_mappings_personalization_tech_id_fkey | FOREIGN KEY | `FOREIGN KEY (personalization_tech_id) REFERENCES personalization_techniques(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| personalization_technique_mappings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| personalization_technique_mappings_tecnica_gravacao_codigo_fkey | FOREIGN KEY | `FOREIGN KEY (tecnica_gravacao_codigo) REFERENCES tecnicas_gravacao(codigo) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ptm_tg_codigo | btree | tecnica_gravacao_codigo | não | sim |  | `CREATE INDEX idx_ptm_tg_codigo ON public.personalization_technique_mappings USING btree (tecnica_gravacao_codigo)` |
| personalization_technique_map_personalization_tech_id_tecni_key | btree | personalization_tech_id, tecnica_gravacao_codigo | sim | sim |  | `CREATE UNIQUE INDEX personalization_technique_map_personalization_tech_id_tecni_key ON public.personalization_technique_mappings USING btree (personalization_tech_id, tecnica_gravacao_codigo)` |
| personalization_technique_mappings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX personalization_technique_mappings_pkey ON public.personalization_technique_mappings USING btree (id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_ptm_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_update_ptm_timestamp |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
