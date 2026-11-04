# public.spot_typecode_map

> Normaliza o duplo esquema de TypeCode da SPOT (legado numerico -> canonico 4 digitos). Aplicado no Silver via fn_spot_silver_enrich. Bronze preserva o original (lossless).

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
| 1 | `legacy_code` | `text` | não |  |  |  |
| 2 | `canonical_code` | `text` | não |  |  |  |
| 3 | `canonical_type` | `text` | não |  |  |  |
| 4 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| spot_typecode_map_pkey | PRIMARY KEY | `PRIMARY KEY (legacy_code)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| spot_typecode_map_pkey | btree | legacy_code | sim | sim |  | `CREATE UNIQUE INDEX spot_typecode_map_pkey ON public.spot_typecode_map USING btree (legacy_code)` |


## Policies (RLS)

### `spot_typecode_map_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |


## Triggers

_nenhum_


## Grants

| role | privilégios |
|---|---|
| anon | REFERENCES, SELECT, TRIGGER |
| authenticated | REFERENCES, SELECT, TRIGGER |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
