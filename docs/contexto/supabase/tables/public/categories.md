# public.categories

> Árvore hierárquica de categorias (max 6 níveis, auto-referenciada via parent_id). CAMPOS CANÔNICOS: is_active (status), path (materialized path /uuid1/uuid2/), products_count (cache PCA). LEGADOS: active (= is_active), slug (UNIQUE). Dois tipos de raiz: taxonomia canônica (Bar|Cozinha etc.) e coleções endomarketing (Brindes|Unimed etc.).

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
| usada por views | analytics.categories_tree_visual, classification_audit.v_gaps_acionaveis, classification_audit.v_kits_para_revisao, internal.mv_product_leaf_category, public.category_icons, public.v_category_keywords, public.v_products_complete, public.v_system_health_dashboard, public.vw_category_accessories, public.vw_category_commemorative_dates, public.vw_category_completeness, public.vw_category_mapping_gaps, public.vw_category_target_audiences, public.vw_category_variation_types, public.vw_product_color_category_links, public.vw_products_ai_status, public.vw_products_by_date, public.vw_products_commercial_packing, public.vw_products_min_quantity, public.vw_seo_dashboard, public.vw_sitemap_categories |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `name` | `text` | não |  |  |  |
| 3 | `icon` | `text` | sim |  |  | Nome PascalCase de ícone Lucide React (ex: Coffee, Wine, PawPrint, Gamepad2). Regra: 1º char maiúsculo [A-Z], 2º char MINÚSCULO obrigatório [a-z], resto alphanumerico [a-zA-Z0-9]*. Constraint chk_icon_lucide_format: ^[A-Z][a-z][a-zA-Z0-9]*$ Garante que "COFFEE" (all-caps), "NULL" (string), siglas "TV"/"USB" sejam rejeitados. Todos os ícones reais do Lucide React seguem este padrão. Fonte de verdade: este campo. archive.category_icons é legada/arquivada. |
| 4 | `description` | `text` | sim |  |  |  |
| 5 | `parent_id` | `uuid` | sim |  |  |  |
| 8 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 9 | `slug` | `text` | não |  |  |  |
| 10 | `image_url` | `text` | sim |  |  | URL pública da imagem de capa da categoria, servida pelo Cloudflare Images CDN.  PADRÃO CANÔNICO (naming convention obrigatório para novas imagens):   https://imagedelivery.net/vKMs9Ow8bA_enuhLXZ2HAw/cat-{slug}/public  COMPONENTES DA URL:   • Account hash : vKMs9Ow8bA_enuhLXZ2HAw  (ID fixo da conta CF da Promo Brindes)   • Image ID     : cat-{slug}               (prefixo "cat-" + slug da categoria)   • Variant      : public                   (entrega pública sem autenticação)  ESCOPO ATUAL (2026-06-23):   • Apenas categorias level=1 (raiz/parent_id IS NULL) têm image_url preenchido.   • Level 2-5: intencionalmente NULL (navegação secundária sem imagem de capa).   • Cobertura: 26/26 categorias raiz ativas (100%).  REGRAS DE NEGÓCIO:   • Para fazer upload da imagem no Cloudflare Images, o image_id DEVE ser "cat-{slug}".   • Se o slug mudar, a imagem no Cloudflare NÃO é renomeada automaticamente —     apenas o registro no banco é atualizado pelo trigger     trg_sync_image_url_on_slug_update (criado em 2026-06-23).   • URLs fora do padrão canônico (customizadas) são aceitas e preservadas pelo trigger.   • Formato validado pelo CHECK constraint: chk_categories_image_url_format     (padrão: ^https://imagedelivery\.net/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$).  CONSUMERS ATIVOS:   • RPC  get_root_categories()            → menu principal / home do catálogo   • RPC  get_category_with_children()     → página de listagem de categoria   • VIEW vw_sitemap_categories            → sitemap XML (SEO / Google Image Search)   • VIEW vw_sitemap_all                   → união de sitemaps   • VIEW vw_category_completeness         → score de completude (15 pontos)  ATENÇÃO: O campo é nullable. Não adicionar URL se a imagem não existir no CF — a URL seria válida no banco mas geraria 404 no CDN. |
| 11 | `display_order` | `integer` | sim | `0` |  | Ordem de exibição (0=primeiro) |
| 12 | `is_active` | `boolean` | não | `true` |  | CAMPO CANÔNICO de status de categoria. Controla visibilidade no catálogo, filtros e índices.  Ao inativar uma categoria, setar is_active=false e propagar para subcategorias se necessário. O campo legado "active" (Bitrix24) foi eliminado em 2026-06-22 após verificação de zero consumidores. |
| 13 | `updated_at` | `timestamp with time zone` | sim | `now()` |  |  |
| 14 | `organization_id` | `uuid` | não | `'5db5aee1-064b-4ef4-9193-345dcd8274ea'::uuid` |  |  |
| 15 | `bitrix_id` | `integer` | sim |  |  | ID original da categoria no Bitrix24 para sincronização |
| 16 | `bitrix_modified_at` | `timestamp with time zone` | sim |  |  |  |
| 17 | `synced_at` | `timestamp with time zone` | sim |  |  |  |
| 18 | `sync_status` | `text` | sim | `'synced'::text` |  | Status de sincronização da categoria com sistemas externos. Valores: synced (OK), pending (aguardando sync), error (falhou). DEFAULT synced adicionado em 2026-06-23 — backfill de 477 NULLs para synced realizado. |
| 19 | `level` | `integer` | não | `1` |  | Nível na hierarquia (1=raiz, 2=sub, 3=sub-sub, etc) |
| 20 | `path` | `text` | sim |  |  | Materialized path para queries rápidas ex: /124/282/ |
| 21 | `is_visible` | `boolean` | sim | `true` |  |  |
| 22 | `color_hex` | `text` | sim |  |  |  |
| 23 | `meta_title` | `text` | sim |  |  |  |
| 24 | `meta_description` | `text` | sim |  |  |  |
| 25 | `meta_keywords` | `text[]` | sim |  |  |  |
| 26 | `products_count` | `integer` | não | `0` |  | CACHE: Contagem de produtos ativos (p.is_active=true) vinculados a esta categoria via product_category_assignments (PCA). Inclui todos os PCA, não só is_primary. Atualizado pelo trigger fn_trigger_sync_pca_products_count (via PCA DML) e pelo cron category-resync-weekly (dom 02h). NÃO conta via products.category_id direto. |
| 27 | `children_count` | `integer` | sim | `0` |  | CACHE: Total de subcategorias DIRETAS (parent_id = este id). Mantido em sincronia pelo trigger trigger_update_children_count (AFTER INSERT/DELETE/UPDATE OF parent_id). Zero inconsistências. |
| 28 | `descendants_count` | `integer` | sim | `0` |  | CACHE: Total de TODAS as categorias descendentes (filhos, netos, ...). Mantido em sincronia pelo trigger trg_sync_descendants_count (AFTER INSERT/DELETE/UPDATE OF parent_id). Reconstruído via cron refresh-category-ancestors (diário 01h). |
| 29 | `created_by` | `uuid` | sim |  |  |  |
| 30 | `updated_by` | `uuid` | sim |  |  |  |
| 31 | `deleted_at` | `timestamp with time zone` | sim |  |  |  |
| 32 | `full_path_readable` | `text` | sim |  |  | Caminho legível (ex: BAR \| COZINHA > COPOS > VIDRO) |
| 33 | `ai_summary` | `text` | sim |  |  | Resumo da categoria para IAs |
| 34 | `schema_json` | `jsonb` | sim |  |  |  |
| 35 | `seo_priority` | `numeric(2,1)` | sim | `0.7` |  | Prioridade no sitemap (0.0 a 1.0) |
| 36 | `min_order_quantity` | `integer` | sim | `1` |  | Quantidade mínima de pedido padrão para produtos desta categoria. Produtos podem ter override via products.min_order_quantity. Exemplos: Canetas=50, Mochilas=10, Chaveiros=100 |
| 38 | `active` | `boolean` | sim | `is_active` | s |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| categories_bitrix_id_key | UNIQUE | `UNIQUE (bitrix_id)` |  |  | sim |
| categories_children_count_check | CHECK | `CHECK (children_count >= 0)` |  |  | sim |
| categories_color_hex_check | CHECK | `CHECK (color_hex ~* '^#[0-9A-F]{6}$'::text)` |  |  | sim |
| categories_created_by_fkey | FOREIGN KEY | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| categories_descendants_count_check | CHECK | `CHECK (descendants_count >= 0)` |  |  | sim |
| categories_level_check | CHECK | `CHECK (level >= 1 AND level <= 10)` |  |  | sim |
| categories_org_slug_unique | UNIQUE | `UNIQUE (organization_id, slug)` |  |  | sim |
| categories_organization_id_fkey | FOREIGN KEY | `FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| categories_parent_id_fkey | FOREIGN KEY | `FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL` | SET NULL | NO ACTION | sim |
| categories_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| categories_products_count_check | CHECK | `CHECK (products_count >= 0)` |  |  | sim |
| categories_sync_status_check | CHECK | `CHECK (sync_status = ANY (ARRAY['synced'::text, 'pending'::text, 'error'::text]))` |  |  | sim |
| categories_updated_by_fkey | FOREIGN KEY | `FOREIGN KEY (updated_by) REFERENCES auth.users(id)` | NO ACTION | NO ACTION | sim |
| check_no_self_reference | CHECK | `CHECK (id <> parent_id)` |  |  | sim |
| chk_categories_display_order_non_negative | CHECK | `CHECK (display_order >= 0)` |  |  | sim |
| chk_categories_image_url_format | CHECK | `CHECK (image_url IS NULL OR image_url ~ '^https://imagedelivery\.net/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$'::text)` |  |  | sim |
| chk_categories_name_not_empty | CHECK | `CHECK (name !~ '^[[:space:]]*$'::text)` |  |  | sim |
| chk_categories_seo_priority_range | CHECK | `CHECK (seo_priority IS NULL OR seo_priority >= 0.0 AND seo_priority <= 1.0)` |  |  | sim |
| chk_categories_slug_not_empty | CHECK | `CHECK (slug !~ '^[[:space:]]*$'::text)` |  |  | sim |
| chk_icon_lucide_format | CHECK | `CHECK (icon IS NULL OR icon ~ '^[A-Z][a-z][a-zA-Z0-9]*$'::text)` |  |  | sim |


## Referenciada por (FKs de outras tabelas)

| tabela | constraint | colunas | on delete |
|---|---|---|---|
| public.categories | categories_parent_id_fkey | parent_id | SET NULL |
| public.category_accessory_categories | category_accessory_categories_accessory_category_id_fkey | accessory_category_id | CASCADE |
| public.category_accessory_categories | category_accessory_categories_category_id_fkey | category_id | CASCADE |
| public.category_ancestors | category_ancestors_ancestor_id_fkey | ancestor_id | CASCADE |
| public.category_ancestors | category_ancestors_descendant_id_fkey | descendant_id | CASCADE |
| public.category_attributes | category_attributes_category_id_fkey | category_id | CASCADE |
| public.category_colors | fk_category_colors_category | category_id | CASCADE |
| public.category_commemorative_dates | category_commemorative_dates_category_id_fkey | category_id | CASCADE |
| public.category_copywriting_config | category_copywriting_config_category_id_fkey | category_id | CASCADE |
| public.category_target_audiences | category_target_audiences_category_id_fkey | category_id | CASCADE |
| public.category_variation_types | category_variation_types_category_id_fkey | category_id | CASCADE |
| public.markup_configurations | markup_configurations_category_id_fkey | category_id | CASCADE |
| public.product_category_assignments | product_category_assignments_category_id_fkey | category_id | CASCADE |
| public.product_commemorative_dates | product_commemorative_dates_category_id_fkey | category_id | NO ACTION |
| public.product_faqs | product_faqs_category_id_fkey | category_id | CASCADE |
| public.product_similarity_groups | product_similarity_groups_category_id_fkey | category_id | NO ACTION |
| public.product_target_audiences | product_target_audiences_category_id_fkey | category_id | NO ACTION |
| public.products | products_category_id_fkey | category_id | NO ACTION |
| public.products | products_main_category_id_fkey | main_category_id | NO ACTION |
| public.supplier_category_mappings | supplier_category_mappings_category_id_fkey | category_id | NO ACTION |
| public.supplier_subtype_category_map | supplier_subtype_category_map_category_id_fkey | category_id | NO ACTION |
| supplier_stricker.category_mappings | category_mappings_category_id_fkey | category_id | NO ACTION |
| supplier_stricker.stg_product_types | stg_product_types_mapped_to_category_id_fkey | mapped_to_category_id | NO ACTION |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| categories_bitrix_id_key | btree | bitrix_id | sim | sim |  | `CREATE UNIQUE INDEX categories_bitrix_id_key ON public.categories USING btree (bitrix_id)` |
| categories_org_slug_unique | btree | organization_id, slug | sim | sim |  | `CREATE UNIQUE INDEX categories_org_slug_unique ON public.categories USING btree (organization_id, slug)` |
| categories_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id)` |
| idx_cat_parent_nav | btree | parent_id, display_order, id, name, slug, level, is_active, is_visible, icon, children_count | não | sim | `(is_active = true)` | `CREATE INDEX idx_cat_parent_nav ON public.categories USING btree (parent_id, display_order) INCLUDE (id, name, slug, level, is_active, is_visible, icon, children_count) WHERE (is_active = true)` |
| idx_categories_level | btree | level | não | sim |  | `CREATE INDEX idx_categories_level ON public.categories USING btree (level)` |
| idx_categories_level_display_order | btree | level, display_order | não | sim | `((is_active = true) AND (deleted_at IS NULL))` | `CREATE INDEX idx_categories_level_display_order ON public.categories USING btree (level, display_order) WHERE ((is_active = true) AND (deleted_at IS NULL))` |
| idx_categories_org_id | btree | organization_id | não | sim |  | `CREATE INDEX idx_categories_org_id ON public.categories USING btree (organization_id)` |
| idx_categories_parent_id | btree | parent_id | não | sim | `(parent_id IS NOT NULL)` | `CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id) WHERE (parent_id IS NOT NULL)` |
| idx_categories_path_tpo | btree | path | não | sim |  | `CREATE INDEX idx_categories_path_tpo ON public.categories USING btree (path text_pattern_ops)` |
| idx_categories_updated_by | btree | updated_by | não | sim |  | `CREATE INDEX idx_categories_updated_by ON public.categories USING btree (updated_by)` |
| idx_fk_categories_created_by | btree | created_by | não | sim |  | `CREATE INDEX idx_fk_categories_created_by ON public.categories USING btree (created_by)` |
| uq_categories_slug | btree | slug | sim | sim |  | `CREATE UNIQUE INDEX uq_categories_slug ON public.categories USING btree (slug)` |


## Policies (RLS)

### `categories_delete`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| WITH CHECK |  |

### `categories_insert`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | PERMISSIVE |
| roles | public |
| USING |  |
| WITH CHECK | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |

### `categories_public_read`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | anon, authenticated |
| USING | `true` |
| WITH CHECK |  |

### `categories_update`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |
| WITH CHECK | `(organization_id IN ( SELECT uo.organization_id    FROM user_organizations uo   WHERE ((uo.user_id = ( SELECT auth.uid() AS uid)) AND (uo.role = ANY (ARRAY['owner'::org_role, 'admin'::org_role])))))` |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| set_updated_at_trigger | BEFORE | UPDATE | ROW | enabled | public.set_updated_at |
| trg_categories_default_organization | BEFORE | INSERT | ROW | enabled | public.fn_categories_default_organization |
| trg_categories_seo_autofill | BEFORE | INSERT OR UPDATE | ROW | enabled | public.trg_categories_seo_autofill |
| trg_propagate_category_min | AFTER | UPDATE | ROW | enabled | public.fn_trigger_propagate_category_min |
| trg_propagate_fpr | AFTER | UPDATE | ROW | enabled | public.fn_trigger_propagate_fpr |
| trg_sync_category_ancestors | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_trigger_sync_category_ancestors |
| trg_sync_descendants_count | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.fn_trigger_sync_descendants_count |
| trg_sync_image_url_on_slug_update | BEFORE | UPDATE | ROW | enabled | public.fn_sync_category_image_url_on_slug_change |
| trigger_calculate_hierarchy | BEFORE | INSERT OR UPDATE | ROW | enabled | public.calculate_category_hierarchy |
| trigger_prevent_loops | BEFORE | INSERT OR UPDATE | ROW | enabled | public.prevent_category_loops |
| trigger_update_children_count | AFTER | INSERT OR DELETE OR UPDATE | ROW | enabled | public.update_parent_children_count |


## Grants

| role | privilégios |
|---|---|
| anon | SELECT |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
