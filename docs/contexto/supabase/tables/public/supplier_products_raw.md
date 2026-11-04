# public.supplier_products_raw

> Bronze/landing de ingestão. GRÃO: 1 linha = 1 variante/SKU do fornecedor; o produto-pai é derivado na intermediária (produtos_padronizacao via fn_derive_parent_ref). raw_data é payload imutável do fornecedor; proveniência/controle ficam em colunas próprias.

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 2 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |
| usada por views | public.somarcas_catalogo_publico, public.v_system_alerts, public.v_system_health_dashboard, public.v_xbz_ficha_parse_queue, public.vw_active_products_missing_gold_images, public.vw_asia_products_by_category, public.vw_asia_products_by_tag, public.vw_asia_products_errors, public.vw_asia_products_low_stock, public.vw_asia_products_pending, public.vw_asia_products_promo, public.vw_asia_products_stats, public.vw_products_ai_status, public.vw_products_pending_variants, public.vw_produtos_sem_ncm, public.vw_somarcas_pending, public.vw_somarcas_stats, public.vw_somarcas_sync_status, public.vw_source_channel_coverage, public.vw_spot_cf_health, public.vw_spot_color_health, public.vw_spot_price_alerts, public.vw_supplier_products_raw_errors, public.vw_supplier_products_raw_status, public.vw_xbz_products_by_category, public.vw_xbz_products_by_color, public.vw_xbz_products_stats, public.vw_xbz_produtos_sem_imagem, public.vw_xbz_scraping_status |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `supplier_id` | `uuid` | não |  |  |  |
| 3 | `supplier_reference` | `character varying(50)` | não |  |  | Identificador da VARIANTE no fornecedor (o pai é derivado na silver). |
| 4 | `raw_data` | `jsonb` | não |  |  | Payload original do fornecedor (imutavel). NAO gravar metadados de controle aqui — use source_channel/source_endpoint/imported_at. fn_spr_before_write remove chaves _* legadas e recalcula content_hash. |
| 6 | `imported_at` | `timestamp with time zone` | não | `now()` |  |  |
| 7 | `import_batch_id` | `uuid` | sim |  |  |  |
| 9 | `processed_at` | `timestamp with time zone` | sim |  |  |  |
| 10 | `process_errors` | `jsonb` | sim |  |  | Erros de processamento (entrada, escrita pelo worker). |
| 11 | `product_id` | `uuid` | sim |  |  |  |
| 12 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 13 | `updated_at` | `timestamp with time zone` | não | `now()` |  |  |
| 16 | `supplier_sku` | `character varying` | sim |  |  |  |
| 17 | `variant_id` | `uuid` | sim |  |  |  |
| 18 | `source_channel` | `text` | não | `'n8n'::text` |  | Identifica a origem técnica da linha. Valores válidos:    api_clientes   → XBZ /api/clientes/GetListaDeProdutos (F1)    api_ruiz       → XBZ /api/ruiz/* portal (F2, não integrado)    api_carrinho   → XBZ /api/carrinho/* portal (F3, não integrado)    site_scraping  → Scraping xbzbrindes.com.br via Jina AI (F4)    api_xml        → Spot/Stricker API XML de catálogo    api_rest       → Só Marcas / Asia Import APIs REST    n8n_workflow   → Workflow n8n automatizado (futuro)    edge_function  → Edge Function Supabase (futuro)    file_upload / file_upload_retry / manual / legacy → valores históricos |
| 19 | `source_event_id` | `text` | sim |  |  |  |
| 20 | `source_endpoint` | `text` | sim |  |  | Endpoint específico da fonte. Ex: /api/clientes/GetListaDeProdutos, ws.spotgifts.com.br/api/v1SSL |
| 21 | `attempts` | `integer` | não | `0` |  | No de tentativas de processamento. Incrementada pelo trigger fn_spr_before_write a cada novo erro. |
| 23 | `last_error` | `jsonb` | sim |  |  | Ultimo process_errors observado (mantido pelo trigger). Historico de falha da linha. |
| 24 | `status` | `supplier_raw_status` | não | `'pending'::supplier_raw_status` |  |  |
| 25 | `images_status` | `supplier_raw_status` | não | `'pending'::supplier_raw_status` |  |  |
| 26 | `content_hash` | `text` | não |  |  | sha256 canônico do payload: raw_data sem chaves de metadado (prefixo _) e sem supplier_settings.hash_excluded_fields. Mantido por fn_spr_before_write (BEFORE INSERT/UPDATE). NÃO é mais coluna gerada. |
| 27 | `images_processed` | `boolean` | sim | `(images_status = 'processed'::supplier_raw_status)` | s | Derivada (GENERATED) de images_status. SSOT = images_status; nunca escrever direto. |
| 28 | `stock_data` | `jsonb` | sim |  |  | Feed Stocks cru deste SKU (Quantity, NextQuantity1..6/NextDate1..6, Country). Mesmo grao da variante; trilha independente: NAO polui raw_data nem content_hash do produto. |
| 29 | `stock_hash` | `text` | sim |  |  | sha256(stock_data) mantido pela RPC upsert_supplier_stock_raw (coluna plana de proposito p/ evitar rewrite da tabela). |
| 30 | `stock_status` | `supplier_raw_status` | não | `'pending'::supplier_raw_status` |  | Trilha Bronze->Gold do estoque (independente de status). RPC reseta p/ pending quando stock_hash muda. |
| 31 | `stock_synced_at` | `timestamp with time zone` | sim |  |  |  |
| 32 | `stock_processed_at` | `timestamp with time zone` | sim |  |  |  |
| 33 | `site_data` | `jsonb` | sim |  |  | Trilha SITE (scraping da vitrine): payload completo da pagina do produto-pai (galeria, video, categorias, gravacao, dimensoes extra). Imutavel; tratamento no silver. Replicado nas variantes do mesmo CodigoAmigavel. |
| 34 | `site_hash` | `text` | sim |  |  |  |
| 35 | `site_status` | `supplier_raw_status` | sim | `'pending'::supplier_raw_status` |  | Estado da trilha de site (scraping): pending->processing->processed/failed/skipped. |
| 36 | `site_source_url` | `text` | sim |  |  |  |
| 37 | `site_scraped_at` | `timestamp with time zone` | sim |  |  |  |
| 38 | `site_processed_at` | `timestamp with time zone` | sim |  |  |  |
| 39 | `site_fetch_req_id` | `bigint` | sim |  |  | pg_net request id da busca de site em voo (padrao fire/collect do scraper). |
| 40 | `site_attempts` | `integer` | não | `0` |  |  |
| 41 | `site_last_error` | `text` | sim |  |  |  |
| 42 | `site_enqueued_at` | `timestamp with time zone` | sim |  |  |  |
| 43 | `site_promoted_at` | `timestamp with time zone` | sim |  |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_spr_no_processed_with_errors | CHECK | `CHECK (NOT (status = 'processed'::supplier_raw_status AND process_errors IS NOT NULL))` |  |  | sim |
| chk_spr_raw_object | CHECK | `CHECK (jsonb_typeof(raw_data) = 'object'::text)` |  |  | sim |
| chk_spr_reference_trimmed | CHECK | `CHECK (supplier_reference::text = btrim(supplier_reference::text))` |  |  | sim |
| chk_spr_sku_trimmed | CHECK | `CHECK (supplier_sku IS NULL OR supplier_sku::text = btrim(supplier_sku::text))` |  |  | sim |
| chk_spr_source_channel | CHECK | `CHECK (source_channel = ANY (ARRAY['n8n'::text, 'file_upload'::text, 'file_upload_retry'::text, 'file_upload_fix'::text, 'manual'::text, 'api_direct'::text, 'bitrix'::text, 'mysql_sync'::text, 'legacy'::text, 'api_clientes'::text, 'api_ruiz'::text, 'api_carrinho'::text, 'site_scraping'::text, 'api_xml'::text, 'api_rest'::text, 'n8n_workflow'::text, 'edge_function'::text, 'api_oficial'::text, 'hg_products'::text, 'wc_store'::text]))` |  |  | sim |
| supplier_products_raw_import_batch_id_fkey | FOREIGN KEY | `FOREIGN KEY (import_batch_id) REFERENCES supplier_import_batches(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| supplier_products_raw_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| supplier_products_raw_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| supplier_products_raw_supplier_id_fkey | FOREIGN KEY | `FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT` | RESTRICT | NO ACTION | sim |
| supplier_products_raw_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| uq_spr_supplier_sku | UNIQUE | `UNIQUE (supplier_id, supplier_sku)` |  |  | sim |
| uq_supplier_product_raw | UNIQUE | `UNIQUE (supplier_id, supplier_reference)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.produtos_padronizacao | produtos_padronizacao_raw_id_fkey | raw_id | SET NULL |
| public.produtos_padronizacao_variantes | produtos_padronizacao_variantes_raw_id_fkey | raw_id | SET NULL |
| public.produtos_site_padronizacao | produtos_site_padronizacao_raw_id_fkey | raw_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_spr_images_pending | btree | supplier_id, imported_at | não | sim | `(images_status <> 'processed'::supplier_raw_status)` | `CREATE INDEX idx_spr_images_pending ON public.supplier_products_raw USING btree (supplier_id, imported_at) WHERE (images_status <> 'processed'::supplier_raw_status)` |
| idx_spr_images_status_pending | btree | id | não | sim | `(images_status = 'pending'::supplier_raw_status)` | `CREATE INDEX idx_spr_images_status_pending ON public.supplier_products_raw USING btree (id) WHERE (images_status = 'pending'::supplier_raw_status)` |
| idx_spr_import_batch_id | btree | import_batch_id | não | sim |  | `CREATE INDEX idx_spr_import_batch_id ON public.supplier_products_raw USING btree (import_batch_id)` |
| idx_spr_site_status_failed | btree | id | não | sim | `(site_status = 'failed'::supplier_raw_status)` | `CREATE INDEX idx_spr_site_status_failed ON public.supplier_products_raw USING btree (id) WHERE (site_status = 'failed'::supplier_raw_status)` |
| idx_spr_site_status_pending | btree | id | não | sim | `(site_status = 'pending'::supplier_raw_status)` | `CREATE INDEX idx_spr_site_status_pending ON public.supplier_products_raw USING btree (id) WHERE (site_status = 'pending'::supplier_raw_status)` |
| idx_spr_status_failed_quarantined | btree | supplier_id | não | sim | `(status = ANY (ARRAY['failed'::supplier_raw_status, 'quarantined'::supplier_raw_status]))` | `CREATE INDEX idx_spr_status_failed_quarantined ON public.supplier_products_raw USING btree (supplier_id) WHERE (status = ANY (ARRAY['failed'::supplier_raw_status, 'quarantined'::supplier_raw_status]))` |
| idx_spr_status_pending | btree | supplier_id | não | sim | `(status = 'pending'::supplier_raw_status)` | `CREATE INDEX idx_spr_status_pending ON public.supplier_products_raw USING btree (supplier_id) WHERE (status = 'pending'::supplier_raw_status)` |
| idx_spr_stock_pending | btree | supplier_id, stock_synced_at | não | sim | `(stock_status <> 'processed'::supplier_raw_status)` | `CREATE INDEX idx_spr_stock_pending ON public.supplier_products_raw USING btree (supplier_id, stock_synced_at) WHERE (stock_status <> 'processed'::supplier_raw_status)` |
| idx_spr_stock_status_pending | btree | id | não | sim | `(stock_status = 'pending'::supplier_raw_status)` | `CREATE INDEX idx_spr_stock_status_pending ON public.supplier_products_raw USING btree (id) WHERE (stock_status = 'pending'::supplier_raw_status)` |
| idx_spr_supplier_source_channel | btree | supplier_id, source_channel | não | sim | `(source_channel <> 'legacy'::text)` | `CREATE INDEX idx_spr_supplier_source_channel ON public.supplier_products_raw USING btree (supplier_id, source_channel) WHERE (source_channel <> 'legacy'::text)` |
| idx_spr_unprocessed | btree | supplier_id, imported_at | não | sim | `(status <> ALL (ARRAY['processed'::supplier_raw_status, 'quarantined'::supplier_raw_status]))` | `CREATE INDEX idx_spr_unprocessed ON public.supplier_products_raw USING btree (supplier_id, imported_at) WHERE (status <> ALL (ARRAY['processed'::supplier_raw_status, 'quarantined'::supplier_raw_status]))` |
| idx_spr_variant_id | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` | `CREATE INDEX idx_spr_variant_id ON public.supplier_products_raw USING btree (variant_id) WHERE (variant_id IS NOT NULL)` |
| idx_spr_xbz_site_status | btree | supplier_id, site_status | não | sim | `((supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid) AND (site_status IS NOT NULL))` | `CREATE INDEX idx_spr_xbz_site_status ON public.supplier_products_raw USING btree (supplier_id, site_status) WHERE ((supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid) AND (site_status IS NOT NULL))` |
| idx_supplier_products_raw_product | btree | product_id | não | sim | `(product_id IS NOT NULL)` | `CREATE INDEX idx_supplier_products_raw_product ON public.supplier_products_raw USING btree (product_id) WHERE (product_id IS NOT NULL)` |
| supplier_products_raw_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX supplier_products_raw_pkey ON public.supplier_products_raw USING btree (id)` |
| uq_spr_source_event | btree | supplier_id, source_event_id | sim | sim | `(source_event_id IS NOT NULL)` | `CREATE UNIQUE INDEX uq_spr_source_event ON public.supplier_products_raw USING btree (supplier_id, source_event_id) WHERE (source_event_id IS NOT NULL)` |
| uq_spr_supplier_sku | btree | supplier_id, supplier_sku | sim | sim |  | `CREATE UNIQUE INDEX uq_spr_supplier_sku ON public.supplier_products_raw USING btree (supplier_id, supplier_sku)` |
| uq_supplier_product_raw | btree | supplier_id, supplier_reference | sim | sim |  | `CREATE UNIQUE INDEX uq_supplier_product_raw ON public.supplier_products_raw USING btree (supplier_id, supplier_reference)` |


## Policies (RLS)

### `spr_all_service`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | service_role |
| USING | `true` |
| WITH CHECK | `true` |

### `spr_select_admin`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `is_admin_or_above(( SELECT ( SELECT auth.uid() AS uid) AS uid))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_spr_before_write | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_spr_before_write |
| trg_spr_history | AFTER | UPDATE | ROW | enabled | public.fn_spr_history |
| trg_spr_normalize_keys | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_spr_normalize_keys |
| trg_xbz_propagate_site_to_silver | AFTER | UPDATE | ROW | enabled | public.fn_xbz_propagate_site_to_silver |


## Grants

| role | privilégios |
|---|---|
| authenticated | SELECT |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
