# public.feminine_color_config

> Lista de grupos de cores consideradas femininas para auto-link com target_audience e datas comemorativas

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
| 1 | `color_group_id` | `uuid` | não |  |  |  |
| 2 | `color_group_name` | `character varying(100)` | não |  |  |  |
| 3 | `notes` | `text` | sim |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 5 | `is_active` | `boolean` | sim | `true` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| feminine_color_config_color_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (color_group_id) REFERENCES color_groups(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| feminine_color_config_pkey | PRIMARY KEY | `PRIMARY KEY (color_group_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| feminine_color_config_pkey | btree | color_group_id | sim | sim |  | `CREATE UNIQUE INDEX feminine_color_config_pkey ON public.feminine_color_config USING btree (color_group_id)` |


## Policies (RLS)

### `auth_read_feminine_color_config`

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
