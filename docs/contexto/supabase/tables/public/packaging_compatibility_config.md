# public.packaging_compatibility_config

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
| usada por views | public.vw_packaging_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `config_key` | `character varying(50)` | não |  |  |  |
| 3 | `config_value` | `text` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| packaging_compatibility_config_config_key_key | UNIQUE | `UNIQUE (config_key)` |  |  | sim |
| packaging_compatibility_config_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| packaging_compatibility_config_config_key_key | btree | config_key | sim | sim |  | `CREATE UNIQUE INDEX packaging_compatibility_config_config_key_key ON public.packaging_compatibility_config USING btree (config_key)` |
| packaging_compatibility_config_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX packaging_compatibility_config_pkey ON public.packaging_compatibility_config USING btree (id)` |


## Policies (RLS)

### `auth_read_packaging_compatibility_config`

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
| trg_validate_config_hierarchy | AFTER | INSERT OR DELETE OR UPDATE | STATEMENT | enabled | public.fn_validate_packaging_config_hierarchy |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
