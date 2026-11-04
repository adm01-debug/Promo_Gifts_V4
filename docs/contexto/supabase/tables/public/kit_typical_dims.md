# public.kit_typical_dims

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
| usada por views | public.v_kit_pipeline_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `type_code` | `text` | não |  |  |  |
| 2 | `length_mm` | `integer` | sim |  |  |  |
| 3 | `width_mm` | `integer` | sim |  |  |  |
| 4 | `height_mm` | `integer` | sim |  |  |  |
| 5 | `diameter_mm` | `integer` | sim |  |  |  |
| 6 | `shape` | `text` | não |  |  |  |
| 7 | `weight_g_typical` | `integer` | não |  |  |  |
| 8 | `d_min` | `integer` | sim |  |  |  |
| 9 | `d_max` | `integer` | sim |  |  |  |
| 10 | `l_min` | `integer` | sim |  |  |  |
| 11 | `l_max` | `integer` | sim |  |  |  |
| 12 | `p_min` | `integer` | sim |  |  |  |
| 13 | `p_max` | `integer` | sim |  |  |  |
| 14 | `notes` | `text` | sim |  |  |  |
| 15 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_typical_dims_pkey | PRIMARY KEY | `PRIMARY KEY (type_code)` |  |  | sim |
| kit_typical_dims_shape_check | CHECK | `CHECK (shape = ANY (ARRAY['rectangular'::text, 'cylindrical'::text, 'flat'::text, 'spherical'::text, 'irregular'::text]))` |  |  | sim |
| kit_typical_dims_weight_g_typical_check | CHECK | `CHECK (weight_g_typical > 0)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| kit_typical_dims_pkey | btree | type_code | sim | sim |  | `CREATE UNIQUE INDEX kit_typical_dims_pkey ON public.kit_typical_dims USING btree (type_code)` |


## Policies (RLS)

### `kit_typical_dims_public_read`

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
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
