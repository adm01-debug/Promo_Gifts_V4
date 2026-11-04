# public.classify_functions_registry

> Registro de funções de classificação automática de produtos.
Adicionar nova função = INSERT nesta tabela. O trigger lê dinamicamente.
Criada em 31/01/2026.

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
| usada por views | public.vw_classify_functions_status |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `integer` | não | `nextval('classify_functions_registry_id_seq'::regclass)` |  |  |
| 2 | `function_name` | `character varying(100)` | não |  |  | Nome da função PostgreSQL (ex: classify_pen) |
| 3 | `description` | `text` | sim |  |  |  |
| 4 | `is_field` | `character varying(50)` | não |  |  | Campo de validação no retorno JSON (ex: is_pen) |
| 5 | `priority` | `integer` | não | `100` |  | Ordem de execução: menor = primeiro. Kits devem ter prioridade < 50 |
| 6 | `is_active` | `boolean` | não | `true` |  | Se FALSE, função não será chamada pelo trigger |
| 7 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 8 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_function_name | CHECK | `CHECK (function_name::text ~ '^classify_[a-z_]+$'::text)` |  |  | sim |
| chk_is_field | CHECK | `CHECK (is_field::text ~ '^is_[a-z_]+$'::text)` |  |  | sim |
| chk_priority | CHECK | `CHECK (priority >= 0 AND priority <= 1000)` |  |  | sim |
| classify_functions_registry_function_name_key | UNIQUE | `UNIQUE (function_name)` |  |  | sim |
| classify_functions_registry_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| classify_functions_registry_function_name_key | btree | function_name | sim | sim |  | `CREATE UNIQUE INDEX classify_functions_registry_function_name_key ON public.classify_functions_registry USING btree (function_name)` |
| classify_functions_registry_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX classify_functions_registry_pkey ON public.classify_functions_registry USING btree (id)` |


## Policies (RLS)

### `auth_read_classify_functions_registry`

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
| trg_classify_registry_updated_at | BEFORE | UPDATE | ROW | enabled | public.update_classify_registry_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
