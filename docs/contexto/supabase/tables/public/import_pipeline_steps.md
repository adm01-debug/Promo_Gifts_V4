# public.import_pipeline_steps

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
| usada por views | public.v_pipeline_next_step, public.v_pipeline_progress |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `integer` | não | `nextval('import_pipeline_steps_id_seq'::regclass)` |  |  |
| 2 | `fase` | `character varying(80)` | não |  |  |  |
| 3 | `etapa` | `integer` | não |  |  |  |
| 4 | `titulo` | `character varying(200)` | não |  |  |  |
| 5 | `descricao` | `text` | sim |  |  |  |
| 6 | `comando_resumo` | `text` | sim |  |  |  |
| 7 | `dependencia` | `integer[]` | sim |  |  |  |
| 8 | `status` | `character varying(20)` | não | `'pending'::character varying` |  |  |
| 9 | `resultado` | `jsonb` | sim | `'{}'::jsonb` |  |  |
| 10 | `error_message` | `text` | sim |  |  |  |
| 11 | `started_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `completed_at` | `timestamp with time zone` | sim |  |  |  |
| 13 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| import_pipeline_steps_etapa_key | UNIQUE | `UNIQUE (etapa)` |  |  | sim |
| import_pipeline_steps_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| import_pipeline_steps_etapa_key | btree | etapa | sim | sim |  | `CREATE UNIQUE INDEX import_pipeline_steps_etapa_key ON public.import_pipeline_steps USING btree (etapa)` |
| import_pipeline_steps_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX import_pipeline_steps_pkey ON public.import_pipeline_steps USING btree (id)` |


## Policies (RLS)

### `auth_read_import_pipeline_steps`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_pipeline_steps_updated_at | BEFORE | UPDATE | ROW | enabled | public.fn_pipeline_steps_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
