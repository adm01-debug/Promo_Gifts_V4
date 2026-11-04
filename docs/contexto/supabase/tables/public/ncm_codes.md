# public.ncm_codes

> Tabela de referência NCM (Nomenclatura Comum do Mercosul) - códigos fiscais válidos com descrição e hierarquia

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
| 2 | `code` | `character varying(8)` | não |  |  | Código NCM - 8 dígitos numéricos sem pontos (ex: 96081000) |
| 3 | `code_formatted` | `character varying(10)` | sim | `(((("substring"((code)::text, 1, 4) \|\| '.'::text) \|\| "substring"((code)::text, 5, 2)) \|\| '.'::text) \|\| "substring"((code)::text, 7, 2))` | s | Código formatado para exibição/NF-e (ex: 9608.10.00) - gerado automaticamente |
| 4 | `chapter` | `character varying(2)` | sim | `"substring"((code)::text, 1, 2)` | s | Capítulo (2 primeiros dígitos) - gerado automaticamente |
| 5 | `position` | `character varying(4)` | sim | `"substring"((code)::text, 1, 4)` | s |  |
| 6 | `subposition` | `character varying(6)` | sim | `"substring"((code)::text, 1, 6)` | s |  |
| 7 | `item` | `character varying(7)` | sim | `"substring"((code)::text, 1, 7)` | s |  |
| 8 | `description` | `text` | sim |  |  |  |
| 9 | `chapter_desc` | `text` | sim |  |  | Descrição do capítulo (ex: Obras diversas) |
| 10 | `position_desc` | `text` | sim |  |  |  |
| 11 | `ipi_rate` | `numeric(5,2)` | sim |  |  |  |
| 12 | `import_rate` | `numeric(5,2)` | sim |  |  |  |
| 13 | `is_active` | `boolean` | sim | `true` |  |  |
| 14 | `source` | `text` | sim | `'manual'::text` |  |  |
| 15 | `notes` | `text` | sim |  |  |  |
| 16 | `organization_id` | `uuid` | sim | `'5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid` |  |  |
| 17 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 18 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_ncm_code_format | CHECK | `CHECK (code::text ~ '^\d{8}$'::text)` |  |  | sim |
| ncm_codes_code_key | UNIQUE | `UNIQUE (code)` |  |  | sim |
| ncm_codes_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.product_fiscal | product_fiscal_ncm_id_fkey | ncm_id | SET NULL |
| public.products | products_ncm_id_fkey | ncm_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_ncm_codes_position | btree | position | não | sim |  | `CREATE INDEX idx_ncm_codes_position ON public.ncm_codes USING btree ("position")` |
| ncm_codes_code_key | btree | code | sim | sim |  | `CREATE UNIQUE INDEX ncm_codes_code_key ON public.ncm_codes USING btree (code)` |
| ncm_codes_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX ncm_codes_pkey ON public.ncm_codes USING btree (id)` |


## Policies (RLS)

### `auth_read_ncm_codes`

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
