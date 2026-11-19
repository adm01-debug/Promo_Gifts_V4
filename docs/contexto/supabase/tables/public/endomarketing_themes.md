# public.endomarketing_themes

> Temas de endomarketing (comunicação interna) para classificar produtos. Separado de datas comemorativas/público-alvo.

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
| 2 | `name` | `text` | não |  |  |  |
| 3 | `slug` | `text` | não |  |  |  |
| 4 | `is_active` | `boolean` | não | `true` |  |  |
| 5 | `display_order` | `integer` | não | `0` |  |  |
| 6 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| endomarketing_themes_name_key | UNIQUE | `UNIQUE (name)` |  |  | sim |
| endomarketing_themes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| endomarketing_themes_slug_key | UNIQUE | `UNIQUE (slug)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_endomarketing | product_endomarketing_theme_id_fkey | theme_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| endomarketing_themes_name_key | btree | name | sim | sim |  | `CREATE UNIQUE INDEX endomarketing_themes_name_key ON public.endomarketing_themes USING btree (name)` |
| endomarketing_themes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX endomarketing_themes_pkey ON public.endomarketing_themes USING btree (id)` |
| endomarketing_themes_slug_key | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX endomarketing_themes_slug_key ON public.endomarketing_themes USING btree (slug)` |


## Policies (RLS)

### `endomarketing_themes_auth_read`

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
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
