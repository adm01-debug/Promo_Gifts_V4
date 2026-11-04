# public.product_included_packagings

> Embalagens ORIGINAIS que já vêm com o produto. SEM SKU próprio, SEM preço separado.

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
| usada por views | public.vw_packaging_health, public.vw_product_all_packaging_options, public.vw_products_packaging_info |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `name` | `character varying(200)` | não |  |  |  |
| 4 | `description` | `text` | sim |  |  | Descrição detalhada da embalagem |
| 5 | `material` | `character varying(100)` | sim |  |  |  |
| 6 | `color` | `character varying(50)` | sim |  |  |  |
| 7 | `finish` | `character varying(50)` | sim |  |  | Acabamento da embalagem: fosco, brilhante, texturizado, acetinado |
| 8 | `has_inner_cradle` | `boolean` | sim | `false` |  |  |
| 9 | `cradle_material` | `character varying(50)` | sim |  |  |  |
| 10 | `internal_height_cm` | `numeric(8,2)` | sim |  |  |  |
| 11 | `internal_width_cm` | `numeric(8,2)` | sim |  |  |  |
| 12 | `internal_length_cm` | `numeric(8,2)` | sim |  |  |  |
| 13 | `internal_diameter_cm` | `numeric(8,2)` | sim |  |  |  |
| 14 | `external_height_cm` | `numeric(8,2)` | sim |  |  |  |
| 15 | `external_width_cm` | `numeric(8,2)` | sim |  |  |  |
| 16 | `external_length_cm` | `numeric(8,2)` | sim |  |  |  |
| 17 | `weight_g` | `integer` | sim |  |  |  |
| 18 | `is_default` | `boolean` | sim | `true` |  |  |
| 19 | `can_be_disabled` | `boolean` | sim | `true` |  |  |
| 20 | `can_be_customized` | `boolean` | sim | `true` |  | Se a embalagem pode ser personalizada com gravação |
| 21 | `supplier_packaging_code` | `character varying(50)` | sim |  |  | Código da embalagem no fornecedor (para rastreio e importação) |
| 22 | `supplier_packaging_name` | `character varying(200)` | sim |  |  | Nome da embalagem no fornecedor |
| 23 | `notes` | `text` | sim |  |  |  |
| 24 | `active` | `boolean` | sim | `true` |  |  |
| 25 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 26 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 27 | `ingest_source` | `character varying(40)` | sim | `'manual'::character varying` |  | Origem do dado: manual \| spot_properties \| spot_scraping \| xbz_manual \| asia_manual \| sm_scraping \| pipeline_auto |
| 28 | `supplier_id` | `uuid` | sim |  |  | FK para supplier — rastreabilidade cross-supplier de embalagem inclusa |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_pip_ingest_source | CHECK | `CHECK (ingest_source::text = ANY (ARRAY['manual'::character varying, 'spot_properties'::character varying, 'spot_scraping'::character varying, 'xbz_manual'::character varying, 'asia_manual'::character varying, 'asia_scraping'::character varying, 'sm_scraping'::character varying, 'sm_manual'::character varying, '88brindes_manual'::character varying, 'pipeline_auto'::character varying]::text[]))` |  |  | sim |
| product_included_packagings_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_included_packagings_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_included_packagings_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.included_packaging_print_areas | included_packaging_print_areas_packaging_id_fkey | packaging_id | CASCADE |
| public.included_packaging_techniques | included_packaging_techniques_packaging_id_fkey | packaging_id | CASCADE |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_incl_pkg_product | btree | product_id | não | sim |  | `CREATE INDEX idx_incl_pkg_product ON public.product_included_packagings USING btree (product_id)` |
| idx_pip_ingest_source | btree | ingest_source | não | sim |  | `CREATE INDEX idx_pip_ingest_source ON public.product_included_packagings USING btree (ingest_source)` |
| idx_pip_supplier_id | btree | supplier_id | não | sim |  | `CREATE INDEX idx_pip_supplier_id ON public.product_included_packagings USING btree (supplier_id)` |
| product_included_packagings_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_included_packagings_pkey ON public.product_included_packagings USING btree (id)` |


## Policies (RLS)

### `product_included_packagings_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
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
