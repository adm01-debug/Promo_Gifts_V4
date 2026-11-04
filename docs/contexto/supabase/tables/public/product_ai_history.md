# public.product_ai_history

> Histórico de todas as gerações AI por produto. Inclui: ai_title, ai_description, ai_summary, schema_json, tokens, tempo, provedor.

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
| usada por views | public.vw_ai_history_stats |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `version` | `integer` | não |  |  | Número da versão (1, 2, 3...) |
| 4 | `ai_title` | `text` | não |  |  | Título gerado nesta versão |
| 5 | `ai_description` | `text` | não |  |  | Descrição gerada nesta versão |
| 6 | `model` | `character varying(50)` | não |  |  | Modelo de IA usado (ex: claude-3-sonnet-20240229) |
| 7 | `prompt_tokens` | `integer` | sim |  |  | Quantidade de tokens no prompt enviado |
| 8 | `completion_tokens` | `integer` | sim |  |  | Quantidade de tokens na resposta |
| 9 | `total_tokens` | `integer` | sim |  |  | Total de tokens consumidos |
| 10 | `generation_time_ms` | `integer` | sim |  |  | Tempo de geração em milissegundos |
| 11 | `context_snapshot` | `jsonb` | não | `'{}'::jsonb` |  | Snapshot dos dados usados na geração (categoria, raw_data, config) |
| 12 | `generated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 14 | `ai_summary` | `text` | sim |  |  |  |
| 15 | `schema_json` | `jsonb` | sim |  |  |  |
| 16 | `ai_provider` | `text` | sim | `'anthropic'::text` |  |  |
| 17 | `enrichment_type` | `text` | sim | `'all'::text` |  |  |
| 18 | `organization_id` | `uuid` | sim | `'5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_ai_history_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_ai_history_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| unique_product_version | UNIQUE | `UNIQUE (product_id, version)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| product_ai_history_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_ai_history_pkey ON public.product_ai_history USING btree (id)` |
| unique_product_version | btree | product_id, version | sim | sim |  | `CREATE UNIQUE INDEX unique_product_version ON public.product_ai_history USING btree (product_id, version)` |


## Policies (RLS)

### `auth_read_product_ai_history`

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
| anon | REFERENCES, TRIGGER |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
