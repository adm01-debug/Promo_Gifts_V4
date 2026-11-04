# public.video_types

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
| 2 | `code` | `character varying(50)` | não |  |  |  |
| 3 | `name` | `character varying(100)` | não |  |  |  |
| 4 | `name_en` | `character varying(100)` | sim |  |  |  |
| 5 | `description` | `text` | sim |  |  |  |
| 6 | `category` | `character varying(50)` | não | `'product'::character varying` |  |  |
| 7 | `autoplay` | `boolean` | sim | `false` |  |  |
| 8 | `muted` | `boolean` | sim | `false` |  |  |
| 9 | `loop` | `boolean` | sim | `false` |  |  |
| 10 | `controls` | `boolean` | sim | `true` |  |  |
| 11 | `display_priority` | `integer` | sim | `50` |  |  |
| 12 | `icon` | `character varying(50)` | sim | `'video'::character varying` |  |  |
| 13 | `is_active` | `boolean` | sim | `true` |  |  |
| 14 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 15 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| video_types_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| video_types_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_videos | product_videos_video_type_id_fkey | video_type_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| video_types_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX video_types_code_key ON public.video_types USING btree (code)` |
| video_types_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX video_types_pkey ON public.video_types USING btree (id)` |


## Policies (RLS)

### `auth_read_video_types`

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
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
