# public.seo_redirects

> Redirects 301/302 para manter link equity e evitar 404.

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
| 2 | `source_path` | `text` | não |  |  |  |
| 3 | `target_path` | `text` | não |  |  |  |
| 4 | `redirect_type` | `integer` | não | `301` |  |  |
| 5 | `is_regex` | `boolean` | sim | `false` |  |  |
| 6 | `is_active` | `boolean` | sim | `true` |  |  |
| 7 | `reason` | `text` | sim |  |  |  |
| 8 | `hit_count` | `integer` | sim | `0` |  |  |
| 9 | `last_hit_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 11 | `expires_at` | `timestamp with time zone` | sim |  |  |  |
| 12 | `created_by` | `uuid` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| seo_redirects_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| seo_redirects_redirect_type_check | CHECK | `CHECK (redirect_type = ANY (ARRAY[301, 302, 307, 308]))` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| seo_redirects_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX seo_redirects_pkey ON public.seo_redirects USING btree (id)` |
| uq_seo_redirects_source_active | btree | source_path | sim | sim | `(is_active = true)` | `CREATE UNIQUE INDEX uq_seo_redirects_source_active ON public.seo_redirects USING btree (source_path) WHERE (is_active = true)` |


## Policies (RLS)

### `auth_read_seo_redirects`

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
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
