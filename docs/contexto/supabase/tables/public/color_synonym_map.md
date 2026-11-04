# public.color_synonym_map

> Mapeamento de nomes de cores do fornecedor para color_variations canônico.
Usado para corrigir discrepâncias entre como o fornecedor nomeia as cores
nas imagens vs como o pipeline de variantes as padroniza.
Exemplos: Fumê (XBZ) → Preto, Cinza Claro (XBZ) → Cinza.
Alimentado por fn_link_images_to_variants_by_synonym() para backfill do variant_id.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 5 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `supplier_color_name` | `text` | não |  |  |  |
| 4 | `canonical_color_id` | `uuid` | sim |  |  |  |
| 5 | `canonical_color_name` | `text` | sim |  |  |  |
| 6 | `confidence` | `numeric(4,2)` | sim | `1.0` |  |  |
| 7 | `source` | `text` | sim | `'manual'::text` |  |  |
| 8 | `notes` | `text` | sim |  |  |  |
| 9 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| color_synonym_map_canonical_color_id_fkey | FOREIGN KEY | `FOREIGN KEY (canonical_color_id) REFERENCES color_variations(id)` | NO ACTION | NO ACTION | sim |
| color_synonym_map_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| color_synonym_map_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id)` | NO ACTION | NO ACTION | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| color_synonym_map_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX color_synonym_map_pkey ON public.color_synonym_map USING btree (id)` |
| idx_color_synonym_map_canonical_color_id | btree | canonical_color_id | não | sim |  | `CREATE INDEX idx_color_synonym_map_canonical_color_id ON public.color_synonym_map USING btree (canonical_color_id)` |
| idx_csm_supplier_name | btree | supplier_id | sim | sim |  | `CREATE UNIQUE INDEX idx_csm_supplier_name ON public.color_synonym_map USING btree (supplier_id, lower(supplier_color_name))` |


## Policies (RLS)

### `csm_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |

### `csm_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `csm_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |

### `csm_read_authenticated`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `rls_anon_read_color_synonym_map`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon |
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
