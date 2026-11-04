# public.kit_component_enrichment_raw

> BRONZE: Recebe dados brutos de dimensões físicas de componentes de kits.
   Qualquer fonte deposita aqui sem validação prévia.
   Processado por fn_standardize_kit_component() → kit_component_padronizacao.

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
| usada por views | public.v_kit_pipeline_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `kit_product_id` | `uuid` | não |  |  |  |
| 3 | `kit_component_id` | `uuid` | sim |  |  |  |
| 4 | `raw_component_name` | `text` | sim |  |  |  |
| 5 | `raw_component_type` | `character varying(30)` | sim |  |  |  |
| 6 | `supplier_component_code` | `character varying(200)` | sim |  |  |  |
| 7 | `position_in_kit` | `integer` | sim |  |  |  |
| 8 | `raw_data` | `jsonb` | não | `'{}'::jsonb` |  |  |
| 9 | `source` | `character varying(50)` | não |  |  |  |
| 10 | `source_url` | `text` | sim |  |  |  |
| 11 | `source_ref` | `text` | sim |  |  |  |
| 12 | `source_confidence` | `numeric(4,3)` | sim |  |  |  |
| 13 | `raw_hash` | `character varying(64)` | sim |  |  |  |
| 14 | `processed` | `boolean` | sim | `false` |  |  |
| 15 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 16 | `process_errors` | `jsonb` | sim |  |  |  |
| 17 | `promoted_padronizacao_id` | `uuid` | sim |  |  |  |
| 18 | `promoted_component_id` | `uuid` | sim |  |  |  |
| 19 | `imported_by` | `uuid` | sim |  |  |  |
| 20 | `imported_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 21 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 22 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| kit_component_enrichment_raw_imported_by_fkey | FOREIGN KEY | `FOREIGN KEY (imported_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| kit_component_enrichment_raw_kit_component_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_component_id) REFERENCES product_kit_components(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| kit_component_enrichment_raw_kit_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (kit_product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| kit_component_enrichment_raw_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| kit_component_enrichment_raw_promoted_component_id_fkey | FOREIGN KEY | `FOREIGN KEY (promoted_component_id) REFERENCES product_kit_components(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| kit_component_enrichment_raw_promoted_padronizacao_id_fkey | FOREIGN KEY | `FOREIGN KEY (promoted_padronizacao_id) REFERENCES kit_component_padronizacao(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| kit_component_enrichment_raw_source_check | CHECK | `CHECK (source::text = ANY (ARRAY['manual_admin'::character varying, 'ai_extraction'::character varying, 'site_scraping'::character varying, 'supplier_api'::character varying, 'import_csv'::character varying, 'import_xlsx'::character varying]::text[]))` |  |  | sim |
| kit_component_enrichment_raw_source_confidence_check | CHECK | `CHECK (source_confidence >= 0::numeric AND source_confidence <= 1::numeric)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.kit_component_padronizacao | fk_kcpad_raw_id | raw_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_kcer_component | btree | kit_component_id | não | sim |  | `CREATE INDEX idx_kcer_component ON public.kit_component_enrichment_raw USING btree (kit_component_id)` |
| idx_kcer_kit | btree | kit_product_id | não | sim |  | `CREATE INDEX idx_kcer_kit ON public.kit_component_enrichment_raw USING btree (kit_product_id)` |
| idx_kcer_source | btree | source | não | sim |  | `CREATE INDEX idx_kcer_source ON public.kit_component_enrichment_raw USING btree (source)` |
| idx_kit_component_enrichment_raw_imported_by | btree | imported_by | não | sim |  | `CREATE INDEX idx_kit_component_enrichment_raw_imported_by ON public.kit_component_enrichment_raw USING btree (imported_by)` |
| idx_kit_component_enrichment_raw_promoted_component_id | btree | promoted_component_id | não | sim |  | `CREATE INDEX idx_kit_component_enrichment_raw_promoted_component_id ON public.kit_component_enrichment_raw USING btree (promoted_component_id)` |
| idx_kit_component_enrichment_raw_promoted_padronizacao_id | btree | promoted_padronizacao_id | não | sim |  | `CREATE INDEX idx_kit_component_enrichment_raw_promoted_padronizacao_id ON public.kit_component_enrichment_raw USING btree (promoted_padronizacao_id)` |
| kit_component_enrichment_raw_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX kit_component_enrichment_raw_pkey ON public.kit_component_enrichment_raw USING btree (id)` |
| uq_kcer_hash | btree | raw_hash | sim | sim | `(raw_hash IS NOT NULL)` | `CREATE UNIQUE INDEX uq_kcer_hash ON public.kit_component_enrichment_raw USING btree (raw_hash) WHERE (raw_hash IS NOT NULL)` |


## Policies (RLS)

### `kcer_admin_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK |  |

### `kcer_admin_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `is_admin_or_above(( SELECT auth.uid() AS uid))` |

### `kcer_admin_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT auth.uid() AS uid))` |
| WITH CHECK | `is_admin_or_above(( SELECT auth.uid() AS uid))` |

### `kcer_read_auth`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) IS NOT NULL)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_kcer_updated_at | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, TRIGGER, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
