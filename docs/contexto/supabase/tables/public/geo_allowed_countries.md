# public.geo_allowed_countries

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
| 2 | `country_code` | `character(2)` | não |  |  |  |
| 3 | `country_name` | `text` | não |  |  |  |
| 4 | `is_active` | `boolean` | sim | `true` |  |  |
| 5 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 6 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| geo_allowed_countries_country_code_key | UNIQUE | `UNIQUE (country_code)` |  |  | sim |
| geo_allowed_countries_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| geo_allowed_countries_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| geo_allowed_countries_country_code_key | btree | country_code | sim | sim |  | `CREATE UNIQUE INDEX geo_allowed_countries_country_code_key ON public.geo_allowed_countries USING btree (country_code)` |
| geo_allowed_countries_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX geo_allowed_countries_pkey ON public.geo_allowed_countries USING btree (id)` |
| idx_geo_allowed_countries_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_geo_allowed_countries_created_by ON public.geo_allowed_countries USING btree (created_by)` |


## Policies (RLS)

### `Users can view allowed countries`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
