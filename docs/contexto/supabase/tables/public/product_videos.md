# public.product_videos

> 
Vídeos de produtos hospedados no Cloudflare Stream.

━━━━ CICLO DE VIDA DE UM VÍDEO XBZ ━━━━
  [1] site_data->''video''->''embed_id'' (supplier_products_raw)
      ↓ fn_xbz_populate_videos_from_site (n8n F5a)
  [2] INSERT product_videos: cloudflare_status=''youtube'', source_youtube_id=yt_id
      ↓ fn_xbz_enqueue_videos (n8n F5b)
  [3] INSERT video_import_queue: status=''pending''
      ↓ VPS /workspace/xbz_video_import.js (background)
         ├─ fn_video_queue_next(''xbz'')
         ├─ yt-dlp-standalone → MP4
         ├─ CF Stream API (upload multipart)
         └─ fn_xbz_link_video()
  [4] UPDATE product_videos: cloudflare_status=''ready'', urls CF corretas
      UPDATE products.videos: plataforma=''cloudflare_stream''

━━━━ CICLO DE VIDA DE UM VÍDEO SPOT ━━━━
  Processado por pipeline diferente (fn_video_link_to_products).
  138 vídeos SPOT na conta em 2026-06-07.

━━━━ CAMPO cloudflare_video_id ━━━━
  · Para status=''youtube'': contém o YouTube ID temporariamente
  · Para status=''ready'':   contém o CF Stream UID (32 hex chars)
  O campo source_youtube_id preserva o YouTube ID original para rastreabilidade.

━━━━ SUBDOMAIN CF STREAM ━━━━
  customer-ksi0mrlcw6rwzezz (accountHash Promo Brindes)
  NUNCA usar cd0f4eee542191c4957567814e1f8ca1 (accountId, ≠ accountHash)
  Bug corrigido 2026-06-07: 105 vídeos SPOT + 22 XBZ tinham subdomain errado.

━━━━ COBERTURA EM 2026-06-07 ━━━━
  138 SPOT ready+active + 22 XBZ ready+active = 160 expostos em v_product_videos_ready
  1 SPOT desativado (uid=''abc'', registro corrompido)
  129 XBZ pendentes na video_import_queue

━━━━ ACESSO DO FRONTEND ━━━━
  SEMPRE via v_product_videos_ready (view — fonte única de verdade).
  NÃO ler product_videos diretamente; a view aplica todos os filtros necessários.


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
| usada por views | public.v_media_stats, public.v_product_videos_cdn, public.v_product_videos_ready, public.v_products_without_video, public.v_system_health_dashboard, public.v_video_dashboard, public.v_videos_pending, public.v_videos_with_urls, public.vw_asia_products_stats, public.vw_spot_cf_health |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `product_id` | `uuid` | não |  |  |  |
| 3 | `cloudflare_video_id` | `character varying(100)` | não |  |  | ID único do vídeo no Cloudflare Stream |
| 4 | `url_stream` | `text` | não |  |  | URL para embed (iframe.cloudflarestream.com/{id}) |
| 5 | `url_hls` | `text` | sim |  |  | URL HLS para players customizados |
| 6 | `url_dash` | `text` | sim |  |  |  |
| 7 | `url_thumbnail` | `text` | sim |  |  |  |
| 8 | `filename` | `character varying(255)` | sim |  |  |  |
| 9 | `file_size_bytes` | `bigint` | sim |  |  |  |
| 10 | `duration_seconds` | `integer` | sim |  |  |  |
| 11 | `width_px` | `integer` | sim |  |  |  |
| 12 | `height_px` | `integer` | sim |  |  |  |
| 13 | `video_type` | `character varying(30)` | não | `'demo'::character varying` |  |  |
| 14 | `title` | `character varying(255)` | sim |  |  |  |
| 15 | `description` | `text` | sim |  |  |  |
| 16 | `is_primary` | `boolean` | sim | `false` |  |  |
| 17 | `display_order` | `integer` | sim | `0` |  |  |
| 18 | `source_supplier` | `character varying(50)` | sim | `'stricker'::character varying` |  |  |
| 19 | `source_youtube_id` | `character varying(20)` | sim |  |  | ID do YouTube original (para referência) |
| 20 | `url_original` | `text` | sim |  |  |  |
| 21 | `is_active` | `boolean` | sim | `true` |  |  |
| 22 | `created_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 23 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 24 | `video_type_id` | `uuid` | sim |  |  |  |
| 25 | `cloudflare_status` | `character varying(30)` | sim | `'pending'::character varying` |  |  |
| 26 | `cloudflare_error` | `text` | sim |  |  |  |
| 27 | `uploaded_at` | `timestamp with time zone` | sim |  |  |  |
| 28 | `organization_id` | `uuid` | não | `'5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| product_videos_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id)` | NO ACTION | NO ACTION | sim |
| product_videos_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| product_videos_product_id_fkey | FOREIGN KEY | `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| product_videos_video_type_id_fkey | FOREIGN KEY | `FOREIGN KEY (video_type_id) REFERENCES video_types(id)` | NO ACTION | NO ACTION | sim |
| uq_product_video | UNIQUE | `UNIQUE (product_id, cloudflare_video_id)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_product_videos_active | btree | is_active | não | sim | `(is_active = true)` | `CREATE INDEX idx_product_videos_active ON public.product_videos USING btree (is_active) WHERE (is_active = true)` |
| idx_product_videos_organization_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_product_videos_organization_id ON public.product_videos USING btree (organization_id)` |
| idx_product_videos_status | btree | cloudflare_status | não | sim |  | `CREATE INDEX idx_product_videos_status ON public.product_videos USING btree (cloudflare_status)` |
| idx_product_videos_video_type_id | btree | video_type_id | não | sim |  | `CREATE INDEX idx_product_videos_video_type_id ON public.product_videos USING btree (video_type_id)` |
| idx_pv_supplier | btree | source_supplier | não | sim |  | `CREATE INDEX idx_pv_supplier ON public.product_videos USING btree (source_supplier)` |
| product_videos_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX product_videos_pkey ON public.product_videos USING btree (id)` |
| uq_product_video | btree | product_id, cloudflare_video_id | sim | sim |  | `CREATE UNIQUE INDEX uq_product_video ON public.product_videos USING btree (product_id, cloudflare_video_id)` |


## Policies (RLS)

### `product_videos_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_videos.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK |  |

### `product_videos_oa_ins`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_videos.product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `product_videos_oa_upd`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_videos.product_id) AND is_org_owner_or_admin(p.organization_id))))` |
| WITH CHECK | `(EXISTS ( SELECT 1    FROM products p   WHERE ((p.id = product_videos.product_id) AND is_org_owner_or_admin(p.organization_id))))` |

### `product_videos_select`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `((is_active = true) OR (( SELECT ( SELECT auth.uid() AS uid) AS uid) IS NOT NULL))` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_product_videos | BEFORE | UPDATE | ROW | enabled | public.trg_video_queue_updated_at |
| trg_normalize_source_supplier_videos | BEFORE | INSERT OR UPDATE | ROW | enabled | public.fn_normalize_source_supplier_videos |
| trg_single_primary_video | BEFORE | INSERT OR UPDATE | ROW | enabled | public.ensure_single_primary_video |
| trg_validate_video_on_insert | AFTER | INSERT | ROW | enabled | public.fn_validate_video_on_change |
| trg_validate_video_on_update | AFTER | UPDATE | ROW | enabled | public.fn_validate_video_on_change |


## Grants

| role | privilégios |
|---|---|
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
