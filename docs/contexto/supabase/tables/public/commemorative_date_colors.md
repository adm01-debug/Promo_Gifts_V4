# public.commemorative_date_colors

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 4 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.v_commemorative_dates_with_colors |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `commemorative_date_id` | `uuid` | não |  |  |  |
| 3 | `color_group_id` | `uuid` | não |  |  |  |
| 4 | `is_primary` | `boolean` | sim | `false` |  |  |
| 5 | `match_score` | `integer` | sim | `100` |  |  |
| 6 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| commemorative_date_colors_color_group_id_fkey | FOREIGN KEY | `FOREIGN KEY (color_group_id) REFERENCES color_groups(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| commemorative_date_colors_commemorative_date_id_color_group_key | UNIQUE | `UNIQUE (commemorative_date_id, color_group_id)` |  |  | sim |
| commemorative_date_colors_commemorative_date_id_fkey | FOREIGN KEY | `FOREIGN KEY (commemorative_date_id) REFERENCES commemorative_dates(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| commemorative_date_colors_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| commemorative_date_colors_commemorative_date_id_color_group_key | btree | commemorative_date_id, color_group_id | sim | sim |  | `CREATE UNIQUE INDEX commemorative_date_colors_commemorative_date_id_color_group_key ON public.commemorative_date_colors USING btree (commemorative_date_id, color_group_id)` |
| commemorative_date_colors_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX commemorative_date_colors_pkey ON public.commemorative_date_colors USING btree (id)` |
| idx_commemorative_date_colors_color_group_id | btree | color_group_id | não | sim |  | `CREATE INDEX idx_commemorative_date_colors_color_group_id ON public.commemorative_date_colors USING btree (color_group_id)` |


## Policies (RLS)

### `cdc_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `cdc_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cdc_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `cdc_select`

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
