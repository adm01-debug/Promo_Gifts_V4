# public._bkp_kit_packing_type_20260624

> Backup MELHORIA 8 (2026-06-24): packing_type antes/depois (derivado do componente-embalagem). Reversão: UPDATE products p SET packing_type=b.old_packing_type FROM _bkp_kit_packing_type_20260624 b WHERE p.id=b.id.

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
| 2 | `old_packing_type` | `character varying(100)` | sim |  |  |  |
| 3 | `new_packing_type` | `text` | sim |  |  |  |
| 4 | `captured_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| bkp_kit_packing_type_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| bkp_kit_packing_type_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX bkp_kit_packing_type_pkey ON public._bkp_kit_packing_type_20260624 USING btree (id)` |


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
