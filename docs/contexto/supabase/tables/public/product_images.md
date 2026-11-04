# public.product_images

> Manifesto de metadados de imagens hospedadas no Cloudflare Images.
A tabela NÃO armazena bytes — é um registro de endereçamento e classificação.
As imagens físicas vivem em: https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/{cloudflare_image_id}/public

━━━ RELACIONAMENTOS ━━━
• products          → FK product_id    (ON DELETE CASCADE) — produto-pai obrigatório
• image_types       → FK image_type_id (DEFAULT gallery 1590e144-…) — vocabulário de tipos
• product_variants  → FK variant_id    (nullable) — imagem específica de variante de cor/tamanho
• color_variations  → FK color_id      (nullable) — imagem vinculada a uma cor específica
• organizations     → FK organization_id (DEFAULT 5db5aee1-064b-4ef4-9193-345dcd8274ea)

━━━ TRIGGERS (disparam nesta ordem no INSERT/UPDATE) ━━━
1. trg_auto_classify_image            BEFORE → fn_auto_classify_product_image()
   Lê o filename da url_cdn/url_original e infere image_type+image_type_id+is_primary+display_order.
   Se nenhum padrão casar, usa o image_type fornecido pelo chamador (ou "other").
2. trg_sync_image_type_code           BEFORE → fn_sync_image_type_code()
   Garante coerência entre image_type (varchar) e image_type_id (uuid FK).
   INSERT: varchar tem precedência; UPDATE: sync bidirecional.
3. trg_product_images_seo_autofill    BEFORE → auto-preenche alt_text, title_text (SEO).
4. trg_single_primary_image           AFTER  → garante no máximo 1 is_primary=true ativo por produto.
5. trg_autopromote_primary            AFTER  → se a primary é desativada, promove a próxima elegível.
6. trg_sync_images_to_product         AFTER  → propaga primary_image_url e images[] JSONB em products.
   ⚠️ Este trigger é o que mantém products.primary_image_url atualizado — não edite aquele campo diretamente.
7. trg_normalize_source_supplier      BEFORE → padroniza maiúsculas em source_supplier.

━━━ CONSTRAINTS CRÍTICAS ━━━
• cloudflare_image_id  UNIQUE  — ID único no Cloudflare. Nunca duplicar.
  Se a MESMA imagem CF precisar servir múltiplos produtos, use sufixo:
    {cf_id}-dup-{hash6}          ← quando o CF dedup cria uma cópia
    {cf_id}-leg-{product_id[:6]} ← para migração de imagens legadas
  Neste caso url_cdn continua apontando para a imagem original (sem o sufixo).
• alt_text  CHECK length >= 10  (ou NULL) — sem textos curtos demais.
• image_type  NOT NULL DEFAULT 'gallery'
• image_type_id  NOT NULL DEFAULT '1590e144-e3f8-41e6-98f9-f4a25bae496d' (= tipo 'gallery')
  ⚠️ Default corrigido em 2026-06-17 de UUID(other) para UUID(gallery) — alinhado com image_type.
  Os dois campos são SEMPRE mantidos em sync pelos triggers acima.

━━━ PIPELINE MEDALLION ━━━
Bronze (supplier_products_raw) → Silver (produtos_padronizacao) → Gold (products) → product_images
Para INSERTs em massa vindo do pipeline, sempre definir antes:
  SELECT set_config('app.write_source', 'pipeline', false);
Caso contrário fn_products_capture_manual_edits capturará as mudanças em locked_fields.

━━━ MONITORAMENTO DE QUALIDADE ━━━
• vw_image_type_coherence         — divergências image_type vs image_type_id (deve ser 0)
• product_qa_image_alerts         — alertas de produtos ativos sem imagem
• pg_cron 'qa-imageless-products' (a cada 30 min) — varredura automática
• fn_qa_scan_imageless_products() — execução manual da varredura

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
| usada por views | analytics.mv_media_health, analytics.mv_product_cards, cf_recon.v_cf_orphans, cf_recon.v_divergence, cf_recon.v_health_dashboard, cf_recon.v_inactive_alive, cf_recon.v_products_without_active_image, cf_recon.v_verification_queue, public.mv_product_images_audit, public.v_blurhash_coverage, public.v_blurhash_summary, public.v_cf_drift_dashboard, public.v_cf_image_remediation, public.v_cf_recon_progress, public.v_color_coverage_monitor, public.v_image_quality_stats, public.v_media_statistics, public.v_media_stats, public.v_product_image_hash_duplicates, public.v_product_images_cdn, public.v_product_images_quality_gap, public.v_products_images_summary, public.v_products_missing_primary_image, public.v_products_pending_images, public.v_products_without_images, public.v_system_health_dashboard, public.v_unmapped_images, public.vw_active_products_missing_gold_images, public.vw_duplicate_images, public.vw_image_type_coherence, public.vw_images_pending_dimensions, public.vw_media_stats_by_type, public.vw_product_images_health, public.vw_product_images_variant_gap, public.vw_products_seo_status, public.vw_qa_products_missing_images, public.vw_seo_dashboard, public.vw_spot_cf_health, public.vw_spot_image_coverage |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  | PK UUID gerada automaticamente (gen_random_uuid). Nunca reutilizar. |
| 2 | `product_id` | `uuid` | não |  |  | FK → products.id  \|  ON DELETE CASCADE. Produto-pai obrigatório. Toda imagem pertence a exatamente um produto. Ao deletar o produto, todas as suas imagens são deletadas em cascata. |
| 3 | `variant_id` | `uuid` | sim |  |  | FK → product_variants.id  (nullable, ON DELETE SET NULL). Vincula a imagem a uma variante específica de cor/tamanho do produto. Quando a variante é deletada, o campo vira NULL e a imagem sobrevive sem vínculo.  ━━━ QUANDO PREENCHER ━━━ • Preencher quando a imagem representa uma cor/variante específica do produto.   Ex.: foto da caneta AZUL → variant_id = uuid da variante Azul. • Deixar NULL quando a imagem se aplica a TODAS as variantes.  ━━━ SEMÂNTICA DUPLA DE color_id (atenção!) ━━━ O campo color_id nem sempre indica a cor do produto. Contexto por image_type:   → main/gallery/product (applies_to_color=true):       color_id = COR DO PRODUTO → deve ter variant_id correspondente   → location/area/component (applies_to_color=false — SPOT):       color_id = COR DA TINTA DE IMPRESSÃO/GRAVAÇÃO, NÃO cor do produto.       Estas imagens NÃO devem ter variant_id (aplicam-se a todas as variantes).       Manter variant_id=NULL para esses 3 tipos é CORRETO POR DESIGN.  ━━━ DADOS REAIS (2026-06-16) ━━━ • 16.383+ rows com variant_id preenchido (22% do total) • 5.126+ produtos com ≥1 imagem por variante • Fornecedores que usam: SPOT, XBZ, SOMARCAS, ASIA Import (todas as cores) • 3.305 rows SPOT (location/area/component) com color_id mas variant_id=NULL → correto  ━━━ GAP REMANESCENTE ━━━ ~670 imagens XBZ applies_to_color=true com color_id mas sem variant_id. Causa: inconsistência entre nome de cor na imagem (ex: "Fumê") e nome na variante (ex: "Preto"). Sinônimos documentados em color_synonym_map. Mapeamento: vw_product_images_variant_gap (gap_type=XBZ_COLOR_MISMATCH) Solução: reprocessar via pipeline XBZ com tabela color_synonym_map.  ━━━ INVARIANTES ━━━ • Se preenchido: variant_id.product_id DEVE = product_id desta row. • Se preenchido: variant_id deve apontar para variante is_active=true. • 0 cross-product mismatches permitidos (monitorar com vw_product_images_variant_gap). |
| 4 | `color_id` | `uuid` | sim |  |  | FK → color_variations.id  (nullable, ON DELETE SET NULL). Preenchido quando applies_to_color=true e a imagem pertence a uma cor. NULL = imagem neutra (aplica-se a todas as cores). |
| 5 | `cloudflare_image_id` | `character varying(100)` | não |  |  | Identificador único da imagem no Cloudflare Images (NOT NULL, UNIQUE globalmente). Formato típico: {fornecedor}-{referencia}-{sequencial}   Ex.: xbz-caneca-termica-27317-1771595129        asia-cv250-01        spot-66116-main        sm-av-00401-main  ⚠️ UNIQUE constraint: o mesmo CF image_id NÃO pode aparecer em duas rows. Quando uma imagem CF serve múltiplos produtos, adicionar sufixo diferenciador:   {cf_id}-dup-{hash6}          → cópia criada pelo Cloudflare   {cf_id}-leg-{product_id[:6]} → migração de legados (padrão desta base) Neste caso, url_cdn continua apontando para a URL original sem sufixo. |
| 6 | `url_cdn` | `text` | não |  |  | URL de entrega pública no Cloudflare CDN (NOT NULL). Formato padrão: https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/{cloudflare_image_id}/public Variações de tamanho são acessadas por: /width=400 /format=webp /quality=85 etc. Este campo deve sempre refletir a URL real da imagem no CF, mesmo quando cloudflare_image_id tiver sufixo diferenciador (ex.: -leg-abc123). |
| 7 | `filename` | `character varying(255)` | sim |  |  | Nome do arquivo original (ex.: caneta-azul-001.jpg). Usado por triggers de classificação automática. Pode ser NULL se não disponível. |
| 8 | `file_size_bytes` | `bigint` | sim |  |  | Tamanho do arquivo em bytes conforme retornado pelo Cloudflare ou fornecedor. Pode ser NULL para imagens legadas ou migradas sem metadados de tamanho. |
| 9 | `width_px` | `integer` | sim |  |  | Largura da imagem em pixels. Pode ser NULL para imagens não inspecionadas. |
| 10 | `height_px` | `integer` | sim |  |  | Altura da imagem em pixels. Pode ser NULL para imagens não inspecionadas. |
| 11 | `format` | `character varying(20)` | sim |  |  | Formato do arquivo: jpeg, png, webp, gif, avif. CHECK: apenas caracteres alfanuméricos minúsculos [a-z0-9]. NULL = não identificado. |
| 12 | `image_type` | `character varying(30)` | não | `'gallery'::character varying` |  | Código textual do tipo de imagem (NOT NULL, DEFAULT 'gallery'). Preenchido automaticamente pelo trigger trg_auto_classify_image com base no filename. Valores válidos (em sincronia com image_types.code):   main           → imagem principal / capa do produto   gallery        → vista alternativa / ângulo extra   set            → foto do conjunto de todas as cores disponíveis   ambient        → produto em ambiente/lifestyle   detail         → close-up / detalhe de gravação ou material   box            → embalagem / caixa   pouch          → estojo / bolsa   bag            → sacola   logo           → imagem com logotipo aplicado   mockup         → mockup gerado digitalmente   thumbnail      → miniatura   component      → componente isolado do produto   location       → localização de gravação no produto   area           → área de gravação dimensionada   other          → não classificado (default de fallback) ⚠️ Sempre manter sincronizado com image_type_id. |
| 13 | `is_primary` | `boolean` | sim | `false` |  | Marca a imagem como principal do produto no front-end (DEFAULT false). ⚠️ INVARIANTE: no máximo 1 row com is_primary=true E is_active=true por product_id. Garantido pelo trigger trg_single_primary_image. Quando esta row é desativada (is_active→false), o trigger trg_autopromote_primary elege automaticamente a próxima imagem elegível como nova primary. O campo products.primary_image_url é mantido em sincronia por trg_sync_images_to_product. |
| 14 | `display_order` | `integer` | sim | `0` |  | Ordem de exibição na galeria do produto (DEFAULT 0, auto-ajustado para MAX+1 pelo trigger). Menor valor = aparece primeiro. Não é global — é relativo ao product_id. Para reordenar manualmente: UPDATE product_images SET display_order=N WHERE id=... em pipeline mode para não acionar triggers desnecessários. |
| 15 | `applies_to_color` | `boolean` | sim | `false` |  | true → imagem válida apenas para a cor indicada em color_id (DEFAULT false). false → imagem neutra, aparece para todas as variantes do produto. Usar em conjunto com color_id. |
| 16 | `source_supplier` | `character varying(50)` | sim |  |  | Fornecedor de origem da imagem (normalizado em maiúsculas pelo trigger). Valores em uso: XBZ, ASIA, SPOT, SOMARCAS, 88B, LEGADO. Usado em relatórios de cobertura por fornecedor. |
| 17 | `url_original` | `text` | sim |  |  | URL de origem antes da ingestão no Cloudflare (ex.: URL do site do fornecedor, S3, Azure CDN). Usado pelo trigger trg_auto_classify_image para extrair o filename e classificar o tipo. Mantido para rastreabilidade e re-download se necessário. |
| 18 | `is_active` | `boolean` | sim | `true` |  | Soft-delete da imagem (DEFAULT true). false → imagem oculta: não aparece no front, não conta para cobertura, não é primary. Quando a primary ativa é desativada, o trigger trg_autopromote_primary elege a próxima imagem ativa elegível. Não usar DELETE — usar is_active=false. |
| 19 | `created_at` | `timestamp with time zone` | sim | `now()` |  | Timestamp de criação da row (DEFAULT now()). Imutável após inserção. |
| 20 | `updated_at` | `timestamp with time zone` | sim | `now()` |  | Timestamp da última atualização. Atualizado automaticamente por trigger. |
| 21 | `image_type_id` | `uuid` | não | `'1590e144-e3f8-41e6-98f9-f4a25bae496d'::uuid` |  | FK → image_types.id (NOT NULL, DEFAULT '1590e144-e3f8-41e6-98f9-f4a25bae496d' = tipo 'gallery'). Contraparte UUID do campo image_type — os dois são SEMPRE mantidos em sync por:   1. trg_auto_classify_image (BEFORE INSERT): hardcoda ambos simultaneamente   2. trg_sync_image_type_code (BEFORE INS+UPD): bidirecional — mudar um sincroniza o outro  Via image_type_id é possível acessar metadados ricos da tabela image_types:   is_primary_candidate · show_in_gallery · display_priority   gallery_order · is_color_specific · category · subcategory  Tipos is_primary_candidate=true: main, vitrine_pessoa, vitrine_ambiente, set. ⚠️ Default corrigido em 2026-06-17 de UUID(other) para UUID(gallery), alinhando com image_type default. |
| 22 | `supplier_code` | `character varying(50)` | sim |  |  | Código interno de identificação do fornecedor — geralmente igual a source_supplier. Mantido separado para casos em que source_supplier difere do código de sistema. |
| 23 | `alt_text` | `text` | sim |  |  | Texto alternativo da imagem para SEO e acessibilidade (CHECK: length >= 10 ou NULL). Auto-preenchido pelo trigger trg_product_images_seo_autofill combinando nome do produto + cor + tipo. Ex.: "Caneta metal azul — imagem principal". ⚠️ Nunca inserir alt_text com menos de 10 caracteres: a constraint chk_product_images_alt_min rejeita. Para contornar em batch, deixar NULL (o trigger preencherá). |
| 24 | `title_text` | `text` | sim |  |  | Título da imagem para tooltip HTML (atributo title na tag <img>). Complementa alt_text. Preenchido pelo mesmo trigger de SEO. Pode ser NULL. |
| 25 | `caption` | `text` | sim |  |  | Legenda visível para o usuário (ex.: em galeria com zoom ou lightbox). Opcional. Não confundir com alt_text (acessibilidade) ou title_text (tooltip). |
| 26 | `is_og_image` | `boolean` | sim | `false` |  | true → imagem usada como og:image nas metatags OpenGraph (DEFAULT false). Automaticamente definido como true quando a imagem é eleita is_primary=true pelo trigger trg_auto_classify_image. |
| 27 | `organization_id` | `uuid` | não | `'5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid` |  | FK → organizations.id (NOT NULL, DEFAULT '5db5aee1-064b-4ef4-9193-345dcd8274ea'). Esta base opera com uma única organização. Nunca alterar este default. |
| 28 | `cf_sync_status` | `text` | não | `'pending'::text` |  | Estado do objeto no Cloudflare Images: pending\|uploading\|uploaded\|verified\|missing\|failed\|orphaned |
| 29 | `cf_uploaded_at` | `timestamp with time zone` | sim |  |  | Timestamp do upload concluido no Cloudflare (campo uploaded da API CF) |
| 30 | `cf_verified_at` | `timestamp with time zone` | sim |  |  | Timestamp when this image was last confirmed PRESENT in Cloudflare Images API. NULL if never verified or if currently missing. |
| 31 | `cf_check_attempts` | `smallint` | não | `0` |  | Numero de tentativas de verificacao/upload no CF |
| 32 | `cf_last_error` | `text` | sim |  |  | Ultima mensagem de erro de upload/verificacao no CF |
| 33 | `cf_id_scheme` | `text` | sim | ` CASE     WHEN ((cloudflare_image_id)::text ~ '^xbz_site_'::text) THEN 'hash_legacy'::text     WHEN (((cloudflare_image_id)::text ~ '-dup-'::text) OR ((cloudflare_image_id)::text ~ '-leg-'::text) OR ((cloudflare_image_id)::text ~ '--ref'::text) OR ((cloudflare_image_id)::text ~ '-legacy$'::text)) THEN 'synthetic'::text     WHEN ((cloudflare_image_id)::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-'::text) THEN 'uuid'::text     WHEN ((cloudflare_image_id)::text ~ '-(main\|gal-[0-9]+)$'::text) THEN 'main_gal'::text     WHEN ((cloudflare_image_id)::text ~ '-d[0-9]+$'::text) THEN 'detail_dn'::text     WHEN (((cloudflare_image_id)::text ~ '-[0-9]{4,}-[0-9]{9,}$'::text) OR ((cloudflare_image_id)::text ~ 'd[0-9]+-[0-9]{9,}$'::text)) THEN 'slug_ts'::text     WHEN ((cloudflare_image_id)::text ~ '_[0-9]'::text) THEN 'legacy_cor'::text     ELSE 'seq'::text END` | s | Convencao do cloudflare_image_id (derivada): legacy_cor\|dn\|main_gal\|slug_ts\|synthetic\|hash_legacy\|uuid\|seq |
| 34 | `content_hash` | `text` | sim |  |  | Hash do binario (sha256) ou etag R2/CF para deduplicacao de conteudo |
| 35 | `canonical_image_id` | `uuid` | sim |  |  | Aponta para a linha canonica quando esta e alias/duplicata (substitui o hack -dup-) |
| 36 | `is_shared` | `boolean` | não | `false` |  | TRUE quando a imagem fisica e compartilhada por multiplos produtos |
| 37 | `r2_bucket` | `text` | sim |  |  | Bucket R2 do master/original (ex.: gift-store) |
| 38 | `r2_object_key` | `text` | sim |  |  | Chave (UUID) do objeto master no R2 — liga DB <-> R2 |
| 41 | `last_modified_source` | `text` | sim |  |  | Origem da ultima escrita: pipeline\|manual\|lovable\|claude\|migration\|n8n\|edge_function\|api |
| 42 | `deleted_at` | `timestamp with time zone` | sim |  |  | Soft-delete com carimbo (complementa is_active) |
| 43 | `deleted_reason` | `text` | sim |  |  | Motivo do soft-delete |
| 44 | `blurhash` | `text` | sim |  |  | Placeholder LQIP/blurhash para blur-up (evita layout shift) |
| 45 | `requires_signed_url` | `boolean` | não | `false` |  | Espelha requireSignedURLs do Cloudflare (imagem privada) |
| 46 | `aspect_ratio` | `numeric` | sim | ` CASE     WHEN ((height_px IS NOT NULL) AND (height_px > 0) AND (width_px IS NOT NULL)) THEN round(((width_px)::numeric / (height_px)::numeric), 4)     ELSE NULL::numeric END` | s | Razao de aspecto (derivada): width_px/height_px arredondada a 4 casas |
| 47 | `cf_last_checked_at` | `timestamp with time zone` | sim |  |  | Timestamp of the most recent Cloudflare Images API check, regardless of result (verified or missing). Used to track check freshness. |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| chk_blurhash_format | CHECK | `CHECK (blurhash IS NULL OR length(blurhash) = 28 AND blurhash ~ '^[0-9A-Za-z#\$%\*\+,\-\.\:\;=\?@\[\]\^_\{\\|\}~]{28}$'::text)` |  |  | sim |
| chk_pi_canonical_not_self | CHECK | `CHECK (canonical_image_id IS NULL OR canonical_image_id <> id)` |  |  | sim |
| chk_pi_cf_sync_status | CHECK | `CHECK (cf_sync_status = ANY (ARRAY['pending'::text, 'uploading'::text, 'uploaded'::text, 'verified'::text, 'missing'::text, 'failed'::text, 'orphaned'::text]))` |  |  | sim |
| chk_pi_last_modified_source | CHECK | `CHECK (last_modified_source IS NULL OR (last_modified_source = ANY (ARRAY['pipeline'::text, 'manual'::text, 'lovable'::text, 'claude'::text, 'migration'::text, 'n8n'::text, 'edge_function'::text, 'api'::text])))` |  |  | sim |
| chk_product_images_alt_min | CHECK | `CHECK (alt_text IS NULL OR length(alt_text) >= 10)` |  |  | sim |
| chk_product_images_format_lc | CHECK | `CHECK (format IS NULL OR format::text ~ '^[a-z0-9]+$'::text)` |  |  | sim |
| chk_product_images_image_type | CHECK | `CHECK (image_type::text = ANY (ARRAY['main'::character varying, 'product'::character varying, 'set'::character varying, 'gallery'::character varying, 'ambient'::character varying, 'detail'::character varying, 'logo'::character varying, 'component'::character varying, 'location'::character varying, 'area'::character varying, 'box'::character varying, 'pouch'::character varying, 'bag'::character varying, 'mockup'::character varying, 'thumbnail'::character varying, 'vitrine_ambiente'::character varying, 'vitrine_pessoa'::character varying, 'other'::character varying]::text[]))` |  |  | sim |
| fk_product_images_image_type | FOREIGN KEY | `FOREIGN KEY (image_type_id) REFERENCES image_types(id)` | NO ACTION | NO ACTION | sim |
| product_images_canonical_image_id_fkey | FOREIGN KEY | `FOREIGN KEY (canonical_image_id) REFERENCES product_images(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| product_images_cloudflare_image_id_key | UNIQUE | `UNIQUE (cloudflare_image_id)` |  |  | sim |
| product_images_color_id_fkey | FOREIGN KEY | `FOREIGN KEY (color_id) REFERENCES color_variations(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| product_images_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| product_images_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_images_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_images_variant_id_fkey | FOREIGN KEY | `FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.image_backfill_queue | image_backfill_queue_product_image_id_fkey | product_image_id | CASCADE |
| public.product_images | product_images_canonical_image_id_fkey | canonical_image_id | SET NULL |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_pi_canonical | btree | canonical_image_id | não | sim | `(canonical_image_id IS NOT NULL)` | `CREATE INDEX idx_pi_canonical ON public.product_images USING btree (canonical_image_id) WHERE (canonical_image_id IS NOT NULL)` |
| idx_pi_cf_sync_status | btree | cf_sync_status | não | sim | `(cf_sync_status <> 'verified'::text)` | `CREATE INDEX idx_pi_cf_sync_status ON public.product_images USING btree (cf_sync_status) WHERE (cf_sync_status <> 'verified'::text)` |
| idx_pi_content_hash | btree | content_hash | não | sim | `(content_hash IS NOT NULL)` | `CREATE INDEX idx_pi_content_hash ON public.product_images USING btree (content_hash) WHERE (content_hash IS NOT NULL)` |
| idx_product_images_blurhash_null | btree | is_primary, id | não | sim | `((blurhash IS NULL) AND (cf_sync_status = 'verified'::text) AND (deleted_at IS NULL) AND ((format)::text = ANY (ARRAY['jpeg'::text, 'png'::text, 'webp'::text, 'gif'::text])))` | `CREATE INDEX idx_product_images_blurhash_null ON public.product_images USING btree (is_primary DESC, id) WHERE ((blurhash IS NULL) AND (cf_sync_status = 'verified'::text) AND (deleted_at IS NULL) AND ((format)::text = ANY (ARRAY['jpeg'::text, 'png'::text, 'webp'::text, 'gif'::text])))` |
| idx_product_images_cf_verified_at | btree | cf_verified_at | não | sim | `((cf_sync_status = 'verified'::text) AND (is_active = true))` | `CREATE INDEX idx_product_images_cf_verified_at ON public.product_images USING btree (cf_verified_at) WHERE ((cf_sync_status = 'verified'::text) AND (is_active = true))` |
| idx_product_images_color_id | btree | color_id | não | sim | `(color_id IS NOT NULL)` | `CREATE INDEX idx_product_images_color_id ON public.product_images USING btree (color_id) WHERE (color_id IS NOT NULL)` |
| idx_product_images_content_hash_orderby | btree | is_primary, id | não | sim | `((content_hash IS NULL) AND (cf_sync_status = 'verified'::text) AND (deleted_at IS NULL))` | `CREATE INDEX idx_product_images_content_hash_orderby ON public.product_images USING btree (is_primary DESC, id) WHERE ((content_hash IS NULL) AND (cf_sync_status = 'verified'::text) AND (deleted_at IS NULL))` |
| idx_product_images_image_type_id | btree | image_type_id | não | sim |  | `CREATE INDEX idx_product_images_image_type_id ON public.product_images USING btree (image_type_id)` |
| idx_product_images_missing_dimensions_orderby | btree | is_primary, created_at, id | não | sim | `((width_px IS NULL) AND (is_active = true) AND (format IS NOT NULL))` | `CREATE INDEX idx_product_images_missing_dimensions_orderby ON public.product_images USING btree (is_primary DESC, created_at, id) WHERE ((width_px IS NULL) AND (is_active = true) AND (format IS NOT NULL))` |
| idx_product_images_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_product_images_organization_id ON public.product_images USING btree (organization_id)` |
| idx_product_images_primary | btree | product_id, is_primary | não | sim | `(is_primary = true)` | `CREATE INDEX idx_product_images_primary ON public.product_images USING btree (product_id, is_primary) WHERE (is_primary = true)` |
| idx_product_images_primary_verified | btree | product_id, is_primary, cf_sync_status | não | sim | `(is_active = true)` | `CREATE INDEX idx_product_images_primary_verified ON public.product_images USING btree (product_id, is_primary, cf_sync_status) WHERE (is_active = true)` |
| idx_product_images_product_id | btree | product_id | não | sim |  | `CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id)` |
| idx_product_images_product_type_active | btree | product_id, image_type, display_order | não | sim | `(is_active = true)` | `CREATE INDEX idx_product_images_product_type_active ON public.product_images USING btree (product_id, image_type, display_order) WHERE (is_active = true)` |
| idx_product_images_seo | btree | product_id, is_active | não | sim | `(alt_text IS NOT NULL)` | `CREATE INDEX idx_product_images_seo ON public.product_images USING btree (product_id, is_active) WHERE (alt_text IS NOT NULL)` |
| idx_product_images_status_active | btree | cf_sync_status | não | sim | `(is_active = true)` | `CREATE INDEX idx_product_images_status_active ON public.product_images USING btree (cf_sync_status) WHERE (is_active = true)` |
| idx_product_images_supplier | btree | source_supplier | não | sim |  | `CREATE INDEX idx_product_images_supplier ON public.product_images USING btree (source_supplier)` |
| idx_product_images_variant_id | btree | variant_id | não | sim | `(variant_id IS NOT NULL)` | `CREATE INDEX idx_product_images_variant_id ON public.product_images USING btree (variant_id) WHERE (variant_id IS NOT NULL)` |
| idx_unique_product_filename | btree | product_id, filename | sim | sim | `((is_active = true) AND (filename IS NOT NULL))` | `CREATE UNIQUE INDEX idx_unique_product_filename ON public.product_images USING btree (product_id, filename) WHERE ((is_active = true) AND (filename IS NOT NULL))` |
| product_images_cloudflare_image_id_key | btree | cloudflare_image_id | sim | sim |  | `CREATE UNIQUE INDEX product_images_cloudflare_image_id_key ON public.product_images USING btree (cloudflare_image_id)` |
| product_images_display_idx | btree | product_id, display_order | não | sim | `(is_active = true)` | `CREATE INDEX product_images_display_idx ON public.product_images USING btree (product_id, display_order) WHERE (is_active = true)` |
| product_images_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_images_pkey ON public.product_images USING btree (id)` |
| uq_product_images_one_primary_per_product | btree | product_id | sim | sim | `((is_primary = true) AND (is_active = true))` | `CREATE UNIQUE INDEX uq_product_images_one_primary_per_product ON public.product_images USING btree (product_id) WHERE ((is_primary = true) AND (is_active = true))` |


## Policies (RLS)

### `product_images_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_images.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK |  |

### `product_images_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_images.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |

### `product_images_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_images.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_images.product_id) AND (p.organization_id IN ( SELECT uo.organization_id            FROM user_organizations uo           WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))))` |

### `product_images_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((is_active = true) OR (organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role]))))))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| trg_auto_classify_image | BEFORE | INSERT | ROW | enabled | public.fn_auto_classify_product_image |
| trg_autolink_canonical_on_content_hash | BEFORE | UPDATE | ROW | enabled | public.fn_autolink_canonical_on_content_hash |
| trg_autopromote_primary_on_deactivation | AFTER | UPDATE | ROW | enabled | public.fn_autopromote_primary_on_deactivation |
| trg_handle_image_restoration | BEFORE | UPDATE | ROW | enabled | public.fn_handle_image_restoration |
| trg_handle_root_soft_delete | AFTER | UPDATE | ROW | enabled | public.fn_handle_canonical_root_soft_delete |
| trg_normalize_image_format | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_normalize_image_format |
| trg_normalize_source_supplier | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_normalize_source_supplier |
| trg_prevent_canonical_chain | BEFORE | UPDATE | ROW | enabled | public.fn_prevent_canonical_chain |
| trg_prevent_canonical_chain_insert | BEFORE | INSERT | ROW | enabled | public.fn_prevent_canonical_chain |
| trg_product_images_seo_autofill | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_product_images_seo_autofill |
| trg_product_images_updated | BEFORE | UPDATE | ROW | enabled | public.fn_update_timestamp |
| trg_rebuild_swatches_on_image | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_trigger_rebuild_swatches_on_image |
| trg_reset_is_shared_on_canonical_null | BEFORE | UPDATE | ROW | enabled | public.fn_reset_is_shared_on_canonical_null |
| trg_sanitize_image_urls | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sanitize_product_image_urls |
| trg_single_primary_image | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_ensure_single_primary_image |
| trg_sync_backfill_queue | AFTER | UPDATE | ROW | enabled | public.fn_sync_backfill_queue_on_pi_fill |
| trg_sync_image_type_code | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_sync_image_type_code |
| trg_sync_product_images | AFTER | INSERT OR DELETE | ROW | enabled | public.fn_sync_product_images_to_products |
| trg_sync_product_images_update | AFTER | UPDATE | ROW | enabled | public.fn_sync_product_images_to_products |
| trg_sync_set_image_url | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_sync_set_image_url |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
