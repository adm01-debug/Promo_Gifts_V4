# public.product_fiscal

> [fix_version:satellite_fiscal_20260627] Satélite 1:1 de dados fiscais/tributários.
 Colunas migradas de products: ncm_id, ncm_code, ipi_rate, tax_reference_state.
 Colunas novas (pipeline futuro): ean, gtin, warranty_months, cst_icms, cest.
 Sincronizado por trg_sync_product_fiscal.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 3 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `ncm_id` | `uuid` | sim |  |  |  |
| 4 | `ncm_code` | `character varying(10)` | sim |  |  |  |
| 5 | `ipi_rate` | `numeric(8,4)` | sim |  |  |  |
| 6 | `tax_reference_state` | `character varying(5)` | sim |  |  |  |
| 7 | `ean` | `character varying(14)` | sim |  |  |  |
| 8 | `gtin` | `character varying(14)` | sim |  |  |  |
| 9 | `warranty_months` | `smallint` | sim |  |  |  |
| 10 | `cst_icms` | `character varying(3)` | sim |  |  |  |
| 11 | `cest` | `character varying(7)` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_fiscal_ncm_id_fkey | FOREIGN KEY | `FOREIGN KEY (ncm_id) REFERENCES ncm_codes(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| product_fiscal_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_fiscal_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_fiscal_product_id_key | UNIQUE | `UNIQUE (product_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_fiscal_ean | btree | ean | sim | sim | `(ean IS NOT NULL)` | `CREATE UNIQUE INDEX idx_product_fiscal_ean ON public.product_fiscal USING btree (ean) WHERE (ean IS NOT NULL)` |
| idx_product_fiscal_ncm_code | btree | ncm_code | não | sim |  | `CREATE INDEX idx_product_fiscal_ncm_code ON public.product_fiscal USING btree (ncm_code)` |
| idx_product_fiscal_ncm_id | btree | ncm_id | não | sim |  | `CREATE INDEX idx_product_fiscal_ncm_id ON public.product_fiscal USING btree (ncm_id)` |
| product_fiscal_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_fiscal_pkey ON public.product_fiscal USING btree (id)` |
| product_fiscal_product_id_key | btree | product_id | sim | sim |  | `CREATE UNIQUE INDEX product_fiscal_product_id_key ON public.product_fiscal USING btree (product_id)` |


## Policies (RLS)

### `product_fiscal_authenticated_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `true` |
| WITH CHECK |  |

### `product_fiscal_service_all`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |

### `rls_restrictive_product_fiscal`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | RESTRICTIVE |
| roles | authenticated, service_role |
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
