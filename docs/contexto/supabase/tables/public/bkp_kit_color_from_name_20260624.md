# public._bkp_kit_color_from_name_20260624

> Backup/audit MELHORIA 5 (2026-06-24): cor de item derivada do nome do componente. Reversão: UPDATE product_kit_components p SET color=b.old_color FROM _bkp_kit_color_from_name_20260624 b WHERE p.id=b.id.

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
| 1 | `id` | `uuid` | não |  |  |  |
| 2 | `old_color` | `character varying(50)` | sim |  |  |  |
| 3 | `component_name` | `character varying(200)` | sim |  |  |  |
| 4 | `matched_word` | `text` | sim |  |  |  |
| 5 | `captured_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bkp_kit_color_from_name_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bkp_kit_color_from_name_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bkp_kit_color_from_name_pkey ON public._bkp_kit_color_from_name_20260624 USING btree (id)` |


## Policies (RLS)

### `admin_only`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
