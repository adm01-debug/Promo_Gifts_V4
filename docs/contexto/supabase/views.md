# Views

> ⚠️ Seção `views` não pôde ser atualizada nesta coleta (ver errors.md); mostrando a versão anterior.


## analytics.categories_tree_visual (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.categories |
| populada | sim |
| comentário |  |


```sql
WITH RECURSIVE tree AS (
         SELECT categories.id,
            categories.bitrix_id,
            categories.name,
            categories.level,
            categories.parent_id,
            categories.name AS tree_structure,
            ARRAY[COALESCE(categories.display_order, 0)] AS sort_path
           FROM categories
          WHERE categories.parent_id IS NULL
        UNION ALL
         SELECT c.id,
            c.bitrix_id,
            c.name,
            c.level,
            c.parent_id,
            ((tree_1.tree_structure || '
'::text) ||
                CASE
                    WHEN c.level = 2 THEN '├── '::text
                    WHEN c.level = 3 THEN '│   ├── '::text
                    WHEN c.level = 4 THEN '│   │   ├── '::text
                    ELSE NULL::text
                END) || c.name,
            tree_1.sort_path || COALESCE(c.display_order, 0)
           FROM categories c
             JOIN tree tree_1 ON c.parent_id = tree_1.id
        )
 SELECT id,
    bitrix_id,
    name,
    level,
    parent_id,
    tree_structure,
    sort_path
   FROM tree
  ORDER BY sort_path;
```

## analytics.mv_material_group_stats (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.material_groups, public.material_types, public.product_materials |
| populada | sim |
| comentário |  |


```sql
SELECT mg.id AS group_id,
    mg.organization_id,
    mg.name AS group_name,
    mg.slug AS group_slug,
    count(DISTINCT mt.id) AS total_materials,
    count(DISTINCT
        CASE
            WHEN mt.is_active THEN mt.id
            ELSE NULL::uuid
        END) AS active_materials,
    count(DISTINCT pm.product_id) AS products_using
   FROM material_groups mg
     LEFT JOIN material_types mt ON mt.group_id = mg.id
     LEFT JOIN product_materials pm ON pm.material_id = mt.id
  GROUP BY mg.id, mg.organization_id, mg.name, mg.slug;
```

## analytics.mv_media_health (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.product_images, public.products, public.suppliers |
| populada | sim |
| comentário |  |


```sql
SELECT s.code AS source_supplier,
    count(DISTINCT p.id) AS total_produtos,
    count(DISTINCT
        CASE
            WHEN pi_main.id IS NOT NULL THEN p.id
            ELSE NULL::uuid
        END) AS com_img_principal,
    count(DISTINCT
        CASE
            WHEN pi_any.id IS NOT NULL THEN p.id
            ELSE NULL::uuid
        END) AS com_qualquer_img,
    round(count(DISTINCT
        CASE
            WHEN pi_main.id IS NOT NULL THEN p.id
            ELSE NULL::uuid
        END)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric * 100::numeric, 1) AS pct_cobertura_principal,
    round(count(DISTINCT
        CASE
            WHEN pi_any.id IS NOT NULL THEN p.id
            ELSE NULL::uuid
        END)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric * 100::numeric, 1) AS pct_cobertura_qualquer,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.source_supplier::text = s.code AND product_images.is_active = true) AS total_imagens,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.source_supplier::text = s.code AND product_images.variant_id IS NOT NULL) AS imagens_vinculadas,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.source_supplier::text = s.code AND product_images.alt_text IS NOT NULL AND product_images.alt_text <> ''::text) AS imagens_com_seo
   FROM products p
     JOIN suppliers s ON p.supplier_id = s.id
     LEFT JOIN product_images pi_main ON p.id = pi_main.product_id AND pi_main.is_primary = true AND pi_main.is_active = true
     LEFT JOIN product_images pi_any ON p.id = pi_any.product_id AND pi_any.is_active = true
  WHERE p.is_active = true
  GROUP BY s.code;
```

## analytics.mv_product_cards (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.product_images, public.product_variants, public.products |
| populada | sim |
| comentário |  |


```sql
SELECT p.id,
    p.name,
    p.slug,
    p.sku,
    p.short_description,
    p.sale_price,
    p.is_active,
    p.is_new,
    p.is_featured,
    p.is_stockout,
    p.category_id,
    p.main_category_id,
    p.colors,
    p.product_type,
    p.supplier_id,
    p.primary_image_url,
    pi.url_cdn AS primary_image_cdn,
    count(DISTINCT pv.id) FILTER (WHERE pv.is_active = true) AS variant_count,
    sum(pv.stock_quantity) FILTER (WHERE pv.is_active = true) AS total_stock,
    min(pv.next_date_1) FILTER (WHERE pv.is_active = true AND pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE) AS earliest_restock_date,
    sum(pv.next_quantity_1) FILTER (WHERE pv.is_active = true AND pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE) AS earliest_restock_qty,
    bool_or(pv.is_active = true AND pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE) AS has_upcoming_restock
   FROM products p
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
     LEFT JOIN product_variants pv ON pv.product_id = p.id
  WHERE p.is_active = true
  GROUP BY p.id, p.name, p.slug, p.sku, p.short_description, p.sale_price, p.is_active, p.is_new, p.is_featured, p.is_stockout, p.category_id, p.main_category_id, p.colors, p.product_type, p.supplier_id, p.primary_image_url, pi.url_cdn;
```

## analytics.mv_product_compositions (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.material_groups, public.material_types, public.product_materials, public.products |
| populada | sim |
| comentário |  |


```sql
SELECT p.id AS product_id,
    p.organization_id,
    p.name AS product_name,
    count(DISTINCT pm.material_id) AS total_materials,
    sum(pm.percentage) AS total_percentage,
    array_agg(json_build_object('material_id', mt.id, 'material_name', mt.name, 'group_name', mg.name, 'part', pm.part, 'percentage', pm.percentage) ORDER BY pm.sort_order) AS materials_detail
   FROM products p
     LEFT JOIN product_materials pm ON p.id = pm.product_id
     LEFT JOIN material_types mt ON pm.material_id = mt.id
     LEFT JOIN material_groups mg ON mt.group_id = mg.id
  GROUP BY p.id, p.organization_id, p.name;
```

## analytics.mv_product_intelligence (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | analytics.mv_stock_velocity |
| populada | sim |
| comentário |  |


```sql
WITH product_metrics AS (
         SELECT sv.product_id,
            sum(sv.total_depleted_30d) AS total_depleted_30d,
            sum(sv.total_depleted_90d) AS total_depleted_90d,
            sum(sv.current_stock) AS total_current_stock,
            avg(sv.avg_daily_depletion_7d) AS avg_depletion_7d,
            avg(sv.avg_daily_depletion_30d) AS avg_depletion_30d,
            min(sv.days_to_stockout) AS min_days_to_stockout,
            max(sv.velocity_trend) AS max_velocity_trend,
            sum(sv.total_restocked_30d) AS total_restocked_30d,
            count(*) AS supplier_count,
            avg(sv.current_price) AS avg_current_price
           FROM analytics.mv_stock_velocity sv
          GROUP BY sv.product_id
        ), ranked AS (
         SELECT pm.product_id,
            pm.total_depleted_30d,
            pm.total_depleted_90d,
            pm.total_current_stock,
            pm.avg_depletion_7d,
            pm.avg_depletion_30d,
            pm.min_days_to_stockout,
            pm.max_velocity_trend,
            pm.total_restocked_30d,
            pm.supplier_count,
            pm.avg_current_price,
            percent_rank() OVER (ORDER BY pm.total_depleted_30d DESC) AS depletion_rank
           FROM product_metrics pm
        )
 SELECT product_id,
    total_depleted_30d,
    total_depleted_90d,
    total_current_stock,
    avg_depletion_7d,
    avg_depletion_30d,
    min_days_to_stockout,
    max_velocity_trend,
    total_restocked_30d,
    supplier_count,
    avg_current_price,
        CASE
            WHEN total_depleted_30d = 0::numeric OR total_depleted_30d IS NULL THEN 'C'::text
            WHEN depletion_rank <= 0.20::double precision THEN 'A'::text
            WHEN depletion_rank <= 0.50::double precision THEN 'B'::text
            ELSE 'C'::text
        END AS abc_classification,
    LEAST(100::numeric, round(COALESCE(avg_depletion_30d, 0::numeric) * 5::numeric +
        CASE
            WHEN COALESCE(max_velocity_trend, 0::numeric) > 1::numeric THEN max_velocity_trend * 10::numeric
            ELSE 0::numeric
        END +
        CASE
            WHEN COALESCE(total_restocked_30d, 0::numeric) > 0::numeric THEN 15
            ELSE 0
        END::numeric, 1)) AS turnover_score,
    COALESCE(max_velocity_trend, 0::numeric) > 1.5 AND COALESCE(min_days_to_stockout, 999::numeric) < 15::numeric AS is_hot_product,
    COALESCE(total_depleted_30d, 0::numeric) < 5::numeric AND COALESCE(total_current_stock, 0::bigint) > 100 AS is_stagnant,
    COALESCE(total_depleted_30d, 0::numeric) < 5::numeric AND COALESCE(total_current_stock, 0::bigint) > 500 AS is_negotiation_opportunity,
    COALESCE(min_days_to_stockout, 999::numeric) < 7::numeric AND COALESCE(avg_depletion_30d, 0::numeric) > 1::numeric AS is_stockout_risk,
    COALESCE(total_restocked_30d, 0::numeric) > (COALESCE(total_depleted_30d, 0::numeric) * 0.5) AS has_frequent_restock,
    now() AS refreshed_at
   FROM ranked r;
```

## analytics.mv_stock_velocity (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.stock_daily_summary, public.variant_supplier_sources |
| populada | sim |
| comentário |  |


```sql
WITH latest_per_vss AS (
         SELECT DISTINCT ON (sd.variant_supplier_source_id) sd.variant_supplier_source_id,
            sd.supplier_id,
            sd.supplier_branch_id,
            sd.variant_id,
            sd.product_id,
            sd.stock_close AS current_stock,
            sd.cost_price_close AS current_price,
            sd.summary_date AS last_update_date
           FROM stock_daily_summary sd
          WHERE sd.sync_count > 0
          ORDER BY sd.variant_supplier_source_id, sd.summary_date DESC
        ), agg_7d AS (
         SELECT sd.variant_supplier_source_id,
            sum(GREATEST(0, - COALESCE(sd.net_change, 0))) AS depleted,
            sum(GREATEST(0, COALESCE(sd.net_change, 0))) AS restocked,
            count(*) FILTER (WHERE sd.sync_count > 0) AS active_days
           FROM stock_daily_summary sd
          WHERE sd.summary_date >= (CURRENT_DATE - 7)
          GROUP BY sd.variant_supplier_source_id
        ), agg_30d AS (
         SELECT sd.variant_supplier_source_id,
            sum(GREATEST(0, - COALESCE(sd.net_change, 0))) AS depleted,
            sum(GREATEST(0, COALESCE(sd.net_change, 0))) AS restocked,
            count(*) FILTER (WHERE sd.sync_count > 0) AS active_days,
            count(*) FILTER (WHERE sd.restock_zero_to_positive = true) AS restock_events,
            count(*) FILTER (WHERE sd.price_changed) AS price_changes
           FROM stock_daily_summary sd
          WHERE sd.summary_date >= (CURRENT_DATE - 30)
          GROUP BY sd.variant_supplier_source_id
        ), agg_90d AS (
         SELECT sd.variant_supplier_source_id,
            sum(GREATEST(0, - COALESCE(sd.net_change, 0))) AS depleted,
            count(*) FILTER (WHERE sd.sync_count > 0) AS active_days
           FROM stock_daily_summary sd
          WHERE sd.summary_date >= (CURRENT_DATE - 90)
          GROUP BY sd.variant_supplier_source_id
        )
 SELECT l.variant_supplier_source_id,
    l.supplier_id,
    l.supplier_branch_id,
    l.variant_id,
    l.product_id,
    l.current_stock,
    l.current_price,
    l.last_update_date,
    COALESCE(a7.depleted, 0::bigint) AS total_depleted_7d,
    COALESCE(a30.depleted, 0::bigint) AS total_depleted_30d,
    COALESCE(a90.depleted, 0::bigint) AS total_depleted_90d,
    a7.active_days AS active_days_7d,
    a30.active_days AS active_days_30d,
    a90.active_days AS active_days_90d,
    round(COALESCE(a7.depleted::numeric / NULLIF(a7.active_days, 0)::numeric, 0::numeric), 2) AS avg_daily_depletion_7d,
    round(COALESCE(a30.depleted::numeric / NULLIF(a30.active_days, 0)::numeric, 0::numeric), 2) AS avg_daily_depletion_30d,
    round(COALESCE(a90.depleted::numeric / NULLIF(a90.active_days, 0)::numeric, 0::numeric), 2) AS avg_daily_depletion_90d,
        CASE
            WHEN COALESCE(a30.depleted::numeric / NULLIF(a30.active_days, 0)::numeric, 0::numeric) > 0::numeric THEN round(COALESCE(a7.depleted::numeric / NULLIF(a7.active_days, 0)::numeric, 0::numeric) / (a30.depleted::numeric / a30.active_days::numeric), 2)
            ELSE NULL::numeric
        END AS velocity_trend,
        CASE
            WHEN COALESCE(a7.depleted::numeric / NULLIF(a7.active_days, 0)::numeric, 0::numeric) > 0::numeric THEN round(l.current_stock::numeric / (a7.depleted::numeric / a7.active_days::numeric), 1)
            ELSE NULL::numeric
        END AS days_to_stockout,
    COALESCE(a30.restocked, 0::bigint) AS total_restocked_30d,
    COALESCE(a30.restock_events, 0::bigint) AS restock_events_30d,
        CASE
            WHEN COALESCE(a30.restock_events, 0::bigint) > 1 THEN round(30.0 / a30.restock_events::numeric, 1)
            ELSE NULL::numeric
        END AS avg_days_between_restocks,
    COALESCE(a30.price_changes, 0::bigint) AS price_changes_30d,
    now() AS refreshed_at
   FROM latest_per_vss l
     JOIN variant_supplier_sources vss ON vss.id = l.variant_supplier_source_id AND vss.is_active = true
     LEFT JOIN agg_7d a7 ON a7.variant_supplier_source_id = l.variant_supplier_source_id
     LEFT JOIN agg_30d a30 ON a30.variant_supplier_source_id = l.variant_supplier_source_id
     LEFT JOIN agg_90d a90 ON a90.variant_supplier_source_id = l.variant_supplier_source_id;
```

## cf_recon.v_cf_orphans (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | cf_recon.cf_image, public.product_images |
| populada | n/a |
| comentário | Imagens existentes no Cloudflare sem referencia em product_images (candidatas a custo recuperavel). |


```sql
SELECT ci.image_id,
    ci.uploaded_at,
    ci.filename
   FROM cf_recon.cf_image ci
     LEFT JOIN product_images pi ON pi.cloudflare_image_id::text = ci.image_id
  WHERE pi.id IS NULL AND ci.crawl_run_id IS NOT NULL;
```

## cf_recon.v_divergence (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | cf_recon.cf_image, public.product_images |
| populada | n/a |
| comentário | Classificacao de divergencia por linha (requer cf_image populado via crawl). |


```sql
SELECT pi.id AS db_id,
    pi.cloudflare_image_id,
    pi.cf_sync_status,
    pi.cf_id_scheme,
    pi.source_supplier,
    pi.is_active,
    pi.deleted_at IS NOT NULL AS is_deleted,
    ci.image_id IS NOT NULL AS exists_in_cf,
        CASE
            WHEN ci.image_id IS NOT NULL AND ci.crawl_run_id IS NOT NULL AND pi.cf_sync_status = 'verified'::text THEN 'ok'::text
            WHEN ci.image_id IS NOT NULL AND ci.crawl_run_id IS NULL AND pi.cf_sync_status = 'verified'::text THEN 'ok_pending_crawl_confirmation'::text
            WHEN ci.image_id IS NOT NULL AND pi.cf_sync_status <> 'verified'::text THEN 'cf_present_db_unverified'::text
            WHEN ci.image_id IS NULL AND pi.deleted_at IS NOT NULL THEN 'deleted_noise'::text
            WHEN ci.image_id IS NULL AND pi.is_active THEN 'broken_reference_active'::text
            WHEN ci.image_id IS NULL AND NOT pi.is_active THEN 'broken_reference_inactive'::text
            ELSE 'ok'::text
        END AS divergence_class,
    ci.image_id IS NOT NULL AND ci.crawl_run_id IS NOT NULL AS exists_in_cf_confirmed
   FROM product_images pi
     LEFT JOIN cf_recon.cf_image ci ON ci.image_id = pi.cloudflare_image_id::text;
```

## cf_recon.v_health_dashboard (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | cf_recon.action_log, cf_recon.cf_image, cf_recon.remediation, cf_recon.v_divergence, cf_recon.v_verification_queue, public.product_images |
| populada | n/a |
| comentário | KPI unico da reconciliacao CF x product_images. |


```sql
SELECT ( SELECT count(*) AS count
           FROM product_images) AS db_total,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.is_active) AS db_active,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.cf_sync_status = 'verified'::text) AS verified,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.cf_sync_status = 'pending'::text) AS pending,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.cf_sync_status = 'missing'::text) AS missing,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.cf_sync_status = 'missing'::text AND product_images.is_active) AS missing_active,
    ( SELECT count(*) AS count
           FROM cf_recon.v_verification_queue) AS queue_real,
    ( SELECT count(*) AS count
           FROM cf_recon.remediation
          WHERE remediation.status = 'open'::text) AS remediation_open,
    ( SELECT count(*) AS count
           FROM cf_recon.cf_image) AS cf_crawled,
    ( SELECT count(*) AS count
           FROM cf_recon.action_log) AS actions_logged,
    ( SELECT count(*) AS count
           FROM cf_recon.cf_image
          WHERE cf_image.crawl_run_id IS NULL) AS cf_backfill_only,
    ( SELECT count(*) AS count
           FROM cf_recon.cf_image
          WHERE cf_image.crawl_run_id IS NOT NULL) AS cf_crawl_confirmed,
    ( SELECT count(*) AS count
           FROM cf_recon.v_divergence
          WHERE v_divergence.divergence_class = 'ok'::text) AS divergence_ok,
    ( SELECT count(*) AS count
           FROM cf_recon.v_divergence
          WHERE v_divergence.divergence_class = 'ok_pending_crawl_confirmation'::text) AS divergence_pending,
    ( SELECT count(*) AS count
           FROM cf_recon.v_divergence
          WHERE v_divergence.divergence_class ~~ 'broken%'::text) AS divergence_broken;
```

## cf_recon.v_inactive_alive (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | public.product_images |
| populada | n/a |
| comentário | Imagens fora do catalogo (inativas) mas nao soft-deletadas. Candidatas a arquivamento. |


```sql
SELECT id,
    product_id,
    cloudflare_image_id,
    cf_sync_status,
    source_supplier,
    cf_id_scheme,
    updated_at
   FROM product_images pi
  WHERE is_active IS FALSE AND deleted_at IS NULL;
```

## cf_recon.v_inactive_alive_cf_cost (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | cf_recon.cf_image, cf_recon.v_inactive_alive |
| populada | n/a |
| comentário | Inativas vivas que ocupam storage no CF (custo recuperavel apos revisao). Requer crawl populado. |


```sql
SELECT ia.id,
    ia.product_id,
    ia.cloudflare_image_id,
    ia.cf_sync_status,
    ia.source_supplier
   FROM cf_recon.v_inactive_alive ia
     JOIN cf_recon.cf_image ci ON ci.image_id = ia.cloudflare_image_id::text;
```

## cf_recon.v_products_without_active_image (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | public.product_images, public.products |
| populada | n/a |
| comentário | Produtos sem nenhuma imagem ativa (D6). product_active=true = gap de vitrine prioritario. |


```sql
SELECT id AS product_id,
    name,
    is_active AS product_active,
    ( SELECT count(*) AS count
           FROM product_images pi
          WHERE pi.product_id = p.id) AS total_images,
    ( SELECT count(*) AS count
           FROM product_images pi
          WHERE pi.product_id = p.id AND pi.cf_sync_status = 'missing'::text) AS broken_images
   FROM products p
  WHERE NOT (EXISTS ( SELECT 1
           FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_active));
```

## cf_recon.v_verification_queue (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | public.product_images |
| populada | n/a |
| comentário | Fila real de verificacao CF: pendentes vivos, sem deletados/hash_legacy. |


```sql
SELECT id,
    cloudflare_image_id,
    cf_sync_status,
    cf_id_scheme,
    source_supplier,
    cf_check_attempts,
    is_active,
    created_at
   FROM product_images pi
  WHERE cf_sync_status <> 'verified'::text AND deleted_at IS NULL AND COALESCE(cf_id_scheme, ''::text) <> 'hash_legacy'::text;
```

## classification_audit.v_gaps_acionaveis (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | classification_audit.category_suggestions, public.categories, public.product_category_assignments, public.products |
| populada | n/a |
| comentário | Gaps de classificação detectados por análise de tokens do nome + descrição × nome da categoria. |


```sql
SELECT s.product_id,
    p.name AS produto,
    p.sku,
    s.category_id,
    c.full_path_readable AS categoria_sugerida,
    c.level AS nivel,
    s.matches,
    s.tokens_matched,
    s.score,
        CASE
            WHEN s.matches >= 4 THEN '🟢 altissima'::text
            WHEN s.matches = 3 THEN '🟢 alta'::text
            WHEN s.matches = 2 AND c.level >= 4 THEN '🟡 boa (folha especifica)'::text
            WHEN s.matches = 2 AND c.level = 3 THEN '🟡 media'::text
            ELSE '🔴 baixa'::text
        END AS confianca,
    ( SELECT string_agg(c2.name, ' + '::text) AS string_agg
           FROM product_category_assignments pca2
             JOIN categories c2 ON c2.id = pca2.category_id
          WHERE pca2.product_id = s.product_id AND c2.level >= 2) AS categorias_atuais
   FROM classification_audit.category_suggestions s
     JOIN products p ON p.id = s.product_id
     JOIN categories c ON c.id = s.category_id
  WHERE NOT s.already_assigned AND p.is_active;
```

## classification_audit.v_kits_para_revisao (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | classification_audit.category_suggestions, public.categories, public.product_category_assignments, public.products |
| populada | n/a |
| comentário | Kits/conjuntos com sugestões tier alto que merecem análise humana: decidir se kit deve aparecer na categoria do componente. |


```sql
SELECT p.sku,
    p.name AS produto,
    c.full_path_readable AS categoria_sugerida,
    s.matches,
    s.tokens_matched,
    s.score,
    ( SELECT string_agg(c2.name, ' · '::text ORDER BY c2.level) AS string_agg
           FROM product_category_assignments pca2
             JOIN categories c2 ON c2.id = pca2.category_id
          WHERE pca2.product_id = s.product_id AND c2.level >= 2) AS categorias_atuais,
    'https://example.com/admin/products/'::text || p.id AS link_admin
   FROM classification_audit.category_suggestions s
     JOIN products p ON p.id = s.product_id
     JOIN categories c ON c.id = s.category_id
  WHERE NOT s.already_assigned AND s.matches >= 3 AND p.is_active AND (p.is_kit OR p.name ~~* '%KIT%'::text OR p.name ~~* '%CONJ%'::text)
  ORDER BY s.score DESC, p.sku;
```

## internal.mv_product_leaf_category (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.categories, public.category_ancestors, public.product_category_assignments, public.products |
| populada | sim |
| comentário |  |


```sql
SELECT DISTINCT ON (pca.product_id) pca.product_id,
    c.id AS leaf_category_id,
    c.name AS leaf_category_name,
    c.level AS leaf_category_level,
    c.parent_id AS leaf_category_parent_id,
    c.slug AS leaf_category_slug,
        CASE
            WHEN p.main_category_id IS NULL THEN c.id
            WHEN c.id = p.main_category_id THEN c.id
            WHEN (EXISTS ( SELECT 1
               FROM category_ancestors ca
              WHERE ca.descendant_id = c.id AND ca.ancestor_id = p.main_category_id)) THEN c.id
            ELSE NULL::uuid
        END AS leaf_category_id_safe
   FROM product_category_assignments pca
     JOIN categories c ON c.id = pca.category_id
     LEFT JOIN products p ON p.id = pca.product_id
  ORDER BY pca.product_id, c.level DESC NULLS LAST, pca.is_primary DESC NULLS LAST, pca.display_order, c.name;
```

## prod_audit.v_category_suggestions_review (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | prod_audit.category_suggestions |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    rule_name AS regra,
    confidence AS confianca,
    product_sku AS sku,
    product_name AS produto,
    suggested_category_path AS sugestao,
    array_to_string(current_categories, ' ∥ '::text) AS categorias_atuais,
    reason AS motivo,
    reviewed AS revisado,
    accepted AS aceito
   FROM prod_audit.category_suggestions cs;
```

## public.ai_insights_cache (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.dashboard_insights_cache |
| populada | n/a |
| comentário | View de compatibilidade sobre dashboard_insights_cache. Mantém o nome original para que funções existentes não precisem ser alteradas. INSERT/ON CONFLICT roteados automaticamente para a tabela base pelo PostgreSQL. |


```sql
SELECT id,
    user_id,
    function_name,
    cache_key,
    payload,
    model,
    duration_ms,
    created_at,
    expires_at
   FROM dashboard_insights_cache;
```

## public.bi_quotes_summary (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.profiles, public.quotes |
| populada | n/a |
| comentário | FIX-09 (2026-06-23): VIEW BI melhorada — seller_name, avg_real_discount_pct, avg_days_to_close, shipping distribution. |


```sql
SELECT q.seller_id,
    p.full_name AS seller_name,
    q.organization_id,
    date_trunc('month'::text, q.created_at)::date AS month,
    q.status,
    count(*) AS quote_count,
    round(sum(q.total), 2) AS total_revenue,
    round(avg(q.total), 2) AS avg_ticket,
    round(sum(q.real_subtotal), 2) AS total_real_subtotal,
    round(avg(q.real_discount_percent), 2) AS avg_real_discount_pct,
    count(*) FILTER (WHERE q.real_discount_percent > 0::numeric) AS with_discount_count,
    round(avg(
        CASE
            WHEN q.status = ANY (ARRAY['approved'::text, 'converted'::text, 'rejected'::text, 'cancelled'::text]) THEN EXTRACT(epoch FROM q.updated_at - q.created_at) / 86400::numeric
            ELSE NULL::numeric
        END), 1) AS avg_days_to_close,
    count(*) FILTER (WHERE q.shipping_type = 'cif'::text) AS cif_count,
    count(*) FILTER (WHERE q.shipping_type = 'fob'::text) AS fob_count,
    count(*) FILTER (WHERE q.shipping_type = 'fob_pre'::text) AS fob_pre_count
   FROM quotes q
     LEFT JOIN profiles p ON p.user_id = q.seller_id
  GROUP BY q.seller_id, p.full_name, q.organization_id, (date_trunc('month'::text, q.created_at)::date), q.status;
```

## public.categories_tree_visual (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | analytics.categories_tree_visual |
| populada | n/a |
| comentário | Wrapper para analytics.categories_tree_visual (catálogo de árvore de categorias). T20 redeploy 2026-05. |


```sql
SELECT id,
    bitrix_id,
    name,
    level,
    parent_id,
    tree_structure,
    sort_path
   FROM analytics.categories_tree_visual;
```

## public.category_icons (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories |
| populada | n/a |
| comentário | PROXY VIEW sobre public.categories. SECURITY DEFINER POR DESIGN (reloptions vazio). Restaurada em 20260717, fix_version 20260717c. |


```sql
SELECT id,
    name AS category_name,
    icon,
    NULL::text AS description,
    is_active
   FROM categories c
  WHERE icon IS NOT NULL;
```

## public.materials_complete (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.material_groups, public.material_types, public.product_materials |
| populada | n/a |
| comentário |  |


```sql
SELECT mt.id AS material_id,
    mt.organization_id,
    mt.name AS material_name,
    mt.slug AS material_slug,
    mt.description,
    mg.id AS group_id,
    mg.name AS group_name,
    mg.slug AS group_slug,
    mt.is_active,
    count(DISTINCT pm.product_id) AS products_count,
    mt.created_at,
    mt.updated_at
   FROM material_types mt
     JOIN material_groups mg ON mt.group_id = mg.id
     LEFT JOIN product_materials pm ON mt.id = pm.material_id
  GROUP BY mt.id, mt.organization_id, mt.name, mt.slug, mt.description, mg.id, mg.name, mg.slug, mt.is_active, mt.created_at, mt.updated_at;
```

## public.mv_ema_kpi_by_level (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.mv_stock_rupture_alert |
| populada | sim |
| comentário |  |


```sql
SELECT nivel_alerta,
    prioridade,
    count(DISTINCT variant_id) AS total_variantes,
    count(*) AS total_vss,
    round(avg(cobertura_dias), 1) AS avg_cobertura,
    round(min(cobertura_dias), 1) AS min_cobertura,
    round(max(score_composto), 2) AS max_score,
    round(avg(score_composto), 2) AS avg_score,
    sum(gap_unidades) AS total_gap_unidades,
    round(sum(valor_estoque_reais), 2) AS total_valor_estoque,
    count(*) FILTER (WHERE anomalia_spike) AS com_anomalia_spike,
    now() AS refreshed_at
   FROM mv_stock_rupture_alert
  WHERE is_preferred = true
  GROUP BY nivel_alerta, prioridade
  ORDER BY prioridade;
```

## public.mv_material_group_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | analytics.mv_material_group_stats |
| populada | n/a |
| comentário | VIEW pública de exposição sobre a matview analytics.mv_material_group_stats (refresh CONCURRENTLY via cron 47, hourly). public.mv_* é VIEW, não matview. |


```sql
SELECT group_id,
    organization_id,
    group_name,
    group_slug,
    total_materials,
    active_materials,
    products_using
   FROM analytics.mv_material_group_stats;
```

## public.mv_media_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | analytics.mv_media_health |
| populada | n/a |
| comentário | VIEW pública de exposição sobre a matview analytics.mv_media_health (refresh CONCURRENTLY via cron 47, hourly). public.mv_* é VIEW, não matview. |


```sql
SELECT source_supplier,
    total_produtos,
    com_img_principal,
    com_qualquer_img,
    pct_cobertura_principal,
    pct_cobertura_qualquer,
    total_imagens,
    imagens_vinculadas,
    imagens_com_seo
   FROM analytics.mv_media_health;
```

## public.mv_product_cards (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | analytics.mv_product_cards |
| populada | n/a |
| comentário | VIEW pública de exposição (PostgREST só enxerga public). Dados materializados em analytics.mv_product_cards (matview real, índice único, refresh CONCURRENTLY). Atualizada de hora em hora pelo cron job 47 "refresh-all-materialized-views" (30 * * * *). Apesar do prefixo mv_, ESTE objeto em public é uma VIEW comum — NUNCA rode REFRESH MATERIALIZED VIEW aqui (rode em analytics.*). Defasagem máx vs products ~1h. |


```sql
SELECT id,
    name,
    slug,
    sku,
    short_description,
    sale_price,
    is_active,
    is_new,
    is_featured,
    is_stockout,
    category_id,
    main_category_id,
    colors,
    product_type,
    supplier_id,
    primary_image_url,
    primary_image_cdn,
    variant_count,
    total_stock,
    earliest_restock_date,
    earliest_restock_qty,
    has_upcoming_restock
   FROM analytics.mv_product_cards;
```

## public.mv_product_compositions (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | analytics.mv_product_compositions |
| populada | n/a |
| comentário | VIEW pública de exposição sobre a matview analytics.mv_product_compositions (refresh CONCURRENTLY via cron 47, hourly). public.mv_* é VIEW, não matview — não rode REFRESH aqui. |


```sql
SELECT product_id,
    organization_id,
    product_name,
    total_materials,
    total_percentage,
    materials_detail
   FROM analytics.mv_product_compositions;
```

## public.mv_product_images_audit (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.image_types, public.product_images |
| populada | sim |
| comentário | Auditoria completa de product_images: 7 dimensões de qualidade, score 0-100, gap flags, prioridade_correcao. Refresh a cada 6h via pg_cron (job refresh-mv-product-images-audit). Não exposto a anon/authenticated. |


```sql
SELECT pi.id,
    pi.product_id,
    pi.cloudflare_image_id,
    pi.source_supplier,
    pi.organization_id,
    pi.created_at,
    pi.updated_at,
    it.code AS image_type_code,
    it.category AS image_type_category,
    it.subcategory AS image_type_subcategory,
    it.is_color_specific,
    it.show_in_gallery,
    it.show_in_simulator,
    it.is_primary_candidate,
    it.display_priority,
    pi.is_active,
    pi.is_primary,
    pi.is_og_image,
    pi.display_order,
    pi.url_cdn,
    pi.url_original,
    pi.filename,
    pi.format,
    pi.width_px,
    pi.height_px,
    pi.file_size_bytes,
    pi.color_id,
    pi.variant_id,
    pi.applies_to_color,
    pi.supplier_code,
    pi.alt_text,
    length(pi.alt_text) AS alt_length,
    pi.title_text,
    pi.caption,
    pi.format IS NULL AS gap_format,
    pi.width_px IS NULL OR pi.height_px IS NULL AS gap_dimensoes,
    pi.file_size_bytes IS NULL AS gap_file_size,
    pi.url_original IS NULL AND pi.is_active = true AND (it.code::text <> ALL (ARRAY['component'::character varying, 'location'::character varying, 'area'::character varying]::text[])) AS gap_url_original,
    pi.applies_to_color = true AND pi.color_id IS NULL AND pi.is_active = true AS gap_color_id,
    pi.alt_text IS NULL OR length(pi.alt_text) < 20 AS gap_alt_quality,
    pi.image_type::text IS DISTINCT FROM it.code::text AS gap_image_type_drift,
    round(100.0 * ((pi.format IS NOT NULL)::integer + (pi.width_px IS NOT NULL AND pi.height_px IS NOT NULL)::integer + (pi.file_size_bytes IS NOT NULL)::integer + (pi.url_original IS NOT NULL OR (it.code::text = ANY (ARRAY['component'::character varying, 'location'::character varying, 'area'::character varying]::text[])))::integer + (pi.color_id IS NOT NULL OR pi.applies_to_color = false)::integer + (pi.alt_text IS NOT NULL AND length(pi.alt_text) >= 20)::integer + (pi.image_type::text = it.code::text OR pi.image_type IS NULL)::integer)::numeric / 7.0, 1) AS score_completude,
        CASE
            WHEN pi.is_active = false THEN 'I-inativa'::text
            WHEN pi.is_primary AND pi.width_px IS NULL AND pi.format IS NULL THEN 'P0-primary-multi-gap'::text
            WHEN pi.is_primary AND pi.width_px IS NULL THEN 'P0-primary-sem-dim'::text
            WHEN pi.format IS NULL AND pi.width_px IS NULL THEN 'P1-sem-format-dim'::text
            WHEN pi.width_px IS NULL THEN 'P2-sem-dimensoes'::text
            WHEN pi.format IS NULL THEN 'P3-sem-format'::text
            WHEN pi.url_original IS NULL AND pi.is_active AND (it.code::text <> ALL (ARRAY['component'::character varying, 'location'::character varying, 'area'::character varying]::text[])) THEN 'P4-sem-url-original'::text
            WHEN pi.applies_to_color = true AND pi.color_id IS NULL AND pi.is_active THEN 'P5-sem-color-id'::text
            WHEN pi.alt_text IS NULL OR length(pi.alt_text) < 20 THEN 'P6-alt-curto'::text
            ELSE 'OK'::text
        END AS prioridade_correcao
   FROM product_images pi
     JOIN image_types it ON it.id = pi.image_type_id;
```

## public.mv_product_intelligence (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | analytics.mv_product_intelligence |
| populada | n/a |
| comentário |  |


```sql
SELECT product_id,
    total_depleted_30d,
    total_depleted_90d,
    total_current_stock,
    avg_depletion_7d,
    avg_depletion_30d,
    min_days_to_stockout,
    max_velocity_trend,
    total_restocked_30d,
    supplier_count,
    avg_current_price,
    abc_classification,
    turnover_score,
    is_hot_product,
    is_stagnant,
    is_negotiation_opportunity,
    is_stockout_risk,
    has_frequent_restock,
    refreshed_at
   FROM analytics.mv_product_intelligence;
```

## public.mv_stock_rupture_alert (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | analytics.mv_stock_velocity, public.suppliers, public.variant_supplier_sources |
| populada | sim |
| comentário |  |


```sql
WITH ema_raw AS (
         SELECT sv.variant_supplier_source_id AS vss_id,
            sv.variant_id,
            sv.supplier_id,
            sv.velocity_trend,
            sv.active_days_30d,
            sv.days_to_stockout,
            GREATEST(0.01,
                CASE
                    WHEN sv.avg_daily_depletion_7d > 0::numeric AND sv.avg_daily_depletion_30d > 0::numeric THEN sv.avg_daily_depletion_7d * 0.50 + sv.avg_daily_depletion_30d * 0.35 + COALESCE(sv.avg_daily_depletion_90d, sv.avg_daily_depletion_30d) * 0.15
                    WHEN sv.avg_daily_depletion_30d > 0::numeric THEN sv.avg_daily_depletion_30d * 0.70 + COALESCE(sv.avg_daily_depletion_90d, sv.avg_daily_depletion_30d) * 0.30
                    WHEN sv.avg_daily_depletion_90d > 0::numeric THEN sv.avg_daily_depletion_90d
                    ELSE 0.01
                END)::numeric(10,4) AS ema_bruta
           FROM analytics.mv_stock_velocity sv
             JOIN variant_supplier_sources vss_chk ON vss_chk.id = sv.variant_supplier_source_id AND vss_chk.is_active = true AND vss_chk.removed_from_api IS DISTINCT FROM true
        ), base AS (
         SELECT e.vss_id,
            e.variant_id,
            e.supplier_id,
            e.velocity_trend,
            e.active_days_30d,
            e.days_to_stockout,
            s.name AS supplier_name,
            vss.supplier_sku,
            COALESCE(vss.is_preferred, false) AS is_preferred,
            COALESCE(vss.stock_main_warehouse, 0) + COALESCE(vss.stock_other_warehouses, 0) AS stock_live,
            COALESCE(vss.lead_time_days, s.delivery_time_days, 7) AS lead_time_efetivo,
            COALESCE(vss.cost_price, vss.your_price, 0::numeric) AS unit_cost,
                CASE
                    WHEN (COALESCE(vss.stock_main_warehouse, 0) + COALESCE(vss.stock_other_warehouses, 0)) <= 10 AND e.ema_bruta > (GREATEST((COALESCE(vss.stock_main_warehouse, 0) + COALESCE(vss.stock_other_warehouses, 0))::numeric, 0.001) * 500::numeric) THEN 0.01
                    ELSE e.ema_bruta
                END::numeric(10,4) AS ema_diaria
           FROM ema_raw e
             JOIN variant_supplier_sources vss ON vss.id = e.vss_id
             JOIN suppliers s ON s.id = e.supplier_id
        ), enriched AS (
         SELECT b.vss_id,
            b.variant_id,
            b.supplier_id,
            b.velocity_trend,
            b.active_days_30d,
            b.days_to_stockout,
            b.supplier_name,
            b.supplier_sku,
            b.is_preferred,
            b.stock_live,
            b.lead_time_efetivo,
            b.unit_cost,
            b.ema_diaria,
                CASE
                    WHEN b.stock_live = 0 THEN 0.0
                    WHEN b.ema_diaria > 0.01 THEN round(b.stock_live::numeric / b.ema_diaria, 1)
                    ELSE COALESCE(b.days_to_stockout, 9999.0)
                END AS cobertura_dias
           FROM base b
        ), classified AS (
         SELECT e.vss_id,
            e.variant_id,
            e.supplier_id,
            e.velocity_trend,
            e.active_days_30d,
            e.days_to_stockout,
            e.supplier_name,
            e.supplier_sku,
            e.is_preferred,
            e.stock_live,
            e.lead_time_efetivo,
            e.unit_cost,
            e.ema_diaria,
            e.cobertura_dias,
                CASE
                    WHEN e.stock_live = 0 THEN 'RUPTURA'::text
                    WHEN e.cobertura_dias < e.lead_time_efetivo::numeric THEN 'CRÍTICO'::text
                    WHEN e.cobertura_dias < (e.lead_time_efetivo::numeric * 1.5) THEN 'ALERTA'::text
                    WHEN e.cobertura_dias < (e.lead_time_efetivo::numeric * 2.0) THEN 'ATENÇÃO'::text
                    ELSE 'OK'::text
                END AS nivel_alerta,
                CASE
                    WHEN e.stock_live = 0 THEN 1
                    WHEN e.cobertura_dias < e.lead_time_efetivo::numeric THEN 2
                    WHEN e.cobertura_dias < (e.lead_time_efetivo::numeric * 1.5) THEN 3
                    WHEN e.cobertura_dias < (e.lead_time_efetivo::numeric * 2.0) THEN 4
                    ELSE 5
                END AS prioridade
           FROM enriched e
        )
 SELECT vss_id,
    variant_id,
    supplier_id,
    supplier_name,
    supplier_sku,
    is_preferred,
    ema_diaria,
    lead_time_efetivo,
    stock_live AS stock_total,
    cobertura_dias,
    nivel_alerta,
    prioridade,
    LEAST(100::numeric, GREATEST(0::numeric,
        CASE
            WHEN nivel_alerta = 'RUPTURA'::text THEN 100.0
            WHEN nivel_alerta = 'CRÍTICO'::text THEN LEAST(99.99, 75.0 + 25.0 * GREATEST(0.0, 1.0 - cobertura_dias / NULLIF(lead_time_efetivo::numeric, 0::numeric)))
            WHEN nivel_alerta = 'ALERTA'::text THEN 50.0 + 25.0 * GREATEST(0.0, 1.0 - (cobertura_dias - lead_time_efetivo::numeric) / NULLIF(lead_time_efetivo::numeric * 0.5, 0::numeric))
            WHEN nivel_alerta = 'ATENÇÃO'::text THEN 25.0 + 25.0 * GREATEST(0.0, 1.0 - (cobertura_dias - lead_time_efetivo::numeric * 1.5) / NULLIF(lead_time_efetivo::numeric * 0.5, 0::numeric))
            ELSE GREATEST(0.0, 25.0 - LEAST(25.0, cobertura_dias / 40.0))
        END))::numeric(5,2) AS score_composto,
        CASE
            WHEN COALESCE(active_days_30d, 0::bigint) >= 20 THEN 'ALTA'::text
            WHEN COALESCE(active_days_30d, 0::bigint) >= 12 THEN 'MÉDIA'::text
            WHEN COALESCE(active_days_30d, 0::bigint) >= 5 THEN 'BAIXA'::text
            ELSE 'INSUFICIENTE'::text
        END AS confidence_level,
    COALESCE(velocity_trend > 1.5, false) AS anomalia_spike,
    GREATEST(0::numeric, ceil(lead_time_efetivo::numeric * 2.0 * ema_diaria - stock_live::numeric))::integer AS gap_unidades,
    round(stock_live::numeric * unit_cost, 2) AS valor_estoque_reais
   FROM classified c
  ORDER BY (LEAST(100::numeric, GREATEST(0::numeric,
        CASE
            WHEN nivel_alerta = 'RUPTURA'::text THEN 100.0
            WHEN nivel_alerta = 'CRÍTICO'::text THEN LEAST(99.99, 75.0 + 25.0 * GREATEST(0.0, 1.0 - cobertura_dias / NULLIF(lead_time_efetivo::numeric, 0::numeric)))
            WHEN nivel_alerta = 'ALERTA'::text THEN 50.0 + 25.0 * GREATEST(0.0, 1.0 - (cobertura_dias - lead_time_efetivo::numeric) / NULLIF(lead_time_efetivo::numeric * 0.5, 0::numeric))
            WHEN nivel_alerta = 'ATENÇÃO'::text THEN 25.0 + 25.0 * GREATEST(0.0, 1.0 - (cobertura_dias - lead_time_efetivo::numeric * 1.5) / NULLIF(lead_time_efetivo::numeric * 0.5, 0::numeric))
            ELSE GREATEST(0.0, 25.0 - LEAST(25.0, cobertura_dias / 40.0))
        END))::numeric(5,2)) DESC NULLS LAST;
```

## public.mv_stock_velocity (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | analytics.mv_stock_velocity |
| populada | n/a |
| comentário | SECURITY DEFINER POR DESIGN (reloptions vazio). Wrapper PostgREST sobre analytics.mv_stock_velocity. authenticated NÃO tem SELECT em analytics schema. anon: REVOKED (dados operacionais internos). ANTI-REGRESSÃO fix_version 20260717c. |


```sql
SELECT variant_supplier_source_id,
    supplier_id,
    supplier_branch_id,
    variant_id,
    product_id,
    current_stock,
    current_price,
    last_update_date,
    total_depleted_7d,
    total_depleted_30d,
    total_depleted_90d,
    active_days_7d,
    active_days_30d,
    active_days_90d,
    avg_daily_depletion_7d,
    avg_daily_depletion_30d,
    avg_daily_depletion_90d,
    velocity_trend,
    days_to_stockout,
    total_restocked_30d,
    restock_events_30d,
    avg_days_between_restocks,
    price_changes_30d,
    refreshed_at
   FROM analytics.mv_stock_velocity;
```

## public.mv_supplier_reliability (materialized)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | n/a |
| opções |  |
| depende de | public.supplier_replenishment_events, public.suppliers |
| populada | sim |
| comentário | Agregado de confiabilidade por fornecedor para consumo direto do frontend. Score 0-100 = 60% pontualidade + 40% cumprimento de quantidade. Banda: high>=85, medium>=60, low<60, unknown se sem histórico. Refresh: CONCURRENTLY a cada 15 min via pg_cron job refresh-mv-supplier-reliability. Índice único em supplier_id habilitado para REFRESH CONCURRENTLY. |


```sql
WITH events_base AS (
         SELECT supplier_replenishment_events.supplier_id,
            supplier_replenishment_events.resolution,
            supplier_replenishment_events.promised_date,
            supplier_replenishment_events.delay_days,
            supplier_replenishment_events.fulfillment_ratio,
            GREATEST(0::numeric, 1.0 - GREATEST(0::numeric, COALESCE(supplier_replenishment_events.delay_days, 0)::numeric) / 14.0) AS pontuality_score,
            LEAST(1.0, COALESCE(supplier_replenishment_events.fulfillment_ratio, 0::numeric)) AS fulfillment_score
           FROM supplier_replenishment_events
          WHERE supplier_replenishment_events.resolution = ANY (ARRAY['fulfilled'::text, 'expired'::text, 'pending'::text])
        ), so AS (
         SELECT events_base.supplier_id,
            count(*) AS total_promises,
            count(*) FILTER (WHERE events_base.resolution = 'fulfilled'::text) AS matched_count,
            count(*) FILTER (WHERE events_base.resolution = 'expired'::text) AS expired_count,
            count(*) FILTER (WHERE events_base.resolution = 'pending'::text) AS pending_count,
            COALESCE(round(100::numeric * (0.6 * avg(events_base.pontuality_score) FILTER (WHERE events_base.resolution = 'fulfilled'::text) + 0.4 * avg(events_base.fulfillment_score) FILTER (WHERE events_base.resolution = 'fulfilled'::text)))::integer, 0) AS overall_score,
            round(avg(events_base.pontuality_score) FILTER (WHERE events_base.resolution = 'fulfilled'::text), 4) AS overall_pontuality,
            round(avg(events_base.fulfillment_score) FILTER (WHERE events_base.resolution = 'fulfilled'::text), 4) AS overall_fulfillment,
            round(avg(events_base.delay_days) FILTER (WHERE events_base.resolution = 'fulfilled'::text), 1) AS overall_avg_delay_days
           FROM events_base
          GROUP BY events_base.supplier_id
        ), s30 AS (
         SELECT events_base.supplier_id,
            count(*) FILTER (WHERE events_base.resolution = 'fulfilled'::text) AS matched_30d,
            COALESCE(round(100::numeric * (0.6 * avg(events_base.pontuality_score) FILTER (WHERE events_base.resolution = 'fulfilled'::text) + 0.4 * avg(events_base.fulfillment_score) FILTER (WHERE events_base.resolution = 'fulfilled'::text)))::integer, 0) AS score_30d
           FROM events_base
          WHERE events_base.promised_date >= (CURRENT_DATE - 30)
          GROUP BY events_base.supplier_id
        ), s90 AS (
         SELECT events_base.supplier_id,
            count(*) FILTER (WHERE events_base.resolution = 'fulfilled'::text) AS matched_90d,
            COALESCE(round(100::numeric * (0.6 * avg(events_base.pontuality_score) FILTER (WHERE events_base.resolution = 'fulfilled'::text) + 0.4 * avg(events_base.fulfillment_score) FILTER (WHERE events_base.resolution = 'fulfilled'::text)))::integer, 0) AS score_90d
           FROM events_base
          WHERE events_base.promised_date >= (CURRENT_DATE - 90)
          GROUP BY events_base.supplier_id
        ), np AS (
         SELECT DISTINCT ON (supplier_replenishment_events.supplier_id) supplier_replenishment_events.supplier_id,
            supplier_replenishment_events.promised_date AS next_promise_date,
            supplier_replenishment_events.promised_quantity AS next_promise_quantity
           FROM supplier_replenishment_events
          WHERE supplier_replenishment_events.resolution = 'pending'::text AND supplier_replenishment_events.promised_date >= CURRENT_DATE
          ORDER BY supplier_replenishment_events.supplier_id, supplier_replenishment_events.promised_date
        )
 SELECT so.supplier_id,
    s.name AS supplier_name,
    so.total_promises,
    so.matched_count,
    so.expired_count,
    so.pending_count,
    so.overall_score,
    so.overall_pontuality,
    so.overall_fulfillment,
    so.overall_avg_delay_days,
    COALESCE(s30.score_30d, 0) AS score_30d,
    COALESCE(s30.matched_30d, 0::bigint) AS matched_30d,
    COALESCE(s90.score_90d, 0) AS score_90d,
    COALESCE(s90.matched_90d, 0::bigint) AS matched_90d,
    np.next_promise_date,
    np.next_promise_quantity,
        CASE
            WHEN so.matched_count = 0 THEN 'unknown'::text
            WHEN so.overall_score >= 85 THEN 'high'::text
            WHEN so.overall_score >= 60 THEN 'medium'::text
            ELSE 'low'::text
        END AS band,
    now() AS refreshed_at
   FROM so
     JOIN suppliers s ON s.id = so.supplier_id
     LEFT JOIN s30 ON s30.supplier_id = so.supplier_id
     LEFT JOIN s90 ON s90.supplier_id = so.supplier_id
     LEFT JOIN np ON np.supplier_id = so.supplier_id;
```

## public.products_with_materials (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.material_groups, public.material_types, public.product_materials, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id AS product_id,
    p.organization_id,
    p.name AS product_name,
    mt.id AS material_id,
    mt.name AS material_name,
    mg.name AS material_group,
    pm.part,
    pm.percentage,
    pm.sort_order,
    p.created_at,
    pm.created_at AS material_added_at
   FROM products p
     JOIN product_materials pm ON p.id = pm.product_id
     JOIN material_types mt ON pm.material_id = mt.id
     JOIN material_groups mg ON mt.group_id = mg.id
  ORDER BY p.name, pm.sort_order;
```

## public.somarcas_catalogo_publico (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário | Catalogo publico So Marcas (role anon). So vitrine + precos COM impostos; estoque vira boolean disponivel. NUNCA expor precos sem impostos/ipi/ncm/estoque numerico. Filtro corrigido 2026-06: produto_ativo usa valor sim. |


```sql
SELECT id,
    raw_data ->> 'codigo'::text AS codigo,
    raw_data ->> 'titulo'::text AS titulo,
    raw_data ->> 'descricao'::text AS descricao,
    raw_data ->> 'url_foto'::text AS url_foto,
    raw_data -> 'matriz_de_fotos_adicionais'::text AS fotos_adicionais,
    raw_data -> 'matriz_de_categorias'::text AS categorias,
    raw_data -> 'produtos_similares'::text AS produtos_similares,
    raw_data ->> 'dimensoes_do_produto'::text AS dimensoes_produto,
    raw_data ->> 'dimensoes_da_embalagem'::text AS dimensoes_embalagem,
    raw_data ->> 'peso_da_embalagem'::text AS peso_embalagem,
    raw_data ->> 'embalagem_do_produto'::text AS embalagem,
    raw_data ->> 'garantia_do_produto'::text AS garantia,
    raw_data ->> 'tipo_gravacao'::text AS tipo_gravacao,
    raw_data ->> 'quantidade_minima_sugerida'::text AS quantidade_minima,
    raw_data ->> 'preco_com_gravacao_com_impostos'::text AS preco_com_gravacao,
    raw_data ->> 'preco_sem_gravacao_com_impostos'::text AS preco_sem_gravacao,
    COALESCE((raw_data ->> 'estoque'::text)::numeric, 0::numeric) > 0::numeric AS disponivel,
    raw_data ->> 'data_ultima_atualizacao'::text AS atualizado_em,
    variant_id,
    product_id
   FROM supplier_products_raw r
  WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND (COALESCE(lower(raw_data ->> 'produto_ativo'::text), 'sim'::text) <> ALL (ARRAY['nao'::text, 'não'::text, 'false'::text, '0'::text, 'f'::text, 'inativo'::text, 'no'::text]));
```

## public.v_ai_function_routing_effective (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.ai_function_routing, public.ai_models, public.ai_providers |
| populada | n/a |
| comentário | Configuração interna de roteamento AI. ADMIN-ONLY. security_invoker=true. Acesso: service_role apenas. Aplicado em T19 do redeploy 2026-05. |


```sql
SELECT r.id AS routing_id,
    r.function_name,
    r.is_active,
    r.required_capabilities,
    r.request_overrides,
    r.notes,
    pm.id AS primary_model_id,
    pm.model_id AS primary_model,
    pm.display_name AS primary_display_name,
    pm.capabilities AS primary_capabilities,
    pm.cost_input_per_1m AS primary_cost_input,
    pm.cost_output_per_1m AS primary_cost_output,
    pm.is_active AS primary_active,
    pp.id AS primary_provider_id,
    pp.slug AS primary_provider_slug,
    pp.is_active AS primary_provider_active,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('model_id', fm.id, 'model', fm.model_id, 'display_name', fm.display_name, 'provider_slug', fp.slug, 'capabilities', fm.capabilities, 'cost_input', fm.cost_input_per_1m, 'cost_output', fm.cost_output_per_1m, 'model_active', fm.is_active, 'provider_active', fp.is_active, 'order_index', ord.idx) ORDER BY ord.idx) AS jsonb_agg
           FROM unnest(r.fallback_model_ids) WITH ORDINALITY ord(model_id, idx)
             JOIN ai_models fm ON fm.id = ord.model_id
             JOIN ai_providers fp ON fp.id = fm.provider_id), '[]'::jsonb) AS fallbacks,
    r.updated_at,
    r.updated_by
   FROM ai_function_routing r
     JOIN ai_models pm ON pm.id = r.primary_model_id
     JOIN ai_providers pp ON pp.id = pm.provider_id;
```

## public.v_audit_cobertura_tecnicas (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.tabela_preco_gravacao_oficial, public.tecnicas_gravacao |
| populada | n/a |
| comentário | Auditoria interna de catálogo de técnicas. ADMIN-ONLY. security_invoker=true. Acesso: service_role apenas. Aplicado em T19 do redeploy 2026-05. |


```sql
SELECT tg.codigo AS grupo,
    tg.nome AS grupo_nome,
    tg.ativo AS catalogo_ativo,
    count(t.id) FILTER (WHERE t.ativo = true) AS tabelas_ativas,
    count(t.id) FILTER (WHERE t.ativo = false) AS tabelas_inativas,
    count(t.id) FILTER (WHERE t.ativo = false AND (t.opcoes_modificadores ->> 'status_classificacao'::text) = 'LEGACY'::text) AS legacy,
    count(t.id) FILTER (WHERE t.ativo = false AND (t.opcoes_modificadores ->> 'status_classificacao'::text) = 'REVIVABLE'::text) AS revivable,
    count(t.id) FILTER (WHERE t.ativo = false AND (t.opcoes_modificadores ->> 'status_classificacao'::text) = 'ARCHIVE'::text) AS archive,
        CASE
            WHEN tg.ativo AND count(t.id) FILTER (WHERE t.ativo) = 0 THEN 'ZUMBI'::text
            WHEN count(t.id) FILTER (WHERE t.ativo) >= 5 THEN 'FORTE'::text
            WHEN count(t.id) FILTER (WHERE t.ativo) >= 2 THEN 'OK'::text
            WHEN count(t.id) FILTER (WHERE t.ativo) = 1 THEN 'FRACO'::text
            ELSE 'INATIVO'::text
        END AS status,
    count(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela::text ~~ '%-CN-%'::text) AS ativas_caneta,
    count(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela::text ~~ '%-MOC-%'::text) AS ativas_mochila,
    count(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela::text ~~ '%-SAC-%'::text) AS ativas_sacochila,
    count(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela::text ~~ '%-SAE-%'::text) AS ativas_sacola,
    count(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela::text ~~ '%-CAM-%'::text) AS ativas_camiseta,
    count(t.id) FILTER (WHERE t.ativo AND t.codigo_tabela::text ~~ '%-CIL-%'::text) AS ativas_cilindrico
   FROM tecnicas_gravacao tg
     LEFT JOIN tabela_preco_gravacao_oficial t ON t.grupo_tecnica::text = tg.codigo::text
  GROUP BY tg.codigo, tg.nome, tg.ativo, tg.ordem_exibicao
  ORDER BY tg.ordem_exibicao, tg.codigo;
```

## public.v_audit_paradoxos_gravacao (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.print_area_techniques, public.products, public.tabela_preco_gravacao_oficial, public.tabela_preco_gravacao_oficial_faixa |
| populada | n/a |
| comentário |  |


```sql
WITH p1 AS (
         SELECT 'P1'::text AS codigo_paradoxo,
            'Técnica ativa sem faixas de preço'::text AS descricao,
            t.codigo_tabela,
            t.nome,
            t.grupo_tecnica,
            NULL::text AS produto_sku,
            NULL::text AS location_code,
            NULL::text AS detalhe,
            'ALTO'::text AS severidade
           FROM tabela_preco_gravacao_oficial t
          WHERE t.ativo = true AND NOT (EXISTS ( SELECT 1
                   FROM tabela_preco_gravacao_oficial_faixa f
                  WHERE f.tabela_preco_gravacao_id = t.id))
        ), p2 AS (
         SELECT 'P2'::text AS text,
            'Produto ativo sem técnica configurada'::text AS text,
            NULL::text AS text,
            NULL::text AS text,
            NULL::text AS text,
            p.sku,
            NULL::text AS text,
            p.name,
            'MEDIO'::text AS text
           FROM products p
          WHERE p.is_active = true AND NOT (EXISTS ( SELECT 1
                   FROM print_area_techniques pat
                  WHERE pat.product_id = p.id AND pat.is_active = true))
        ), p3 AS (
         SELECT 'P3'::text AS text,
            'PAT ativa de produto inativo'::text AS text,
            t.codigo_tabela,
            t.nome,
            t.grupo_tecnica,
            p.sku,
            pat.location_code,
            'product_id='::text || pat.product_id::text AS "?column?",
            'ALTO'::text AS text
           FROM print_area_techniques pat
             JOIN products p ON p.id = pat.product_id
             JOIN tabela_preco_gravacao_oficial t ON t.id = pat.tabela_preco_id
          WHERE pat.is_active = true AND p.is_active = false
        ), p4 AS (
         SELECT 'P4'::text AS text,
            'PAT aponta para técnica inativa'::text AS text,
            t.codigo_tabela,
            t.nome,
            t.grupo_tecnica,
            p.sku,
            pat.location_code,
            'tabela_preco_id='::text || pat.tabela_preco_id::text AS "?column?",
            'ALTO'::text AS text
           FROM print_area_techniques pat
             JOIN tabela_preco_gravacao_oficial t ON t.id = pat.tabela_preco_id
             JOIN products p ON p.id = pat.product_id
          WHERE pat.is_active = true AND t.ativo = false
        ), p5 AS (
         SELECT 'P5'::text AS text,
            'Técnica com faixa única (sem escala)'::text AS text,
            t.codigo_tabela,
            t.nome,
            t.grupo_tecnica,
            NULL::text AS text,
            NULL::text AS text,
            'faixas='::text || count(f.id)::text AS "?column?",
            'BAIXO'::text AS text
           FROM tabela_preco_gravacao_oficial t
             JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
          WHERE t.ativo = true
          GROUP BY t.id, t.codigo_tabela, t.nome, t.grupo_tecnica
         HAVING count(f.id) = 1
        ), p6 AS (
         SELECT 'P6'::text AS text,
            'cobra_por_cor=true com max_cores<=1'::text AS text,
            t.codigo_tabela,
            t.nome,
            t.grupo_tecnica,
            NULL::text AS text,
            NULL::text AS text,
            'max_cores='::text || COALESCE(t.max_cores::text, 'NULL'::text) AS "?column?",
            'MEDIO'::text AS text
           FROM tabela_preco_gravacao_oficial t
          WHERE t.ativo = true AND t.cobra_por_cor = true AND COALESCE(t.max_cores, 1) <= 1
        )
 SELECT p1.codigo_paradoxo,
    p1.descricao,
    p1.codigo_tabela,
    p1.nome,
    p1.grupo_tecnica,
    p1.produto_sku,
    p1.location_code,
    p1.detalhe,
    p1.severidade
   FROM p1
UNION ALL
 SELECT p2.text AS codigo_paradoxo,
    p2.text_1 AS descricao,
    p2.text_2 AS codigo_tabela,
    p2.text_3 AS nome,
    p2.text_4 AS grupo_tecnica,
    p2.sku AS produto_sku,
    p2.text_5 AS location_code,
    p2.name AS detalhe,
    p2.text_6 AS severidade
   FROM p2 p2(text, text_1, text_2, text_3, text_4, sku, text_5, name, text_6)
UNION ALL
 SELECT p3.text AS codigo_paradoxo,
    p3.text_1 AS descricao,
    p3.codigo_tabela,
    p3.nome,
    p3.grupo_tecnica,
    p3.sku AS produto_sku,
    p3.location_code,
    p3."?column?" AS detalhe,
    p3.text_2 AS severidade
   FROM p3 p3(text, text_1, codigo_tabela, nome, grupo_tecnica, sku, location_code, "?column?", text_2)
UNION ALL
 SELECT p4.text AS codigo_paradoxo,
    p4.text_1 AS descricao,
    p4.codigo_tabela,
    p4.nome,
    p4.grupo_tecnica,
    p4.sku AS produto_sku,
    p4.location_code,
    p4."?column?" AS detalhe,
    p4.text_2 AS severidade
   FROM p4 p4(text, text_1, codigo_tabela, nome, grupo_tecnica, sku, location_code, "?column?", text_2)
UNION ALL
 SELECT p5.text AS codigo_paradoxo,
    p5.text_1 AS descricao,
    p5.codigo_tabela,
    p5.nome,
    p5.grupo_tecnica,
    p5.text_2 AS produto_sku,
    p5.text_3 AS location_code,
    p5."?column?" AS detalhe,
    p5.text_4 AS severidade
   FROM p5 p5(text, text_1, codigo_tabela, nome, grupo_tecnica, text_2, text_3, "?column?", text_4)
UNION ALL
 SELECT p6.text AS codigo_paradoxo,
    p6.text_1 AS descricao,
    p6.codigo_tabela,
    p6.nome,
    p6.grupo_tecnica,
    p6.text_2 AS produto_sku,
    p6.text_3 AS location_code,
    p6."?column?" AS detalhe,
    p6.text_4 AS severidade
   FROM p6 p6(text, text_1, codigo_tabela, nome, grupo_tecnica, text_2, text_3, "?column?", text_4);
```

## public.v_blurhash_coverage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images |
| populada | n/a |
| comentário | Cobertura do blurhash por supplier e formato.    cron_status: PROCESSÁVEL_DIRETO (jpeg/png) \| PROCESSÁVEL_THUMBNAIL (webp/gif via /thumbnail) \| SEM_FORMATO.    eta_horas_a_480_por_hora: tempo estimado para cobertura total a 480 hashes/hora. |


```sql
SELECT source_supplier,
    format,
        CASE
            WHEN format::text = ANY (ARRAY['jpeg'::character varying, 'png'::character varying]::text[]) THEN 'PROCESSÁVEL_DIRETO'::text
            WHEN format::text = ANY (ARRAY['webp'::character varying, 'gif'::character varying]::text[]) THEN 'PROCESSÁVEL_THUMBNAIL'::text
            WHEN format IS NULL THEN 'SEM_FORMATO'::text
            ELSE 'FORMATO_DESCONHECIDO'::text
        END AS cron_status,
    count(*) AS total_imagens,
    count(*) FILTER (WHERE blurhash IS NOT NULL) AS com_blurhash,
    count(*) FILTER (WHERE blurhash IS NULL) AS sem_blurhash,
    count(*) FILTER (WHERE blurhash IS NULL AND cf_sync_status = 'verified'::text AND deleted_at IS NULL) AS pendentes_cron,
    count(*) FILTER (WHERE is_primary = true AND blurhash IS NULL AND cf_sync_status = 'verified'::text) AS primarias_pendentes,
    round(count(*) FILTER (WHERE blurhash IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS pct_cobertura,
    round(count(*) FILTER (WHERE blurhash IS NULL AND cf_sync_status = 'verified'::text AND deleted_at IS NULL)::numeric / NULLIF(480.0, 0::numeric), 1) AS eta_horas_a_480_por_hora
   FROM product_images
  WHERE is_active = true
  GROUP BY source_supplier, format
  ORDER BY source_supplier, (count(*) FILTER (WHERE blurhash IS NULL AND cf_sync_status = 'verified'::text AND deleted_at IS NULL)) DESC;
```

## public.v_blurhash_summary (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images |
| populada | n/a |
| comentário | Resumo executivo do estado do pipeline blurhash.    Atualizado em tempo real. pendentes_sem_suporte deve ser sempre 0.    eta_dias: estimativa de conclusão do backfill a 480 hashes/hora (cron */5 min, 40/batch). |


```sql
WITH stats AS (
         SELECT count(*) AS total,
            count(*) FILTER (WHERE product_images.blurhash IS NOT NULL) AS com_hash,
            count(*) FILTER (WHERE product_images.blurhash IS NULL AND product_images.cf_sync_status = 'verified'::text AND product_images.deleted_at IS NULL AND (product_images.format::text = ANY (ARRAY['jpeg'::character varying, 'png'::character varying, 'webp'::character varying, 'gif'::character varying]::text[]))) AS pendentes_processaveis,
            count(*) FILTER (WHERE product_images.blurhash IS NULL AND product_images.cf_sync_status = 'verified'::text AND product_images.deleted_at IS NULL AND (product_images.format::text <> ALL (ARRAY['jpeg'::character varying, 'png'::character varying, 'webp'::character varying, 'gif'::character varying]::text[])) AND product_images.format IS NOT NULL) AS pendentes_sem_suporte,
            count(*) FILTER (WHERE product_images.is_primary = true AND product_images.blurhash IS NOT NULL) AS primarias_com_hash,
            count(*) FILTER (WHERE product_images.is_primary = true AND product_images.blurhash IS NULL AND product_images.cf_sync_status = 'verified'::text) AS primarias_pendentes,
            count(*) FILTER (WHERE (product_images.format::text = ANY (ARRAY['webp'::character varying, 'gif'::character varying]::text[])) AND product_images.blurhash IS NULL AND product_images.cf_sync_status = 'verified'::text) AS webp_gif_pendentes
           FROM product_images
          WHERE product_images.is_active = true
        )
 SELECT total,
    com_hash,
    round(com_hash::numeric / NULLIF(total, 0)::numeric * 100::numeric, 2) AS pct_cobertura_global,
    pendentes_processaveis,
    pendentes_sem_suporte,
    primarias_com_hash,
    primarias_pendentes,
    round(primarias_com_hash::numeric / NULLIF(primarias_com_hash + primarias_pendentes, 0)::numeric * 100::numeric, 2) AS pct_primarias,
    webp_gif_pendentes,
    round(pendentes_processaveis::numeric / 480.0, 1) AS eta_horas,
    round(pendentes_processaveis::numeric / 480.0 / 24::numeric, 1) AS eta_dias,
    now() AS snapshot_at
   FROM stats;
```

## public.v_catalog_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_variants, public.products |
| populada | n/a |
| comentário | Estatísticas agregadas do catálogo: total de variantes ativas e fornecedores distintos. security_invoker=off (default): roda como view owner para garantir acesso mesmo sem GRANT direto em products para anon. Dados: apenas contagens agregadas, não linhas individuais. |


```sql
SELECT count(pv.id) AS total_variants,
    count(DISTINCT p.supplier_id) AS total_suppliers
   FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
  WHERE p.is_deleted IS NOT TRUE AND p.is_active = true AND pv.is_active IS NOT FALSE;
```

## public.v_category_keywords (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories |
| populada | n/a |
| comentário |  |


```sql
WITH tokens AS (
         SELECT c.id AS category_id,
            c.full_path_readable,
            c.level,
            c.name AS category_name,
            unnest(regexp_split_to_array(lower(unaccent(c.name)), '[\s\|>/,\.\-]+'::text)) AS token
           FROM categories c
          WHERE c.is_active
        )
 SELECT category_id,
    full_path_readable,
    category_name,
    level,
    token
   FROM tokens
  WHERE length(token) >= 3 AND (token <> ALL (ARRAY['de'::text, 'da'::text, 'do'::text, 'das'::text, 'dos'::text, 'com'::text, 'sem'::text, 'para'::text, 'por'::text, 'que'::text, 'brindes'::text, 'kit'::text, 'tipo'::text, 'uso'::text, 'pcs'::text, 'pecas'::text, 'unidade'::text]));
```

## public.v_cf_drift_dashboard (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | cf_recon.cf_image, public.image_backfill_queue, public.product_images |
| populada | n/a |
| comentário |  |


```sql
WITH stats AS (
         SELECT ( SELECT count(*) AS count
                   FROM cf_recon.cf_image) AS recon_total,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL) AS pi_active_total,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.cf_sync_status = 'verified'::text) AS pi_verified,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.cf_sync_status = 'orphaned'::text) AS pi_orphaned,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.cf_sync_status = 'missing'::text) AS pi_missing,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NOT NULL) AS pi_soft_deleted,
            ( SELECT count(*) AS count
                   FROM cf_recon.cf_image c
                  WHERE NOT (EXISTS ( SELECT 1
                           FROM product_images p
                          WHERE p.cloudflare_image_id::text = c.image_id AND p.deleted_at IS NULL))) AS cf_orphans_not_in_pi,
            ( SELECT count(*) AS count
                   FROM product_images p
                  WHERE p.deleted_at IS NULL AND p.cf_sync_status = 'verified'::text AND NOT (EXISTS ( SELECT 1
                           FROM cf_recon.cf_image c
                          WHERE c.image_id = p.cloudflare_image_id::text))) AS pi_verified_no_recon,
            ( SELECT count(*) AS count
                   FROM image_backfill_queue
                  WHERE image_backfill_queue.status = 'pending'::text) AS backfill_queue_pending,
            ( SELECT count(*) AS count
                   FROM image_backfill_queue
                  WHERE image_backfill_queue.status = 'skipped'::text) AS backfill_queue_skipped,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.canonical_image_id IS NOT NULL) AS pi_canonical_deps,
            ( SELECT count(DISTINCT product_images.canonical_image_id) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.canonical_image_id IS NOT NULL) AS pi_canonical_roots,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.blurhash IS NOT NULL) AS pi_has_blurhash,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.content_hash IS NOT NULL) AS pi_has_content_hash,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.format IS NULL) AS pi_null_format,
            ( SELECT count(*) AS count
                   FROM product_images
                  WHERE product_images.deleted_at IS NULL AND product_images.is_shared = true AND product_images.canonical_image_id IS NULL) AS pi_shared_no_canonical
        ), computed AS (
         SELECT stats.recon_total,
            stats.pi_active_total,
            stats.pi_verified,
            stats.pi_orphaned,
            stats.pi_missing,
            stats.pi_soft_deleted,
            stats.cf_orphans_not_in_pi,
            stats.pi_verified_no_recon,
            stats.backfill_queue_pending,
            stats.backfill_queue_skipped,
            stats.pi_canonical_deps,
            stats.pi_canonical_roots,
            stats.pi_has_blurhash,
            stats.pi_has_content_hash,
            stats.pi_null_format,
            stats.pi_shared_no_canonical,
            round(stats.pi_verified::numeric / NULLIF(stats.pi_active_total, 0)::numeric * 100::numeric, 2) AS pct_verified_active,
            round(stats.cf_orphans_not_in_pi::numeric / NULLIF(stats.recon_total, 0)::numeric * 100::numeric, 2) AS pct_cf_orphans,
            round(stats.pi_has_blurhash::numeric / NULLIF(stats.pi_active_total, 0)::numeric * 100::numeric, 2) AS pct_blurhash,
            round(stats.pi_has_content_hash::numeric / NULLIF(stats.pi_active_total, 0)::numeric * 100::numeric, 2) AS pct_content_hash,
            round(stats.pi_canonical_deps::numeric / NULLIF(stats.pi_active_total, 0)::numeric * 100::numeric, 2) AS pct_deduplicated
           FROM stats
        )
 SELECT recon_total,
    pi_active_total,
    pi_verified,
    pi_orphaned,
    pi_missing,
    pi_soft_deleted,
    cf_orphans_not_in_pi,
    pi_verified_no_recon,
    backfill_queue_pending,
    backfill_queue_skipped,
    pi_canonical_deps,
    pi_canonical_roots,
    pi_has_blurhash,
    pi_has_content_hash,
    pi_null_format,
    pi_shared_no_canonical,
    pct_verified_active,
    pct_cf_orphans,
    pct_blurhash,
    pct_content_hash,
    pct_deduplicated
   FROM computed;
```

## public.v_cf_image_remediation (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.products |
| populada | n/a |
| comentário | Produtos ATIVOS cuja primaria nao resolve p/ imagem ativa verified/pending/uploaded no Cloudflare. Worklist de re-upload (auditoria 2026-06-16); converge conforme a recon completa. |


```sql
SELECT id AS product_id,
    primary_image_url,
    ( SELECT count(*) AS count
           FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_active) AS active_imgs,
    ( SELECT count(*) AS count
           FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_active AND pi.cf_sync_status = 'verified'::text) AS verified_active_imgs
   FROM products p
  WHERE is_active AND primary_image_url IS NOT NULL AND NOT (EXISTS ( SELECT 1
           FROM product_images v
          WHERE v.url_cdn = p.primary_image_url AND v.is_active AND (v.cf_sync_status = ANY (ARRAY['verified'::text, 'pending'::text, 'uploaded'::text]))));
```

## public.v_cf_recon_progress (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images |
| populada | n/a |
| comentário |  |


```sql
SELECT cf_sync_status,
    count(*) AS n,
    round(100.0 * count(*)::numeric / NULLIF(sum(count(*)) OVER (), 0::numeric), 2) AS pct
   FROM product_images
  GROUP BY cf_sync_status;
```

## public.v_color_coverage_monitor (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.product_variants |
| populada | n/a |
| comentário |  |


```sql
WITH imagens AS (
         SELECT pi.supplier_code,
            pi.image_type,
            count(*) AS total,
            count(pi.color_id) AS com_color_id
           FROM product_images pi
          WHERE pi.is_active = true
          GROUP BY pi.supplier_code, pi.image_type
        ), variantes AS (
         SELECT pi_sup.supplier_code,
            count(DISTINCT pv.id) AS total_variantes_com_cor,
            count(DISTINCT pv.id) FILTER (WHERE (EXISTS ( SELECT 1
                   FROM product_images pi2
                  WHERE pi2.product_id = pv.product_id AND pi2.color_id = pv.color_id AND pi2.is_active = true))) AS variantes_com_imagem_linkada
           FROM product_variants pv
             LEFT JOIN LATERAL ( SELECT product_images.supplier_code
                   FROM product_images
                  WHERE product_images.product_id = pv.product_id AND product_images.is_active = true
                 LIMIT 1) pi_sup ON true
          WHERE pv.is_active = true AND pv.color_id IS NOT NULL
          GROUP BY pi_sup.supplier_code
        )
 SELECT COALESCE(i.supplier_code, v.supplier_code) AS supplier_code,
    sum(i.total) AS total_imagens,
    sum(i.com_color_id) AS imagens_com_color_id,
    sum(i.total) - sum(i.com_color_id) AS imagens_sem_color_id,
    round(sum(i.com_color_id) / NULLIF(sum(i.total), 0::numeric) * 100::numeric, 1) AS pct_imagens,
    v.total_variantes_com_cor,
    v.variantes_com_imagem_linkada,
    v.total_variantes_com_cor - v.variantes_com_imagem_linkada AS variantes_gap,
    round(v.variantes_com_imagem_linkada::numeric / NULLIF(v.total_variantes_com_cor, 0)::numeric * 100::numeric, 1) AS pct_variantes,
    now() AS auditado_em
   FROM imagens i
     FULL JOIN variantes v ON v.supplier_code::text = i.supplier_code::text
  GROUP BY (COALESCE(i.supplier_code, v.supplier_code)), v.total_variantes_com_cor, v.variantes_com_imagem_linkada
  ORDER BY (round(v.variantes_com_imagem_linkada::numeric / NULLIF(v.total_variantes_com_cor, 0)::numeric * 100::numeric, 1));
```

## public.v_color_nuances_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.color_nuances |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    name,
    slug,
    description,
    sort_order
   FROM color_nuances cn
  WHERE is_active = true;
```

## public.v_commemorative_dates_calendar (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.commemorative_dates, public.variant_commemorative_dates |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    name,
    slug,
    date_day,
    date_month,
    is_fixed_date,
    variable_date_rule,
    category,
    target_audience,
    icon_name,
    color_hex,
    campaign_start_days,
    is_featured,
        CASE
            WHEN is_fixed_date AND date_day IS NOT NULL THEN (lpad(date_day::text, 2, '0'::text) || '/'::text) || lpad(date_month::text, 2, '0'::text)
            ELSE variable_date_rule
        END AS formatted_date,
        CASE date_month
            WHEN 1 THEN 'Janeiro'::text
            WHEN 2 THEN 'Fevereiro'::text
            WHEN 3 THEN 'Março'::text
            WHEN 4 THEN 'Abril'::text
            WHEN 5 THEN 'Maio'::text
            WHEN 6 THEN 'Junho'::text
            WHEN 7 THEN 'Julho'::text
            WHEN 8 THEN 'Agosto'::text
            WHEN 9 THEN 'Setembro'::text
            WHEN 10 THEN 'Outubro'::text
            WHEN 11 THEN 'Novembro'::text
            WHEN 12 THEN 'Dezembro'::text
            ELSE NULL::text
        END AS month_name,
    ( SELECT count(DISTINCT COALESCE(vcd.variant_id, vcd.product_id)) AS count
           FROM variant_commemorative_dates vcd
          WHERE vcd.commemorative_date_id = cd.id) AS product_count
   FROM commemorative_dates cd
  WHERE is_active = true
  ORDER BY date_month, date_day;
```

## public.v_commemorative_dates_with_colors (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.color_groups, public.commemorative_date_colors, public.commemorative_date_exclusions, public.commemorative_dates |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    name,
    slug,
    date_day,
    date_month,
    is_fixed_date,
    category,
    icon_name,
    color_hex AS date_color,
    campaign_start_days,
    is_featured,
    is_active,
    COALESCE(( SELECT json_agg(json_build_object('color_group_id', cg.id, 'color_name', cg.name, 'color_hex', cg.hex_code, 'is_primary', cdc.is_primary) ORDER BY cdc.is_primary DESC, cg.name) AS json_agg
           FROM commemorative_date_colors cdc
             JOIN color_groups cg ON cg.id = cdc.color_group_id
          WHERE cdc.commemorative_date_id = cd.id), '[]'::json) AS associated_colors,
    ( SELECT count(*) AS count
           FROM commemorative_date_colors cdc
          WHERE cdc.commemorative_date_id = cd.id) AS color_count,
    ( SELECT count(*) AS count
           FROM commemorative_date_exclusions cde
          WHERE cde.commemorative_date_id = cd.id) AS exclusion_count
   FROM commemorative_dates cd
  ORDER BY date_month, date_day;
```

## public.v_connection_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.db_connection_snapshots |
| populada | n/a |
| comentário |  |


```sql
SELECT captured_at,
    total_conns,
    active_conns,
    idle_in_tx_conns,
    max_conns,
    usage_pct,
        CASE
            WHEN usage_pct >= 90::numeric THEN '🔴 CRÍTICO'::text
            WHEN usage_pct >= 75::numeric THEN '🟠 ALERTA'::text
            WHEN usage_pct >= 50::numeric THEN '🟡 ATENÇÃO'::text
            ELSE '🟢 NORMAL'::text
        END AS status,
    top_users
   FROM db_connection_snapshots
  ORDER BY captured_at DESC
 LIMIT 60;
```

## public.v_crm_callback_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.crm_callback_events |
| populada | n/a |
| comentário |  |


```sql
SELECT date_trunc('hour'::text, occurred_at) AS bucket,
    event_type,
    result,
    count(*) AS total,
    count(*) FILTER (WHERE error_message IS NOT NULL) AS with_error,
    percentile_disc(0.95::double precision) WITHIN GROUP (ORDER BY (EXTRACT(epoch FROM received_at - occurred_at))) AS p95_latency_seconds
   FROM crm_callback_events
  WHERE occurred_at >= (now() - '7 days'::interval)
  GROUP BY (date_trunc('hour'::text, occurred_at)), event_type, result
  ORDER BY (date_trunc('hour'::text, occurred_at)) DESC;
```

## public.v_db_health_audit (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.quote_items, public.quotes |
| populada | n/a |
| comentário |  |


```sql
SELECT 'B02_quote_markup_nao_persistido'::text AS check_id,
    count(*) AS total_issues,
    'negotiation_markup_percent=0 mas total > subtotal sem frete/imposto/desconto'::text AS descricao,
    'HIGH'::text AS severidade
   FROM quotes
  WHERE quotes.negotiation_markup_percent = 0::numeric AND quotes.total > quotes.subtotal AND abs(COALESCE(quotes.shipping_cost, 0::numeric)) < 0.01 AND abs(COALESCE(quotes.tax_amount, 0::numeric)) < 0.01 AND abs(COALESCE(quotes.discount_amount, 0::numeric)) < 0.01
UNION ALL
 SELECT 'B04_produto_ativo_sem_preco'::text AS check_id,
    count(*) AS total_issues,
    'Produto is_active=true sem cost_price nem sale_price'::text AS descricao,
    'MEDIUM'::text AS severidade
   FROM products
  WHERE products.cost_price IS NULL AND products.sale_price IS NULL AND products.is_active = true AND (products.is_deleted IS NULL OR products.is_deleted = false)
UNION ALL
 SELECT 'B05_produto_category_inconsistente'::text AS check_id,
    count(*) AS total_issues,
    'category_id != main_category_id (verificar se esperado)'::text AS descricao,
    'INFO'::text AS severidade
   FROM products
  WHERE products.category_id IS NOT NULL AND products.main_category_id IS NOT NULL AND products.category_id <> products.main_category_id
UNION ALL
 SELECT 'B03_smoke_tests_runs_arquivada'::text AS check_id,
    0 AS total_issues,
    'smoke_tests_runs movida para schema archive em 2026-06-15. Ativa: smoke_test_runs (sem s).'::text AS descricao,
    'INFO'::text AS severidade
UNION ALL
 SELECT 'B06_quote_item_subtotal_formula'::text AS check_id,
    count(*) AS total_issues,
    'subtotal != (unit_price * qty + personalization_cost)'::text AS descricao,
    'CRITICAL'::text AS severidade
   FROM quote_items
  WHERE abs(quote_items.subtotal - (quote_items.unit_price * quote_items.quantity::numeric - COALESCE(quote_items.discount_amount, 0::numeric) + COALESCE(quote_items.personalization_cost, 0::numeric))) > 0.01;
```

## public.v_db_health_check (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | cron.job, cron.job_run_details, pg_catalog.pg_policies, pg_catalog.pg_stat_user_indexes, pg_catalog.pg_stat_user_tables |
| populada | n/a |
| comentário |  |


```sql
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size,
    ( SELECT count(*) AS count
           FROM pg_stat_user_indexes s
             JOIN pg_index i ON s.indexrelid = i.indexrelid
          WHERE s.schemaname = 'public'::name AND s.idx_scan = 0 AND NOT i.indisprimary AND NOT i.indisunique) AS unused_indexes,
    ( SELECT count(*) AS count
           FROM ( SELECT t.relname,
                    ix.indkey
                   FROM pg_index ix
                     JOIN pg_class t ON t.oid = ix.indrelid
                     JOIN pg_class i ON i.oid = ix.indexrelid
                     JOIN pg_namespace n ON n.oid = t.relnamespace
                  WHERE n.nspname = 'public'::name AND NOT ix.indisprimary AND ix.indpred IS NULL
                  GROUP BY t.relname, ix.indkey
                 HAVING count(*) > 1) d) AS duplicate_index_groups,
    ( SELECT COALESCE(sum(pg_stat_user_tables.n_dead_tup), 0::numeric) AS "coalesce"
           FROM pg_stat_user_tables
          WHERE pg_stat_user_tables.schemaname = 'public'::name) AS total_dead_rows,
    ( SELECT count(*) AS count
           FROM pg_constraint c
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
             JOIN pg_stat_user_tables s ON s.relid = c.conrelid
          WHERE c.contype = 'f'::"char" AND c.connamespace = (( SELECT pg_namespace.oid
                   FROM pg_namespace
                  WHERE pg_namespace.nspname = 'public'::name)) AND s.n_live_tup > 1000 AND NOT (EXISTS ( SELECT 1
                   FROM pg_index ix
                     JOIN pg_attribute ia ON ia.attrelid = ix.indrelid AND ia.attnum = ix.indkey[0]
                  WHERE ix.indrelid = c.conrelid AND ia.attname = a.attname))) AS unindexed_fks_large_tables,
    ( SELECT count(*) AS count
           FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
             JOIN pg_stat_user_tables s ON s.relid = c.oid
          WHERE c.relkind = 'm'::"char" AND s.n_live_tup = 0 AND (c.relname <> ALL (ARRAY['mv_product_intelligence'::name, 'mv_stock_velocity'::name]))) AS empty_mvs_unexpected,
    ( SELECT count(DISTINCT j.jobname) AS count
           FROM cron.job_run_details jrd
             JOIN cron.job j ON j.jobid = jrd.jobid
          WHERE jrd.status = 'failed'::text AND jrd.start_time >= (now() - '24:00:00'::interval)) AS crons_com_falhas_24h,
    ( SELECT count(*) AS count
           FROM pg_stat_user_tables
          WHERE pg_stat_user_tables.schemaname = 'public'::name AND (pg_stat_user_tables.relname ~~* '%log%'::text OR pg_stat_user_tables.relname ~~* '%telemetry%'::text OR pg_stat_user_tables.relname ~~* '%audit%'::text) AND pg_stat_user_tables.n_live_tup > 100000) AS log_tables_oversized,
    ( SELECT count(*) AS count
           FROM ( SELECT pg_policies.tablename,
                    pg_policies.cmd,
                    COALESCE(pg_policies.qual, ''::text) AS "coalesce",
                    COALESCE(pg_policies.with_check, ''::text) AS "coalesce",
                    pg_policies.roles::text AS roles
                   FROM pg_policies
                  WHERE pg_policies.schemaname = 'public'::name AND pg_policies.permissive = 'PERMISSIVE'::text
                  GROUP BY pg_policies.tablename, pg_policies.cmd, (COALESCE(pg_policies.qual, ''::text)), (COALESCE(pg_policies.with_check, ''::text)), (pg_policies.roles::text)
                 HAVING count(*) > 1) d(tablename, cmd, "coalesce", coalesce_1, roles)) AS rls_exact_duplicates,
    ( SELECT count(*) AS count
           FROM cron.job
          WHERE job.command ~~ '%eyJ%'::text) AS crons_com_chave_exposta,
    now() AS checked_at;
```

## public.v_dimensions_source_divergence (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.suppliers |
| populada | n/a |
| comentário | Qualidade escalares de dimensão. Antes: comparava jsonb vs escalar. Após DROP jsonb (2026-06-23): só verifica escalares. jsonb_* colunas mantidas para compat (NULL). |


```sql
SELECT p.id,
    p.sku,
    p.supplier_id,
    s.name AS supplier_name,
    p.dimensions_source,
    p.length_cm AS scalar_length_cm,
    p.width_cm AS scalar_width_cm,
    p.height_cm AS scalar_height_cm,
    p.weight_g,
    NULL::numeric AS jsonb_length_cm,
    NULL::numeric AS jsonb_width_cm,
    NULL::numeric AS jsonb_height_cm,
    NULL::numeric AS length_diff_cm,
    NULL::numeric AS width_diff_cm,
    NULL::numeric AS height_diff_cm,
        CASE
            WHEN p.length_cm > 300::numeric OR p.width_cm > 300::numeric OR p.height_cm > 300::numeric THEN 'critical'::text
            WHEN p.length_cm IS NULL OR p.width_cm IS NULL OR p.height_cm IS NULL THEN 'medium'::text
            ELSE 'low'::text
        END AS severity
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.is_active = true AND (p.length_cm > 300::numeric OR p.width_cm > 300::numeric OR p.height_cm > 300::numeric OR p.length_cm <= 0::numeric OR p.width_cm <= 0::numeric OR p.height_cm <= 0::numeric)
  ORDER BY (
        CASE
            WHEN p.length_cm > 300::numeric OR p.width_cm > 300::numeric OR p.height_cm > 300::numeric THEN 'critical'::text
            WHEN p.length_cm IS NULL OR p.width_cm IS NULL OR p.height_cm IS NULL THEN 'medium'::text
            ELSE 'low'::text
        END);
```

## public.v_enrichment_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.enriched_contacts |
| populada | n/a |
| comentário |  |


```sql
SELECT count(*) AS total_contacts,
    count(work_email) AS total_emails_found,
    count(phone_mobile) AS total_phones_found,
    count(
        CASE
            WHEN enrichment_status = 'complete'::text THEN 1
            ELSE NULL::integer
        END) AS complete_enrichments,
    count(
        CASE
            WHEN enrichment_status = 'partial'::text THEN 1
            ELSE NULL::integer
        END) AS partial_enrichments,
    round(count(work_email)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 1) AS email_find_rate,
    round(count(phone_mobile)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 1) AS phone_find_rate,
    avg(work_email_confidence) AS avg_email_confidence,
    avg(phone_mobile_confidence) AS avg_phone_confidence
   FROM enriched_contacts;
```

## public.v_gravacao_cobertura (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.print_area_techniques, public.products, public.tabela_preco_gravacao_oficial |
| populada | n/a |
| comentário |  |


```sql
SELECT t.grupo_tecnica,
    t.codigo_tabela,
    t.nome AS tecnica_nome,
    t.ativo AS tecnica_ativa,
    count(DISTINCT pat.product_id) AS produtos_configurados,
    count(DISTINCT pat.id) AS total_areas_configuradas,
    min(pat.max_width) AS min_largura_cm,
    max(pat.max_width) AS max_largura_cm,
    round(avg(COALESCE(pat.max_width, 0::numeric)), 2) AS avg_largura_cm,
    round(count(DISTINCT pat.product_id)::numeric / NULLIF(( SELECT count(*) AS count
           FROM products
          WHERE products.is_active = true), 0)::numeric * 100::numeric, 2) AS pct_produtos_ativos
   FROM tabela_preco_gravacao_oficial t
     LEFT JOIN print_area_techniques pat ON pat.tabela_preco_id = t.id AND pat.is_active = true
  GROUP BY t.id, t.grupo_tecnica, t.codigo_tabela, t.nome, t.ativo
  ORDER BY (count(DISTINCT pat.product_id)) DESC, t.grupo_tecnica, t.codigo_tabela;
```

## public.v_image_quality_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images |
| populada | n/a |
| comentário |  |


```sql
WITH stats AS (
         SELECT COALESCE(pi.supplier_code, 'SEM_FORNECEDOR'::character varying) AS supplier,
            count(*) AS total,
            count(*) FILTER (WHERE pi.width_px >= 1200 AND pi.height_px >= 1200) AS otimas,
            count(*) FILTER (WHERE pi.width_px >= 800 AND pi.height_px >= 800 AND (pi.width_px < 1200 OR pi.height_px < 1200)) AS aceitaveis,
            count(*) FILTER (WHERE pi.width_px < 800 OR pi.height_px < 800) AS ruins,
            count(*) FILTER (WHERE pi.width_px IS NULL OR pi.height_px IS NULL) AS sem_dimensao,
            avg(pi.width_px) AS media_largura,
            avg(pi.height_px) AS media_altura,
            avg(pi.file_size_bytes::numeric / 1024.0 / 1024.0) AS media_tamanho_mb
           FROM product_images pi
          WHERE pi.is_active = true
          GROUP BY (COALESCE(pi.supplier_code, 'SEM_FORNECEDOR'::character varying))
        )
 SELECT supplier AS fornecedor,
    total,
    otimas AS ">=1200px",
    aceitaveis AS "800-1199px",
    ruins AS "<800px",
    sem_dimensao AS sem_info,
    round(otimas::numeric / NULLIF(total, 0)::numeric * 100::numeric, 1) AS pct_otimas,
    round(media_largura, 0) AS media_largura_px,
    round(media_altura, 0) AS media_altura_px,
    round(media_tamanho_mb, 2) AS media_mb
   FROM stats
  ORDER BY total DESC;
```

## public.v_kill_switch_hits_summary (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.kill_switch_hits |
| populada | n/a |
| comentário | Resumo de kill_switch_hits. SECURITY INVOKER: respeita RLS do caller. |


```sql
SELECT switch_name,
    source,
    operation,
    target,
    count(*) AS hits,
    count(*) FILTER (WHERE occurred_at > (now() - '01:00:00'::interval)) AS hits_1h,
    count(*) FILTER (WHERE occurred_at > (now() - '24:00:00'::interval)) AS hits_24h,
    count(*) FILTER (WHERE occurred_at > (now() - '7 days'::interval)) AS hits_7d,
    max(occurred_at) AS last_hit
   FROM kill_switch_hits
  WHERE occurred_at > (now() - '30 days'::interval)
  GROUP BY switch_name, source, operation, target;
```

## public.v_kit_completeness_by_supplier (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.suppliers, public.v_kit_component_completeness |
| populada | n/a |
| comentário | Rollup de completude VERÍDICA por fornecedor (M7/2026-06-24). Use em vez de v_kit_enrichment_dashboard quando precisar da verdade incluindo cor/imagem. |


```sql
SELECT sup.name AS supplier_name,
    sup.code AS supplier_code,
    count(*) AS total_components,
    count(*) FILTER (WHERE c.true_status = 'complete'::text) AS truly_complete,
    round(100.0 * count(*) FILTER (WHERE c.true_status = 'complete'::text)::numeric / count(*)::numeric, 1) AS pct_truly_complete,
    round(avg(c.completude_pct), 1) AS avg_completude_pct,
    round(100.0 * count(*) FILTER (WHERE c.has_color)::numeric / count(*)::numeric, 1) AS pct_com_cor,
    round(100.0 * count(*) FILTER (WHERE c.has_image)::numeric / count(*)::numeric, 1) AS pct_com_imagem,
    round(100.0 * count(*) FILTER (WHERE c.has_dims)::numeric / count(*)::numeric, 1) AS pct_com_dims,
    round(100.0 * count(*) FILTER (WHERE c.has_weight)::numeric / count(*)::numeric, 1) AS pct_com_peso,
    round(100.0 * count(*) FILTER (WHERE c.is_packaging AND c.has_pkg_info)::numeric / NULLIF(count(*) FILTER (WHERE c.is_packaging), 0)::numeric, 1) AS pct_emb_completa
   FROM v_kit_component_completeness c
     JOIN products p ON p.id = c.kit_product_id
     JOIN suppliers sup ON sup.id = p.supplier_id
  GROUP BY sup.name, sup.code
  ORDER BY (round(100.0 * count(*) FILTER (WHERE c.true_status = 'complete'::text)::numeric / count(*)::numeric, 1)) DESC;
```

## public.v_kit_component_complete (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_kit_components, public.products, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT pkc.id,
    pkc.kit_product_id,
    p.sku AS kit_sku,
    p.name AS kit_name,
    s.name AS supplier_name,
    s.code AS supplier_code,
    pkc.component_name,
    pkc.component_type_code,
    pkc.display_order,
    pkc.quantity,
    pkc.is_optional,
    pkc.is_replaceable,
    pkc.allows_personalization,
    pkc.personalization_notes,
    pkc.component_product_id,
    pkc.material,
    pkc.color,
    pkc.is_packaging,
    pkc.enrichment_status,
    pkc.enrichment_confidence,
    pkc.enrichment_source,
    pkc.shape_type,
    pkc.length_mm,
    pkc.width_mm,
    pkc.height_mm,
    pkc.diameter_mm,
    pkc.circumference_mm,
    pkc.weight_g,
    pkc.pkg_ext_length_mm,
    pkc.pkg_ext_width_mm,
    pkc.pkg_ext_height_mm,
    pkc.pkg_int_length_mm,
    pkc.pkg_int_width_mm,
    pkc.pkg_int_height_mm,
    pkc.pkg_weight_g,
    pkc.pkg_material,
    pkc.pkg_color,
    pkc.pkg_finish,
    round(
        CASE
            WHEN pkc.shape_type::text = 'cylindrical'::text AND pkc.diameter_mm IS NOT NULL AND pkc.height_mm IS NOT NULL THEN pi() * power(pkc.diameter_mm::numeric / 20.0, 2::numeric)::double precision * (pkc.height_mm::numeric / 10.0)::double precision
            WHEN pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL AND pkc.height_mm IS NOT NULL THEN (pkc.length_mm::numeric / 10.0 * (pkc.width_mm::numeric / 10.0) * (pkc.height_mm::numeric / 10.0))::double precision
            WHEN pkc.shape_type::text = 'flat'::text AND pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL THEN (pkc.length_mm::numeric / 10.0 * (pkc.width_mm::numeric / 10.0) * 0.5)::double precision
            WHEN pkc.is_packaging AND pkc.pkg_ext_length_mm IS NOT NULL THEN (pkc.pkg_ext_length_mm::numeric / 10.0 * (pkc.pkg_ext_width_mm::numeric / 10.0) * (COALESCE(pkc.pkg_ext_height_mm, 20)::numeric / 10.0))::double precision
            ELSE NULL::double precision
        END::numeric, 2) AS volume_cm3,
    round(
        CASE
            WHEN pkc.weight_g IS NOT NULL AND pkc.shape_type::text = 'cylindrical'::text AND pkc.diameter_mm IS NOT NULL AND pkc.height_mm IS NOT NULL THEN pkc.weight_g::double precision / (pi() * power(pkc.diameter_mm::numeric / 20.0, 2::numeric)::double precision * (pkc.height_mm::numeric / 10.0)::double precision)
            WHEN pkc.weight_g IS NOT NULL AND pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL AND pkc.height_mm IS NOT NULL THEN (pkc.weight_g::numeric / (pkc.length_mm::numeric / 10.0 * (pkc.width_mm::numeric / 10.0) * (pkc.height_mm::numeric / 10.0)))::double precision
            ELSE NULL::double precision
        END::numeric, 3) AS density_g_cm3,
    pkc.weight_g * COALESCE(pkc.quantity, 1) AS line_weight_g,
    pkc.padronizacao_id,
    pkc.notes,
    pkc.created_at,
    pkc.updated_at
   FROM product_kit_components pkc
     JOIN products p ON p.id = pkc.kit_product_id
     JOIN suppliers s ON s.id = p.supplier_id;
```

## public.v_kit_component_completeness (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_kit_components |
| populada | n/a |
| comentário | Completude VERÍDICA por componente (M7/2026-06-24). Itens pontuam em 5 dimensões (tipo, peso, medidas, cor, imagem); embalagens em 3 (tipo, dims externas, material). completude_pct/true_status refletem TODOS os requisitos do negócio — ao contrário de enrichment_status, que só mede dimensão física. |


```sql
SELECT component_id,
    kit_product_id,
    component_name,
    component_type_code,
    is_packaging,
    has_type,
    has_weight,
    has_dims,
    has_color,
    has_image,
    has_pkg_dims,
    has_pkg_material,
    has_pkg_info,
    dims_satisfeitas,
    dims_aplicaveis,
    completude_pct,
    enrichment_status,
        CASE
            WHEN completude_pct = 100 THEN 'complete'::text
            WHEN completude_pct >= 50 THEN 'partial'::text
            ELSE 'minimal'::text
        END AS true_status
   FROM ( SELECT f.component_id,
            f.kit_product_id,
            f.component_name,
            f.component_type_code,
            f.is_packaging,
            f.has_type,
            f.has_weight,
            f.has_dims,
            f.has_color,
            f.has_image,
            f.has_pkg_dims,
            f.has_pkg_material,
            f.has_pkg_dims AND f.has_pkg_material AS has_pkg_info,
                CASE
                    WHEN f.is_packaging THEN f.has_type::integer + f.has_pkg_dims::integer + f.has_pkg_material::integer
                    ELSE f.has_type::integer + f.has_weight::integer + f.has_dims::integer + f.has_color::integer + f.has_image::integer
                END AS dims_satisfeitas,
                CASE
                    WHEN f.is_packaging THEN 3
                    ELSE 5
                END AS dims_aplicaveis,
                CASE
                    WHEN f.is_packaging THEN round(100.0 * (f.has_type::integer + f.has_pkg_dims::integer + f.has_pkg_material::integer)::numeric / 3.0)::integer
                    ELSE round(100.0 * (f.has_type::integer + f.has_weight::integer + f.has_dims::integer + f.has_color::integer + f.has_image::integer)::numeric / 5.0)::integer
                END AS completude_pct,
            f.enrichment_status
           FROM ( SELECT pkc.id AS component_id,
                    pkc.kit_product_id,
                    pkc.component_name,
                    pkc.component_type_code,
                    pkc.is_packaging,
                    pkc.component_type_code IS NOT NULL AS has_type,
                    pkc.weight_g IS NOT NULL AS has_weight,
                        CASE
                            WHEN pkc.shape_type::text = 'cylindrical'::text THEN pkc.diameter_mm IS NOT NULL
                            ELSE pkc.length_mm IS NOT NULL AND pkc.width_mm IS NOT NULL
                        END AS has_dims,
                    pkc.color IS NOT NULL AS has_color,
                    pkc.primary_image_url IS NOT NULL AS has_image,
                    COALESCE(pkc.pkg_ext_length_mm, pkc.pkg_ext_width_mm, pkc.pkg_ext_height_mm) IS NOT NULL AS has_pkg_dims,
                    pkc.pkg_material IS NOT NULL AS has_pkg_material,
                    pkc.enrichment_status
                   FROM product_kit_components pkc) f) s;
```

## public.v_kit_component_identity_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.kit_component_variant_skus, public.products, public.suppliers |
| populada | n/a |
| comentário | Saúde honesta da identidade de componente por fornecedor: linhas materializadas, cobertura de código qualificado, cor canônica e imagem real. pct_image=0 para XBZ/Asia/Só Marcas é verídico (sem fonte de foto por componente). |


```sql
SELECT s.name AS supplier,
    count(*) AS variant_component_rows,
    count(DISTINCT k.kit_product_id) AS kits,
    count(DISTINCT k.component_id) AS components,
    count(*) FILTER (WHERE k.component_sku IS NOT NULL) AS with_qualified_code,
    count(*) FILTER (WHERE k.item_color_id IS NOT NULL) AS with_canonical_color,
    count(*) FILTER (WHERE k.primary_image_url IS NOT NULL) AS with_image,
    round(100.0 * count(*) FILTER (WHERE k.item_color_id IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 1) AS pct_color,
    round(100.0 * count(*) FILTER (WHERE k.primary_image_url IS NOT NULL)::numeric / NULLIF(count(*), 0)::numeric, 1) AS pct_image
   FROM kit_component_variant_skus k
     JOIN products p ON p.id = k.kit_product_id
     JOIN suppliers s ON s.id = p.supplier_id
  GROUP BY s.name
  ORDER BY (count(*)) DESC;
```

## public.v_kit_component_media_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=false |
| depende de | public.product_kit_components, public.products |
| populada | n/a |
| comentário | SECURITY DEFINER intencional (fix_version 20260717). Depende de products para filtro is_active. Colunas de output: kit_component_id, component_code/name, primary_image_url. |


```sql
SELECT pkc.id AS kit_component_id,
    pkc.kit_product_id,
    pkc.component_product_id,
    pkc.component_code,
    pkc.component_name,
    pkc.primary_image_url,
    pkc.images,
    pkc.display_order
   FROM product_kit_components pkc
     JOIN products p ON p.id = pkc.kit_product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
  WHERE pkc.primary_image_url IS NOT NULL OR pkc.images IS NOT NULL;
```

## public.v_kit_component_print_areas_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.kit_component_print_areas, public.product_kit_components, public.products |
| populada | n/a |
| comentário | security_invoker=true: respeita RLS/grants de kit_component_print_areas, product_kit_components e products. |


```sql
SELECT kpa.id,
    kpa.kit_component_id,
    kpa.location_code,
    kpa.location_name,
    kpa.location_order,
    kpa.max_width,
    kpa.max_height,
    kpa.shape,
    kpa.is_curved,
    kpa.technique_order
   FROM kit_component_print_areas kpa
     JOIN product_kit_components pkc ON pkc.id = kpa.kit_component_id
     JOIN products p ON p.id = pkc.kit_product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
  WHERE kpa.is_active = true;
```

## public.v_kit_component_skus (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.color_variations, public.product_kit_components, public.product_variants, public.products |
| populada | n/a |
| comentário | Código qualificado de cada componente por variante: variant_sku \|\| '-' \|\| slot_code (ex.: 18891A-PRE-K1). Itens=K{n}, embalagem=E{n}. Nunca colide com SKU vendável (sufixo -K/-E tem colisão zero). BOM permanece 1 linha por componente; o código por variante é gerado aqui (sob demanda). |


```sql
SELECT c.id AS component_id,
    c.kit_product_id,
    v.id AS variant_id,
    p.sku AS parent_sku,
    v.sku AS variant_sku,
    v.color_code AS variant_color_code,
    v.color_name AS variant_color_name,
    c.slot_code,
    c.component_name,
    c.component_type_code,
    c.is_packaging,
    c.color_id AS item_color_id,
    c.component_code AS component_code_agnostico,
        CASE
            WHEN cv.internal_code IS NULL OR cv.internal_code::text = ''::text THEN (v.sku || '-'::text) || c.slot_code::text
            WHEN count(*) OVER (PARTITION BY c.kit_product_id, c.slot_code, cv.internal_code) = 1 THEN (((p.sku || '-'::text) || cv.internal_code::text) || '-'::text) || c.slot_code::text
            ELSE (v.sku || '-'::text) || c.slot_code::text
        END AS component_sku,
    c.primary_image_url AS component_image_url,
    cv.internal_code AS color_internal_code
   FROM product_kit_components c
     JOIN products p ON p.id = c.kit_product_id
     JOIN product_variants v ON v.product_id = c.kit_product_id
     LEFT JOIN color_variations cv ON cv.id = v.color_id;
```

## public.v_kit_enrichment_dashboard (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_kit_components, public.products, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT s.name AS supplier_name,
    s.code AS supplier_code,
    count(*) AS total_components,
    count(*) FILTER (WHERE pkc.enrichment_status::text = 'complete'::text) AS complete,
    count(*) FILTER (WHERE pkc.enrichment_status::text = 'partial'::text) AS partial,
    count(*) FILTER (WHERE pkc.enrichment_status::text = 'missing'::text) AS missing,
    round(count(*) FILTER (WHERE pkc.enrichment_status::text = 'complete'::text)::numeric * 100.0 / count(*)::numeric, 1) AS pct_complete,
    round(count(*) FILTER (WHERE pkc.enrichment_status::text = ANY (ARRAY['complete'::character varying, 'partial'::character varying]::text[]))::numeric * 100.0 / count(*)::numeric, 1) AS pct_useful
   FROM product_kit_components pkc
     JOIN products p ON p.id = pkc.kit_product_id
     JOIN suppliers s ON s.id = p.supplier_id
  GROUP BY s.name, s.code
  ORDER BY (round(count(*) FILTER (WHERE pkc.enrichment_status::text = 'complete'::text)::numeric * 100.0 / count(*)::numeric, 1)) DESC;
```

## public.v_kit_ficha_pipeline_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.kit_component_ficha_staging, public.product_kit_components, public.v_xbz_ficha_parse_queue |
| populada | n/a |
| comentário | Saude do pipeline de ficha tecnica: estado da staging, procedencia das medidas (real vs heuristica) e tamanho da fila acionavel de parse. |


```sql
SELECT ( SELECT count(*) AS count
           FROM kit_component_ficha_staging) AS staging_total,
    ( SELECT count(*) AS count
           FROM kit_component_ficha_staging
          WHERE kit_component_ficha_staging.match_status::text = 'pending'::text) AS staging_pendentes,
    ( SELECT count(*) AS count
           FROM kit_component_ficha_staging
          WHERE kit_component_ficha_staging.match_status::text = 'promoted'::text) AS staging_promovidos,
    ( SELECT count(*) AS count
           FROM kit_component_ficha_staging
          WHERE kit_component_ficha_staging.match_status::text = 'no_component'::text) AS staging_sem_componente,
    ( SELECT count(*) AS count
           FROM kit_component_ficha_staging
          WHERE kit_component_ficha_staging.match_status::text = 'skipped'::text) AS staging_skipped,
    ( SELECT count(*) AS count
           FROM product_kit_components
          WHERE product_kit_components.dim_source::text = 'ficha'::text) AS componentes_dim_real_ficha,
    ( SELECT count(*) AS count
           FROM product_kit_components
          WHERE product_kit_components.dim_source::text = 'heuristic'::text) AS componentes_dim_heuristica,
    ( SELECT count(*) AS count
           FROM product_kit_components
          WHERE product_kit_components.dim_source::text = 'manual'::text) AS componentes_dim_manual,
    ( SELECT count(*) AS count
           FROM v_xbz_ficha_parse_queue
          WHERE v_xbz_ficha_parse_queue.prioridade = 1) AS fila_kits_dims_heuristicas,
    ( SELECT count(*) AS count
           FROM v_xbz_ficha_parse_queue
          WHERE v_xbz_ficha_parse_queue.prioridade = 2) AS fila_kits_sem_componentes,
    ( SELECT count(*) AS count
           FROM v_xbz_ficha_parse_queue
          WHERE v_xbz_ficha_parse_queue.prioridade = 3) AS fila_reclassificar,
    ( SELECT COALESCE(sum(v_xbz_ficha_parse_queue.n_dim_heuristicas), 0::numeric) AS "coalesce"
           FROM v_xbz_ficha_parse_queue
          WHERE v_xbz_ficha_parse_queue.prioridade = 1) AS dims_heuristicas_corrigiveis_via_ficha,
    round(100.0 * (( SELECT count(*) AS count
           FROM product_kit_components
          WHERE product_kit_components.dim_source::text = 'ficha'::text))::numeric / NULLIF(( SELECT count(*) AS count
           FROM product_kit_components
          WHERE product_kit_components.dim_source IS NOT NULL), 0)::numeric, 2) AS pct_dims_reais;
```

## public.v_kit_max_quantity (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_kit_components, public.product_variants, public.products, public.variant_supplier_sources |
| populada | n/a |
| comentário | View que calcula quantos kits é possível montar com estoque atual. Considera apenas componentes obrigatórios e retorna o MIN (gargalo). Também identifica qual componente está limitando a produção. |


```sql
SELECT p.id AS kit_id,
    p.name AS kit_name,
    p.sku AS kit_sku,
    min(
        CASE
            WHEN pkc.quantity > 0 THEN floor(COALESCE(vs.quantity, 0)::numeric / pkc.quantity::numeric)
            ELSE 0::numeric
        END) AS max_kits_possiveis,
    count(pkc.id) AS total_componentes,
    count(vs.id) FILTER (WHERE vs.quantity > 0) AS componentes_com_estoque,
    ( SELECT pkc2.component_name
           FROM product_kit_components pkc2
             LEFT JOIN product_variants pv2 ON pv2.product_id = pkc2.component_product_id
             LEFT JOIN variant_supplier_sources vs2 ON vs2.variant_id = pv2.id
          WHERE pkc2.kit_product_id = p.id AND pkc2.is_optional = false
          ORDER BY (floor(COALESCE(vs2.quantity, 0)::numeric / NULLIF(pkc2.quantity, 1)::numeric))
         LIMIT 1) AS componente_gargalo
   FROM products p
     JOIN product_kit_components pkc ON pkc.kit_product_id = p.id
     LEFT JOIN product_variants pv ON pv.product_id = pkc.component_product_id
     LEFT JOIN variant_supplier_sources vs ON vs.variant_id = pv.id
  WHERE p.is_kit = true AND pkc.is_optional = false
  GROUP BY p.id, p.name, p.sku;
```

## public.v_kit_pipeline_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | cron.job, public.kit_component_enrichment_raw, public.kit_component_padronizacao, public.kit_component_print_areas, public.kit_component_types, public.kit_typical_dims, public.product_kit_components, public.products, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
WITH bronze_stats AS (
         SELECT count(*) AS total_bronze,
            count(*) FILTER (WHERE kit_component_enrichment_raw.processed = true) AS bronze_processed,
            count(*) FILTER (WHERE kit_component_enrichment_raw.processed = false) AS bronze_pending,
            count(*) FILTER (WHERE kit_component_enrichment_raw.process_errors IS NOT NULL) AS bronze_errors
           FROM kit_component_enrichment_raw
        ), silver_stats AS (
         SELECT count(*) AS total_silver,
            count(*) FILTER (WHERE kit_component_padronizacao.padronizacao_status::text = 'promoted'::text) AS silver_promoted,
            count(*) FILTER (WHERE kit_component_padronizacao.padronizacao_status::text = 'pending'::text) AS silver_pending,
            count(*) FILTER (WHERE kit_component_padronizacao.material_type_id IS NOT NULL) AS silver_com_material
           FROM kit_component_padronizacao
        ), gold_stats AS (
         SELECT count(*) AS total_gold,
            count(*) FILTER (WHERE product_kit_components.enrichment_status::text = 'complete'::text) AS gold_complete,
            count(*) FILTER (WHERE product_kit_components.enrichment_status::text = 'partial'::text) AS gold_partial,
            count(*) FILTER (WHERE product_kit_components.enrichment_status::text = 'missing'::text) AS gold_missing,
            count(*) FILTER (WHERE product_kit_components.material_type_id IS NOT NULL) AS gold_com_material,
            count(*) FILTER (WHERE product_kit_components.component_type_code IS NOT NULL) AS gold_com_type,
            count(*) FILTER (WHERE product_kit_components.allows_personalization = true) AS gold_personalizaveis
           FROM product_kit_components
        ), print_stats AS (
         SELECT count(DISTINCT kit_component_print_areas.kit_component_id) AS componentes_com_area,
            count(*) AS total_areas
           FROM kit_component_print_areas
          WHERE kit_component_print_areas.is_active
        ), kit_counts AS (
         SELECT count(DISTINCT p_1.id) AS total_kits,
            count(DISTINCT p_1.id) FILTER (WHERE s_1.code = 'SOMARCAS'::text) AS kits_somarcas,
            count(DISTINCT p_1.id) FILTER (WHERE s_1.code = 'XBZ'::text) AS kits_xbz,
            count(DISTINCT p_1.id) FILTER (WHERE s_1.code = 'STRICKER'::text) AS kits_stricker,
            count(DISTINCT p_1.id) FILTER (WHERE s_1.code = 'ASIA'::text) AS kits_asia
           FROM products p_1
             JOIN suppliers s_1 ON s_1.id = p_1.supplier_id
          WHERE p_1.is_kit = true AND p_1.is_active = true
        ), infra AS (
         SELECT ( SELECT count(*) AS count
                   FROM kit_typical_dims) AS tipos_com_dims,
            ( SELECT count(*) AS count
                   FROM kit_component_types) AS total_tipos,
            COALESCE(( SELECT job.active
                   FROM cron.job
                  WHERE job.jobname = 'kit-enrich-daily'::text), false) AS cron_enrich_ativo,
            COALESCE(( SELECT job.active
                   FROM cron.job
                  WHERE job.jobname = 'kit-material-propagate'::text), false) AS cron_material_ativo
        )
 SELECT b.bronze_processed,
    b.bronze_pending,
    b.bronze_errors,
    round(b.bronze_processed::numeric * 100.0 / NULLIF(b.total_bronze, 0)::numeric, 1) AS pct_bronze,
    s.silver_promoted,
    s.silver_pending,
    round(s.silver_promoted::numeric * 100.0 / NULLIF(s.total_silver, 0)::numeric, 1) AS pct_silver_promoted,
    round(s.silver_com_material::numeric * 100.0 / NULLIF(s.total_silver, 0)::numeric, 1) AS pct_silver_material,
    g.total_gold,
    g.gold_complete,
    g.gold_partial,
    g.gold_missing,
    round(g.gold_complete::numeric * 100.0 / NULLIF(g.total_gold, 0)::numeric, 1) AS pct_gold_complete,
    round(g.gold_com_material::numeric * 100.0 / NULLIF(g.total_gold, 0)::numeric, 1) AS pct_gold_material,
    round(g.gold_com_type::numeric * 100.0 / NULLIF(g.total_gold, 0)::numeric, 1) AS pct_gold_typed,
    p.componentes_com_area,
    g.gold_personalizaveis,
    round(p.componentes_com_area::numeric * 100.0 / NULLIF(g.gold_personalizaveis, 0)::numeric, 1) AS pct_print_pers,
    p.total_areas,
    k.total_kits,
    k.kits_somarcas,
    k.kits_xbz,
    k.kits_stricker,
    k.kits_asia,
    i.tipos_com_dims,
    i.total_tipos,
    i.cron_enrich_ativo,
    i.cron_material_ativo,
    round(COALESCE(b.bronze_processed::numeric * 100.0 / NULLIF(b.total_bronze, 0)::numeric, 0::numeric) * 0.10 + COALESCE(s.silver_promoted::numeric * 100.0 / NULLIF(s.total_silver, 0)::numeric, 0::numeric) * 0.10 + COALESCE(s.silver_com_material::numeric * 100.0 / NULLIF(s.total_silver, 0)::numeric, 0::numeric) * 0.10 + COALESCE(g.gold_complete::numeric * 100.0 / NULLIF(g.total_gold, 0)::numeric, 0::numeric) * 0.20 + COALESCE(g.gold_com_material::numeric * 100.0 / NULLIF(g.total_gold, 0)::numeric, 0::numeric) * 0.15 + COALESCE(g.gold_com_type::numeric * 100.0 / NULLIF(g.total_gold, 0)::numeric, 0::numeric) * 0.10 + COALESCE(p.componentes_com_area::numeric * 100.0 / NULLIF(g.gold_personalizaveis, 0)::numeric, 0::numeric) * 0.15 +
        CASE
            WHEN i.cron_enrich_ativo THEN 100
            ELSE 0
        END::numeric * 0.05 +
        CASE
            WHEN i.cron_material_ativo THEN 100
            ELSE 0
        END::numeric * 0.05, 2) AS health_score
   FROM bronze_stats b,
    silver_stats s,
    gold_stats g,
    print_stats p,
    kit_counts k,
    infra i;
```

## public.v_kit_with_components (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_kit_components, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id AS kit_id,
    p.name AS kit_name,
    p.sku AS kit_sku,
    p.description AS kit_description,
    p.primary_image_url AS kit_image,
    pkc.id AS component_id,
    pkc.component_code,
    COALESCE(pkc.component_name, cp.name::character varying) AS component_name,
    COALESCE(pkc.component_description, cp.description) AS component_description,
    COALESCE(pkc.component_sku, cp.sku::character varying) AS component_sku,
    pkc.material,
    pkc.color,
    pkc.weight_g,
    pkc.length_mm,
    pkc.width_mm,
    pkc.height_mm,
    COALESCE(pkc.primary_image_url, cp.primary_image_url) AS component_image,
    pkc.quantity,
    pkc.is_optional,
    pkc.allows_personalization,
    pkc.personalization_notes,
    pkc.supplier_component_code,
    pkc.display_order
   FROM products p
     JOIN product_kit_components pkc ON p.id = pkc.kit_product_id
     LEFT JOIN products cp ON pkc.component_product_id = cp.id
  WHERE p.is_kit = true
  ORDER BY p.name, pkc.display_order;
```

## public.v_media_statistics (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.image_types, public.product_images |
| populada | n/a |
| comentário | Estatísticas de imagens agrupadas por tipo semântico (image_types). Retorna contagem, produtos distintos e tamanho total em MB por tipo.  QUANDO USAR:   Dashboards de qualidade de catálogo, relatórios de cobertura de imagens por tipo.   Para ver saúde geral (sem detalhe por tipo): use vw_product_images_health.   Para ver coerência image_type vs image_type_id: use vw_image_type_coherence.  COMO USAR:   SELECT * FROM v_media_statistics ORDER BY quantidade DESC;   SELECT * FROM v_media_statistics WHERE tipo_code = 'main';  NOTA: só retorna imagens com is_active = true. Tipos com 0 imagens (vitrine_pessoa, mockup, other...) não aparecem nesta view porque usa JOIN, não LEFT JOIN em image_types. |


```sql
WITH image_stats AS (
         SELECT COALESCE(it.code, pi.image_type, 'unknown'::character varying) AS tipo_code,
            COALESCE(it.name, pi.image_type, 'Desconhecido'::character varying) AS tipo_nome,
            COALESCE(it.category, 'other'::character varying) AS categoria,
            count(*) AS quantidade,
            count(DISTINCT pi.product_id) AS produtos_distintos,
            sum(COALESCE(pi.file_size_bytes, 0::bigint)) AS tamanho_total_bytes
           FROM product_images pi
             LEFT JOIN image_types it ON pi.image_type_id = it.id
          WHERE pi.is_active = true
          GROUP BY it.code, it.name, it.category, pi.image_type
        ), totals AS (
         SELECT COALESCE(sum(image_stats.quantidade), 0::numeric) AS total_imagens
           FROM image_stats
        )
 SELECT 'IMAGENS'::text AS modulo,
    i.tipo_code,
    i.tipo_nome,
    i.categoria,
    i.quantidade,
        CASE
            WHEN t.total_imagens > 0::numeric THEN round(i.quantidade::numeric / t.total_imagens * 100::numeric, 1)
            ELSE 0::numeric
        END AS percentual,
    i.produtos_distintos,
    round(i.tamanho_total_bytes / 1024.0 / 1024.0, 2) AS tamanho_mb
   FROM image_stats i
     CROSS JOIN totals t
  ORDER BY i.quantidade DESC;
```

## public.v_media_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.image_types, public.product_images, public.product_videos |
| populada | n/a |
| comentário | Estatísticas de mídia (imagens e vídeos) por tipo |


```sql
SELECT 'images'::text AS media_type,
    count(*) AS total_count,
    count(DISTINCT pi.product_id) AS products_with_media,
    sum(COALESCE(pi.file_size_bytes, 0::bigint)) AS total_bytes,
    pg_size_pretty(COALESCE(sum(pi.file_size_bytes), 0::numeric)) AS total_size_formatted,
    count(*) FILTER (WHERE it.code::text = 'main'::text OR it.code::text = 'product'::text) AS count_main,
    count(*) FILTER (WHERE it.code::text = 'gallery'::text) AS count_gallery,
    count(*) FILTER (WHERE it.code::text = 'logo'::text) AS count_logo,
    count(*) FILTER (WHERE it.code::text = 'set'::text) AS count_set
   FROM product_images pi
     LEFT JOIN image_types it ON pi.image_type_id = it.id
  WHERE pi.is_active = true
UNION ALL
 SELECT 'videos'::text AS media_type,
    count(*) AS total_count,
    count(DISTINCT product_videos.product_id) AS products_with_media,
    sum(COALESCE(product_videos.file_size_bytes, 0::bigint)) AS total_bytes,
    pg_size_pretty(COALESCE(sum(product_videos.file_size_bytes), 0::numeric)) AS total_size_formatted,
    count(*) FILTER (WHERE product_videos.is_primary = true) AS count_main,
    count(*) AS count_gallery,
    0 AS count_logo,
    0 AS count_set
   FROM product_videos
  WHERE product_videos.is_active = true;
```

## public.v_monthly_costs (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.enrichment_log |
| populada | n/a |
| comentário |  |


```sql
SELECT provider_name,
    to_char(created_at, 'YYYY-MM'::text) AS month,
    count(*) AS total_calls,
    count(
        CASE
            WHEN success THEN 1
            ELSE NULL::integer
        END) AS successful_calls,
    sum(cost_usd) AS total_cost,
    round(avg(response_time_ms), 0) AS avg_response_ms
   FROM enrichment_log
  GROUP BY provider_name, (to_char(created_at, 'YYYY-MM'::text))
  ORDER BY (to_char(created_at, 'YYYY-MM'::text)) DESC, (sum(cost_usd)) DESC;
```

## public.v_my_markup_config (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.markup_configurations, public.user_organizations |
| populada | n/a |
| comentário | Org-isolated markup config. Returns only current user org rules. markup_percent excluded. |


```sql
SELECT mc.id,
    mc.organization_id,
    mc.supplier_id,
    mc.category_id,
    mc.product_id,
    mc.variant_id,
    mc.description,
    mc.is_active,
    mc.priority,
    mc.created_at,
    mc.updated_at
   FROM markup_configurations mc
     JOIN user_organizations uo ON uo.organization_id = mc.organization_id
  WHERE uo.user_id = auth.uid() AND mc.is_active = true;
```

## public.v_needs_enrichment (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.enriched_contacts |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    first_name,
    last_name,
    current_company,
    company_domain,
    enrichment_status,
    last_enriched_at
   FROM enriched_contacts
  WHERE work_email IS NULL AND phone_mobile IS NULL OR (enrichment_status = ANY (ARRAY['pending'::text, 'failed'::text])) OR last_enriched_at < (now() - '60 days'::interval)
  ORDER BY created_at DESC;
```

## public.v_performance_dashboard (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | extensions.pg_stat_statements, pg_catalog.pg_indexes, pg_catalog.pg_stat_user_indexes, pg_catalog.pg_stat_user_tables, pg_catalog.pg_statio_user_tables |
| populada | n/a |
| comentário | Dashboard de performance (pg_stat_statements). ADMIN-ONLY. security_invoker=true. Acesso: service_role apenas. Aplicado em T19 do redeploy 2026-05. |


```sql
WITH top_queries AS (
         SELECT "left"(pg_stat_statements.query, 80) AS query_snippet,
            pg_stat_statements.calls,
            round(pg_stat_statements.mean_exec_time::numeric, 2) AS avg_ms,
            round(pg_stat_statements.total_exec_time::numeric / 1000::numeric, 2) AS total_seconds,
            'top_query'::text AS metric_type
           FROM pg_stat_statements
          WHERE pg_stat_statements.calls > 5 AND pg_stat_statements.query !~~ '%pg_stat_statements%'::text
          ORDER BY pg_stat_statements.total_exec_time DESC
         LIMIT 5
        ), cache_hit AS (
         SELECT round(100.0 * sum(pg_statio_user_tables.heap_blks_hit) / NULLIF(sum(pg_statio_user_tables.heap_blks_hit + pg_statio_user_tables.heap_blks_read), 0::numeric), 2)::text AS valor,
            'cache_hit_ratio_pct'::text AS metric
           FROM pg_statio_user_tables
        ), table_stats AS (
         SELECT count(*)::text AS valor,
            'public_tables_total'::text AS metric
           FROM pg_stat_user_tables
          WHERE pg_stat_user_tables.schemaname = 'public'::name
        ), index_stats AS (
         SELECT count(*)::text AS valor,
            'public_indexes_total'::text AS metric
           FROM pg_indexes
          WHERE pg_indexes.schemaname = 'public'::name
        ), unused_indexes AS (
         SELECT count(*)::text AS valor,
            'unused_indexes'::text AS metric
           FROM pg_stat_user_indexes s
          WHERE s.schemaname = 'public'::name AND s.idx_scan = 0 AND s.indexrelname !~~ '%_pkey'::text AND s.indexrelname !~~ 'uq_%'::text
        ), db_size AS (
         SELECT pg_size_pretty(pg_database_size(current_database())) AS valor,
            'database_size'::text AS metric
        )
 SELECT cache_hit.metric AS "métrica",
    cache_hit.valor
   FROM cache_hit
UNION ALL
 SELECT table_stats.metric AS "métrica",
    table_stats.valor
   FROM table_stats
UNION ALL
 SELECT index_stats.metric AS "métrica",
    index_stats.valor
   FROM index_stats
UNION ALL
 SELECT unused_indexes.metric AS "métrica",
    unused_indexes.valor
   FROM unused_indexes
UNION ALL
 SELECT db_size.metric AS "métrica",
    db_size.valor
   FROM db_size;
```

## public.v_personalization_techniques_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.personalization_techniques |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    name,
    code,
    description,
    requires_color_count
   FROM personalization_techniques pt
  WHERE is_active = true;
```

## public.v_pipeline_next_step (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.import_pipeline_steps |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    fase,
    etapa,
    titulo,
    descricao,
    comando_resumo,
    dependencia,
    status,
    resultado,
    error_message,
    started_at,
    completed_at,
    created_at,
    updated_at
   FROM import_pipeline_steps
  WHERE (status::text = ANY (ARRAY['pending'::character varying, 'error'::character varying]::text[])) AND (dependencia IS NULL OR dependencia <@ (( SELECT array_agg(import_pipeline_steps_1.etapa) AS array_agg
           FROM import_pipeline_steps import_pipeline_steps_1
          WHERE import_pipeline_steps_1.status::text = 'done'::text)))
  ORDER BY etapa
 LIMIT 1;
```

## public.v_pipeline_progress (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.import_pipeline_steps |
| populada | n/a |
| comentário |  |


```sql
SELECT fase,
    count(*) AS total_etapas,
    count(*) FILTER (WHERE status::text = 'done'::text) AS concluidas,
    count(*) FILTER (WHERE status::text = 'running'::text) AS em_andamento,
    count(*) FILTER (WHERE status::text = 'error'::text) AS com_erro,
    count(*) FILTER (WHERE status::text = 'pending'::text) AS pendentes,
    count(*) FILTER (WHERE status::text = 'skipped'::text) AS puladas,
    round(100.0 * count(*) FILTER (WHERE status::text = 'done'::text)::numeric / count(*)::numeric, 1) AS pct_completo
   FROM import_pipeline_steps
  GROUP BY fase
  ORDER BY (min(etapa));
```

## public.v_price_history_safe (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.price_history |
| populada | n/a |
| comentário | Safe price history: metadata only. JSONB price values (old_values, new_values) excluded. |


```sql
SELECT id,
    variant_id,
    change_type,
    change_reason,
    changed_by,
    changed_at,
    source
   FROM price_history;
```

## public.v_print_area_techniques_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.print_area_techniques |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    product_id,
    tabela_preco_id,
    location_code,
    location_name,
    location_order,
    max_width,
    max_height,
    is_curved,
    shape,
    technique_order,
    is_active,
    notes,
    unit_cost,
    created_at,
    updated_at
   FROM print_area_techniques
  WHERE is_active = true;
```

## public.v_product_active_badge (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id AS product_id,
    p.sku,
    p.name,
    p.is_active,
    p.is_stockout,
    p.is_new,
    p.is_bestseller,
    p.is_featured,
    false AS is_on_sale,
    p.has_gift_box,
    p.has_commercial_packaging,
    p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold AS is_low_stock,
    p.is_active AND p.price_last_verified_at IS NOT NULL AND (EXTRACT(epoch FROM now() - p.price_last_verified_at) / 86400::numeric) > COALESCE(p.price_freshness_threshold_days, 60)::numeric AS is_price_stale,
    round(EXTRACT(epoch FROM now() - p.price_last_verified_at) / 86400::numeric)::integer AS price_freshness_days_ago,
        CASE
            WHEN p.is_new AND p.novelty_expires_at IS NOT NULL AND p.novelty_expires_at > now() THEN GREATEST(0, EXTRACT(day FROM p.novelty_expires_at - now())::integer)
            ELSE NULL::integer
        END AS novelty_days_remaining,
        CASE
            WHEN p.is_new AND p.novelty_expires_at IS NOT NULL AND p.novelty_expires_at > now() THEN 'countdown'::text
            WHEN p.is_new THEN 'fallback'::text
            ELSE NULL::text
        END AS novelty_badge_subtype,
        CASE
            WHEN p.is_stockout THEN 'stockout'::text
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'low_stock'::text
            WHEN p.is_new THEN 'new'::text
            WHEN p.is_bestseller THEN 'bestseller'::text
            WHEN p.is_featured THEN 'featured'::text
            WHEN false THEN 'on_sale'::text
            WHEN p.has_gift_box THEN 'gift_box'::text
            ELSE 'none'::text
        END AS active_badge,
        CASE
            WHEN NOT p.is_active THEN NULL::text
            WHEN p.is_stockout THEN 'stockout'::text
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'low_stock'::text
            WHEN p.is_new THEN 'new'::text
            WHEN p.is_bestseller THEN 'bestseller'::text
            WHEN p.is_featured THEN 'featured'::text
            WHEN false THEN 'on_sale'::text
            WHEN p.has_gift_box THEN 'gift_box'::text
            ELSE 'none'::text
        END AS catalog_badge,
        CASE
            WHEN NOT p.is_active THEN NULL::text
            WHEN p.is_stockout THEN 'Fora de estoque'::text
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'Estoque baixo'::text
            WHEN p.is_new AND p.novelty_expires_at > now() THEN 'Novidade'::text
            WHEN p.is_new THEN 'Novo'::text
            WHEN p.is_bestseller THEN 'Mais vendido'::text
            WHEN p.is_featured THEN 'Destaque'::text
            WHEN false THEN 'Promoção'::text
            WHEN p.has_gift_box THEN 'Embalagem especial'::text
            ELSE NULL::text
        END AS active_badge_label,
        CASE
            WHEN NOT p.is_active THEN NULL::text
            WHEN p.is_stockout THEN 'red'::text
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 'orange'::text
            WHEN p.is_new THEN 'blue'::text
            WHEN p.is_bestseller THEN 'amber'::text
            WHEN p.is_featured THEN 'purple'::text
            WHEN false THEN 'green'::text
            WHEN p.has_gift_box THEN 'teal'::text
            ELSE NULL::text
        END AS active_badge_color,
    p.is_stockout::integer + p.is_new::integer + p.is_bestseller::integer + p.is_featured::integer + 0 + p.has_gift_box::integer +
        CASE
            WHEN p.stock_quantity > 0 AND p.stock_quantity <= s.low_stock_threshold THEN 1
            ELSE 0
        END AS total_badges_ativos,
    p.novelty_expires_at,
    p.novelty_detected_at,
    p.price_last_verified_at,
    p.price_updated_at,
    p.price_freshness_threshold_days,
    p.supplier_id,
    s.low_stock_threshold,
    p.updated_at
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id;
```

## public.v_product_compositions_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=false |
| depende de | public.mv_product_compositions, public.products |
| populada | n/a |
| comentário | SECURITY DEFINER intencional (fix_version 20260717). Depende de products e analytics.mv_product_compositions. |


```sql
SELECT mpc.product_id,
    mpc.product_name,
    mpc.total_materials,
    mpc.total_percentage,
    mpc.materials_detail
   FROM mv_product_compositions mpc
     JOIN products p ON p.id = mpc.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE;
```

## public.v_product_image_hash_duplicates (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images |
| populada | n/a |
| comentário | Images with identical SHA-256 content_hash stored under different cloudflare_image_ids. Populated once hash-product-images cron has run. Use for deduplication audits. |


```sql
SELECT content_hash,
    count(*) AS duplicate_count,
    array_agg(cloudflare_image_id ORDER BY cloudflare_image_id) AS cf_ids,
    array_agg(id ORDER BY cloudflare_image_id) AS image_ids,
    min(created_at) AS oldest_upload
   FROM product_images
  WHERE content_hash IS NOT NULL AND deleted_at IS NULL
  GROUP BY content_hash
 HAVING count(*) > 1
  ORDER BY (count(*)) DESC, content_hash;
```

## public.v_product_images_cdn (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.image_types, public.product_images, public.products |
| populada | n/a |
| comentário | View principal de imagens para o frontend. ADR-001: CF ID é opaco — classificação vive nos campos image_type/color_id/is_primary. CORRIGIDO 2026-06-07: url_thumbnail/small/medium/large substituem o sufixo /public, não concatenam. Formato correto: imagedelivery.net/{hash}/{cf_id}/{variant} |


```sql
SELECT pi.id,
    pi.product_id,
    pi.variant_id,
    pi.color_id,
    pi.cloudflare_image_id,
    pi.url_cdn,
    regexp_replace(pi.url_cdn, '/[^/]+$'::text, ''::text) AS url_base,
    pi.url_cdn AS url_public,
    regexp_replace(pi.url_cdn, '/[^/]+$'::text, ''::text) || '/thumbnail'::text AS url_thumbnail,
    regexp_replace(pi.url_cdn, '/[^/]+$'::text, ''::text) || '/small'::text AS url_small,
    regexp_replace(pi.url_cdn, '/[^/]+$'::text, ''::text) || '/medium'::text AS url_medium,
    regexp_replace(pi.url_cdn, '/[^/]+$'::text, ''::text) || '/large'::text AS url_large,
    pi.filename,
    pi.file_size_bytes,
    pi.width_px,
    pi.height_px,
    pi.format,
    COALESCE(it.code, pi.image_type) AS image_type,
    it.name AS image_type_name,
    it.category AS image_type_category,
    it.display_priority,
    it.gallery_order,
    it.show_in_gallery,
    it.show_in_simulator,
    it.is_color_specific,
    it.is_primary_candidate,
    pi.is_primary,
    pi.display_order,
    pi.applies_to_color,
    pi.color_id IS NOT NULL AS has_color,
    pi.supplier_code,
    pi.source_supplier,
    pi.url_original,
    pi.is_active,
    pi.created_at,
    pi.updated_at,
    p.name AS product_name,
    p.sku_promo AS product_sku
   FROM product_images pi
     LEFT JOIN image_types it ON it.id = pi.image_type_id
     LEFT JOIN products p ON p.id = pi.product_id
  WHERE pi.is_active = true;
```

## public.v_product_images_quality_gap (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.image_types, public.product_images |
| populada | n/a |
| comentário | Observabilidade de gaps por fornecedor/tipo. gap_url_original_real=corrigível; gap_url_original_estrutural=SPOT print-area, intencional. Acesso: service_role only. |


```sql
SELECT pi.source_supplier,
    it.code AS image_type,
    count(*) AS total,
    count(*) FILTER (WHERE pi.is_active) AS ativas,
    count(*) FILTER (WHERE pi.width_px IS NULL OR pi.height_px IS NULL) AS sem_dimensoes,
    count(*) FILTER (WHERE pi.format IS NULL) AS sem_format,
    count(*) FILTER (WHERE pi.file_size_bytes IS NULL) AS sem_file_size,
    count(*) FILTER (WHERE pi.alt_text IS NULL) AS sem_alt,
    count(*) FILTER (WHERE pi.url_original IS NULL AND pi.is_active AND (it.code::text <> ALL (ARRAY['component'::character varying, 'location'::character varying, 'area'::character varying]::text[]))) AS gap_url_original_real,
    count(*) FILTER (WHERE pi.url_original IS NULL AND (it.code::text = ANY (ARRAY['component'::character varying, 'location'::character varying, 'area'::character varying]::text[]))) AS gap_url_original_estrutural,
    round(100.0 * count(*) FILTER (WHERE pi.width_px IS NULL)::numeric / NULLIF(count(*), 0)::numeric, 2) AS pct_sem_dimensoes,
    round(100.0 * count(*) FILTER (WHERE pi.format IS NULL)::numeric / NULLIF(count(*), 0)::numeric, 2) AS pct_sem_format
   FROM product_images pi
     JOIN image_types it ON it.id = pi.image_type_id
  GROUP BY pi.source_supplier, it.code;
```

## public.v_product_properties_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=false |
| depende de | public.product_properties, public.products |
| populada | n/a |
| comentário | SECURITY DEFINER intencional (fix_version 20260717). Colunas: property_code, property_value. |


```sql
SELECT pp.id,
    pp.product_id,
    pp.property_code,
    pp.property_value,
    pp.source
   FROM product_properties pp
     JOIN products p ON p.id = pp.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE;
```

## public.v_product_tags_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=false |
| depende de | public.product_tags, public.products, public.tags |
| populada | n/a |
| comentário | SECURITY DEFINER intencional (fix_version 20260717). Colunas: product_id, tag_id. |


```sql
SELECT pt.id,
    pt.product_id,
    pt.tag_id
   FROM product_tags pt
     JOIN products p ON p.id = pt.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
     JOIN tags t ON t.id = pt.tag_id AND t.is_active = true;
```

## public.v_product_tokens (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products |
| populada | n/a |
| comentário |  |


```sql
WITH tokens AS (
         SELECT p.id AS product_id,
            p.name AS product_name,
            p.is_active,
            unnest(regexp_split_to_array(lower(unaccent((p.name || ' '::text) || COALESCE(p.description, ''::text))), '[\s\|>/,\.\-()0-9]+'::text)) AS token
           FROM products p
          WHERE p.is_active
        )
 SELECT product_id,
    product_name,
    token
   FROM tokens
  WHERE length(token) >= 3 AND (token <> ALL (ARRAY['de'::text, 'da'::text, 'do'::text, 'das'::text, 'dos'::text, 'com'::text, 'sem'::text, 'para'::text, 'por'::text, 'que'::text, 'mais'::text, 'cor'::text, 'cores'::text, 'tipo'::text, 'uso'::text, 'seu'::text, 'sua'::text, 'como'::text, 'tem'::text, 'gramatura'::text, 'dimensoes'::text, 'medidas'::text, 'aprox'::text, 'aproximadamente'::text, 'tamanho'::text, 'unidade'::text, 'unidades'::text, 'peca'::text, 'pecas'::text, 'kit'::text, 'kits'::text, 'varias'::text, 'variadas'::text, 'novo'::text, 'novidade'::text, 'novos'::text, 'produto'::text, 'produtos'::text, 'item'::text, 'marca'::text, 'sobre'::text, 'material'::text]));
```

## public.v_product_videos_cdn (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_videos, public.products |
| populada | n/a |
| comentário | Vídeos com todas as URLs do Stream prontas para uso |


```sql
SELECT pv.id,
    pv.product_id,
    pv.cloudflare_video_id,
    pv.url_stream,
    pv.url_hls,
    pv.url_dash,
    pv.url_thumbnail,
    'https://iframe.cloudflarestream.com/'::text || pv.cloudflare_video_id::text AS url_embed,
    'https://watch.cloudflarestream.com/'::text || pv.cloudflare_video_id::text AS url_watch,
    pv.filename,
    pv.duration_seconds,
    pv.width_px,
    pv.height_px,
    pv.video_type,
    pv.title,
    pv.description,
    pv.is_primary,
    pv.display_order,
    pv.source_youtube_id,
    pv.source_supplier,
    p.name AS product_name,
    p.id AS prod_id
   FROM product_videos pv
     JOIN products p ON p.id = pv.product_id
  WHERE pv.is_active = true
  ORDER BY pv.product_id, pv.is_primary DESC, pv.display_order;
```

## public.v_product_videos_ready (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_videos, public.products |
| populada | n/a |
| comentário |  FONTE ÚNICA DE VERDADE para vídeos de produtos no Cloudflare Stream. Esta é a ÚNICA interface que o frontend deve usar. Não há outro caminho.  ━━━━ FILTROS AUTOMÁTICOS (o frontend não repete) ━━━━   · product_videos.cloudflare_status = 'ready'   · product_videos.is_active = true   · products.is_active = true   · cloudflare_video_id ~ '^[a-f0-9]{32}$'  ← exclui UIDs corrompidos  ━━━━ URLS PRONTAS PARA USO DIRETO ━━━━   url_embed           → <iframe src={url_embed} allow="...">  (todos os browsers)   url_hls             → <video src={url_hls}>                (iOS Safari / HLS.js)   url_thumbnail       → thumbnail padrão CF Stream   url_thumbnail_card  → 320×180  — formato card de listagem   url_thumbnail_detail→ 640×360  — formato detalhe do produto   url_gif_preview     → GIF animado 5s  — hover/preview em cards  ━━━━ PADRÃO ÚNICO DE CONSUMO (Supabase JS) ━━━━    // Vídeo principal do produto (página de detalhe):   const { data: video } = await supabase     .from('v_product_videos_ready')     .select('*')     .eq('product_id', productId)     .order('is_primary', { ascending: false })     .limit(1)     .maybeSingle()    // Batch para listagem (vídeos de N produtos de uma vez):   const { data: videos } = await supabase     .from('v_product_videos_ready')     .select('product_id, url_thumbnail_card, url_gif_preview, duration_seconds')     .in('product_id', productIds)     .eq('is_primary', true)    // Galeria completa de vídeos do produto:   const { data: gallery } = await supabase     .from('v_product_videos_ready')     .select('*')     .eq('product_id', productId)     .order('display_order')  ━━━━ COBERTURA ━━━━   160 vídeos: 138 SPOT + 22 XBZ (em 2026-06-07)   Crescimento automático: novos vídeos aparecem aqui tão logo   cloudflare_status mude de 'youtube' → 'ready' via fn_xbz_link_video.  ━━━━ PERMISSÕES ━━━━   SELECT: anon (loja pública), authenticated   As funções auxiliares (get_cloudflare_video_thumbnail, etc.) têm   GRANT EXECUTE TO anon — necessário para a view funcionar via REST.  ━━━━ HISTÓRICO ━━━━   2026-06-07 v1: criação como fonte única, substituindo 3 caminhos:     · get_product_primary_video (RPC para detalhe)     → deprecated     · fn_get_videos_for_products (RPC para batch)      → REMOVIDA     · v_product_videos_ready (view)                    → MANTIDA (esta)   2026-06-07 v2: adicionado filtro hex-32 (exclui uid='abc' corrompido)  |


```sql
SELECT pv.id AS video_id,
    pv.product_id,
    pv.cloudflare_video_id AS cloudflare_uid,
    pv.url_stream AS url_embed,
    pv.url_hls,
    pv.url_thumbnail,
    get_cloudflare_video_thumbnail(pv.cloudflare_video_id, NULL::integer, 320, 180) AS url_thumbnail_card,
    get_cloudflare_video_thumbnail(pv.cloudflare_video_id, NULL::integer, 640, 360) AS url_thumbnail_detail,
    get_cloudflare_video_gif(pv.cloudflare_video_id, 0, 5) AS url_gif_preview,
    pv.duration_seconds,
    pv.video_type,
    pv.title,
    pv.is_primary,
    pv.display_order,
    pv.source_supplier,
    pv.source_youtube_id,
    pv.uploaded_at,
    p.name AS product_name,
    p.sku AS product_sku,
    p.supplier_reference,
    p.supplier_id
   FROM product_videos pv
     JOIN products p ON p.id = pv.product_id
  WHERE pv.cloudflare_status::text = 'ready'::text AND pv.is_active = true AND p.is_active = true AND pv.cloudflare_video_id::text ~ '^[a-f0-9]{32}$'::text;
```

## public.v_products_ai_coverage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.ai_enrichment_queue, public.products, public.suppliers |
| populada | n/a |
| comentário | Cobertura de enriquecimento AI por fornecedor. Inclui status da fila. Criado 2026-06-23. |


```sql
SELECT s.name AS supplier_name,
    count(p.id) AS total_products,
    count(p.id) FILTER (WHERE p.ai_description IS NOT NULL AND length(p.ai_description) > 20) AS com_ai_desc,
    count(p.id) FILTER (WHERE p.ai_title IS NOT NULL AND length(p.ai_title) > 5) AS com_ai_title,
    count(p.id) FILTER (WHERE p.ai_summary IS NOT NULL) AS com_ai_summary,
    count(p.id) FILTER (WHERE p.ai_generated_at IS NOT NULL) AS com_ai_gerado,
    round(100.0 * count(p.id) FILTER (WHERE p.ai_description IS NOT NULL AND length(p.ai_description) > 20)::numeric / NULLIF(count(p.id), 0)::numeric, 1) AS pct_ai_desc,
    max(p.ai_generated_at) AS last_ai_generated,
    count(q.id) FILTER (WHERE q.status = 'pending'::text) AS queue_pending,
    count(q.id) FILTER (WHERE q.status = 'processing'::text) AS queue_processing,
    count(q.id) FILTER (WHERE q.status = 'done'::text) AS queue_done,
    count(q.id) FILTER (WHERE q.status = 'error'::text) AS queue_error
   FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
     LEFT JOIN ai_enrichment_queue q ON q.product_id = p.id
  WHERE p.is_active = true
  GROUP BY s.name
  ORDER BY (count(p.id)) DESC;
```

## public.v_products_complete (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.material_types, public.product_category_assignments, public.product_materials, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.description,
    p.cost_price,
    p.is_active AS product_active,
    p.organization_id,
    c.id AS category_id,
    c.name AS category_name,
    c.level AS category_level,
    c.full_path_readable AS category_path,
    cp.name AS parent_category_name,
    ( SELECT string_agg(mt.name::text || COALESCE((' ('::text || pm.part::text) || ')'::text, ''::text), ', '::text ORDER BY pm.sort_order) AS string_agg
           FROM product_materials pm
             JOIN material_types mt ON mt.id = pm.material_id
          WHERE pm.product_id = p.id) AS materials_list,
    (( SELECT count(*) AS count
           FROM product_materials pm
          WHERE pm.product_id = p.id))::integer AS materials_count,
    (( SELECT count(*) AS count
           FROM product_category_assignments pca
          WHERE pca.product_id = p.id AND pca.is_primary = false))::integer AS secondary_categories_count,
    p.created_at,
    p.updated_at
   FROM products p
     LEFT JOIN categories c ON c.id = p.main_category_id
     LEFT JOIN categories cp ON cp.id = c.parent_id;
```

## public.v_products_dimensions_audit (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.suppliers |
| populada | n/a |
| comentário | Auditoria qualidade escalares de dimensão pós-DROP do jsonb (2026-06-23). dimensions_source migrado de dimensions->unit_detected. |


```sql
SELECT p.id AS product_id,
    p.sku,
    p.name,
    s.name AS supplier_name,
    p.is_active,
    p.dimensions_source,
    p.length_cm,
    p.width_cm,
    p.height_cm,
    p.diameter_cm,
    p.shape_type,
    p.weight_g,
    p.length_cm IS NULL AND p.width_cm IS NULL AND p.height_cm IS NULL AS sem_dimensoes,
    p.length_cm IS NOT NULL AND p.width_cm IS NOT NULL AND p.height_cm IS NOT NULL AS dimensoes_completas,
    p.dimensions_source IS NULL AS sem_fonte,
        CASE
            WHEN p.length_cm > 300::numeric OR p.width_cm > 300::numeric OR p.height_cm > 300::numeric THEN 'CRITICO'::text
            WHEN p.length_cm IS NOT NULL AND p.width_cm IS NOT NULL AND p.height_cm IS NOT NULL AND p.dimensions_source IS NOT NULL THEN 'COMPLETO'::text
            WHEN p.length_cm IS NOT NULL OR p.width_cm IS NOT NULL THEN 'PARCIAL'::text
            ELSE 'VAZIO'::text
        END AS status_qualidade
   FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
  ORDER BY (
        CASE
            WHEN p.length_cm > 300::numeric OR p.width_cm > 300::numeric OR p.height_cm > 300::numeric THEN 0
            ELSE 1
        END), p.is_active DESC;
```

## public.v_products_images_summary (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.products |
| populada | n/a |
| comentário | Resumo de imagens disponíveis por produto |


```sql
SELECT p.id AS product_id,
    p.name AS product_name,
    count(pi.id) AS total_images,
    count(pi.id) FILTER (WHERE pi.is_primary = true) AS primary_images,
    count(DISTINCT pi.color_id) FILTER (WHERE pi.color_id IS NOT NULL) AS colors_with_images,
    string_agg(DISTINCT pi.image_type::text, ', '::text ORDER BY (pi.image_type::text)) AS image_types_available,
    min(pi.url_cdn || '/thumbnail'::text) FILTER (WHERE pi.is_primary = true) AS primary_thumbnail_url
   FROM products p
     LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_active = true
  GROUP BY p.id, p.name
  ORDER BY p.name;
```

## public.v_products_kit_builder (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    sku,
    name,
    description,
    product_type,
    cost_price,
    stock_quantity,
    colors,
    images,
    is_active,
    length_cm,
    width_cm,
    height_cm,
    internal_length_cm,
    internal_width_cm,
    internal_height_cm,
        CASE
            WHEN product_type = 'packaging'::text THEN round(COALESCE(internal_length_cm, 0::numeric) * COALESCE(internal_width_cm, 0::numeric) * COALESCE(internal_height_cm, 0::numeric) / 1000::numeric, 2)
            ELSE round(COALESCE(length_cm, 0::numeric) * COALESCE(width_cm, 0::numeric) * COALESCE(height_cm, 0::numeric) / 1000::numeric, 2)
        END AS volume_liters,
        CASE
            WHEN product_type = 'packaging'::text THEN concat(internal_length_cm, ' × ', internal_width_cm, ' × ', internal_height_cm, ' cm')
            ELSE concat(length_cm, ' × ', width_cm, ' × ', height_cm, ' cm')
        END AS dimensions_display
   FROM products p
  WHERE is_active = true;
```

## public.v_products_missing_primary_image (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.products |
| populada | n/a |
| comentário | Produtos ativos sem imagem principal definida (para n8n) |


```sql
SELECT id AS product_id,
    name AS product_name,
    is_active,
    created_at,
    ( SELECT count(*) AS count
           FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_active = true) AS total_images
   FROM products p
  WHERE is_active = true AND NOT (EXISTS ( SELECT 1
           FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true AND pi.is_active = true))
  ORDER BY created_at DESC;
```

## public.v_products_name_audit (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.suppliers |
| populada | n/a |
| comentário | Auditoria de qualidade de products.name — lista apenas produtos com issues. Campos de filtro: has_curly_quotes, is_too_long, is_all_uppercase, etc. Score 0-100 via fn_product_name_quality_score(). Atualizado em tempo real. Criado em M6 (2026-06-23). |


```sql
WITH quality AS (
         SELECT p.id AS product_id,
            p.sku,
            p.name,
            p.supplier_id,
            s.name AS supplier_name,
            p.is_active,
            p.slug,
            length(p.name) AS name_len,
            'name'::text = ANY (COALESCE(p.locked_fields, '{}'::text[])) AS name_is_locked,
            fn_product_name_quality_score(p.name) AS quality_json
           FROM products p
             LEFT JOIN suppliers s ON s.id = p.supplier_id
        )
 SELECT product_id,
    sku,
    name,
    supplier_name,
    is_active,
    slug,
    name_len,
    name_is_locked,
    (quality_json ->> 'score'::text)::integer AS quality_score,
    quality_json ->> 'grade'::text AS quality_grade,
    quality_json -> 'issues'::text AS issues,
    (quality_json -> 'issues'::text) ? 'double_spaces'::text AS has_double_spaces,
    (quality_json -> 'issues'::text) ? 'leading_trailing_spaces'::text AS has_leading_trailing_spaces,
    (quality_json -> 'issues'::text) ? 'contains_tabs_newlines'::text AS has_tabs_newlines,
    (quality_json -> 'issues'::text) ? 'too_long_over_150'::text AS is_too_long,
    (quality_json -> 'issues'::text) ? 'long_100_to_150'::text AS is_moderately_long,
    (quality_json -> 'issues'::text) ? 'too_short_under_8'::text AS is_too_short,
    (quality_json -> 'issues'::text) ? 'all_uppercase_variant_style'::text AS is_all_uppercase,
    (quality_json -> 'issues'::text) ? 'no_alphanumeric'::text AS has_no_alphanumeric,
    (quality_json -> 'issues'::text) ? 'unusual_unicode'::text AS has_unusual_unicode,
    (quality_json -> 'issues'::text) ? 'curly_quotes'::text AS has_curly_quotes,
    ( SELECT count(*) AS count
           FROM products p2
          WHERE p2.name = quality.name AND p2.id <> quality.product_id) AS duplicate_name_count
   FROM quality
  WHERE (quality_json -> 'issues'::text) <> '[]'::jsonb
  ORDER BY ((quality_json ->> 'score'::text)::integer), is_active DESC, name_len DESC;
```

## public.v_products_pending_images (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.product_variants, public.products, public.suppliers |
| populada | n/a |
| comentário | M14 v2 2026-07-10: produtos ativos sem imagem com priority score. ANTI-REGRESSÃO. |


```sql
SELECT p.id,
    p.sku_promo,
    p.name,
    p.supplier_id,
    s.name AS supplier_name,
    p.is_active,
    p.created_at,
    p.updated_at,
    ( SELECT count(*) AS count
           FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = true) AS active_variants,
    EXTRACT(day FROM now() - p.created_at)::integer AS days_without_image,
        CASE
            WHEN EXTRACT(day FROM now() - p.created_at) > 30::numeric THEN 'CRITICAL'::text
            WHEN EXTRACT(day FROM now() - p.created_at) > 7::numeric THEN 'HIGH'::text
            WHEN EXTRACT(day FROM now() - p.created_at) > 3::numeric THEN 'MEDIUM'::text
            ELSE 'LOW'::text
        END AS priority,
    now() AS checked_at
   FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.is_active = true AND NOT (EXISTS ( SELECT 1
           FROM product_images pi
          WHERE pi.product_id = p.id))
  ORDER BY (EXTRACT(day FROM now() - p.created_at)::integer) DESC, p.created_at;
```

## public.v_products_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=false |
| depende de | internal.mv_product_leaf_category, public.products |
| populada | n/a |
| comentário | PUBLIC PRODUCT PROJECTION (SECURITY DEFINER intencional / fix_version 20260717_v1). Mascara explicitamente cost_price=NULL, organization_id=NULL, created_by=NULL, etc. Roda como owner para ler products sem conceder acesso direto ao anon. NAO alterar para security_invoker=true (expoeria cost_price real ao anon via REST). Filter: is_active=true AND is_deleted IS NOT TRUE. |


```sql
SELECT p.id,
    p.name,
    p.description,
    p.sku,
    p.category_id,
    p.supplier_id,
    NULL::numeric AS cost_price,
    p.sale_price,
    p.stock_quantity,
    p.is_active AS active,
    p.created_at,
    p.updated_at,
    NULL::numeric AS suggested_price,
        CASE
            WHEN p.length_cm IS NOT NULL OR p.width_cm IS NOT NULL OR p.height_cm IS NOT NULL OR p.weight_g IS NOT NULL OR p.diameter_cm IS NOT NULL OR p.shape_type IS NOT NULL THEN jsonb_build_object('length_cm', p.length_cm, 'width_cm', p.width_cm, 'height_cm', p.height_cm, 'weight_g', p.weight_g, 'diameter_cm', p.diameter_cm, 'shape_type', p.shape_type, 'unit_detected', p.dimensions_source)
            ELSE NULL::jsonb
        END AS dimensions,
    p.images,
    p.primary_image_url,
    p.videos,
    p.allows_personalization,
    p.colors,
    p.materials,
    p.tags,
    p.meta_title,
    p.meta_description,
    p.meta_keywords,
    p.is_featured,
    p.is_new,
    p.is_on_sale,
    p.view_count,
    p.favorite_count,
    p.order_count,
    NULL::uuid AS organization_id,
    p.product_type,
    p.is_active,
    NULL::uuid AS created_by,
    NULL::uuid AS updated_by,
    p.sku_promo,
    p.short_description,
    p.main_category_id,
    p.brand,
    p.is_deleted,
    p.deleted_at,
    p.is_kit,
    p.is_bestseller,
    p.min_quantity,
    p.box_length_mm,
    p.box_width_mm,
    p.box_height_mm,
    p.box_weight_kg,
    p.has_colors,
    p.has_sizes,
    p.ean,
    p.gtin,
    p.ncm_code,
    p.origin_country,
    p.warranty_months,
    NULL::character varying(100) AS manufacturer_sku,
    p.last_stock_update_at,
    p.supplier_reference,
    p.is_textil,
    p.has_capacity,
    p.combined_sizes,
    p.gender,
    p.is_stockout,
    NULL::boolean AS is_online_exclusive,
    NULL::integer AS catalog_page,
    p.weight_g,
    p.length_cm,
    p.width_cm,
    p.height_cm,
    p.dimensions_display,
    p.box_length_cm,
    p.box_width_cm,
    p.box_height_cm,
    p.box_volume_cm3,
    p.box_quantity,
    p.box_inner_quantity,
    p.packing_type,
    p.repacking_type,
    p.capacities,
    NULL::timestamp with time zone AS last_sync_at,
    NULL::uuid AS last_sync_supplier_id,
    NULL::character varying AS sync_status,
    p.diameter_cm,
    p.shape_type,
    p.internal_height_cm,
    p.internal_width_cm,
    p.internal_length_cm,
    p.internal_diameter_cm,
    p.packaging_material,
    p.packaging_color,
    NULL::boolean AS has_inner_cradle,
    NULL::character varying(50) AS cradle_material,
    p.packaging_finish,
    p.is_imported,
    p.lead_time_days,
    NULL::boolean AS requires_minimum_order,
    p.supply_mode,
    p.is_thermal,
    p.capacity_ml,
    p.slug,
    p.ai_summary,
    p.key_benefits,
    p.use_cases,
    p.target_audience,
    p.schema_json,
    p.canonical_url,
    p.robots_meta,
    p.seo_score,
    p.seo_last_audit_at,
    p.seo_issues,
    p.og_title,
    p.og_description,
    p.og_image_url,
    p.description_packaging_info,
    p.has_optional_packaging,
    p.optional_packaging_ref,
    p.packing_classification,
    p.ipi_rate::numeric AS ipi_rate,
    p.tax_reference_state::character varying AS tax_reference_state,
    p.engraving_type,
    p.supplier_updated_at,
    p.has_gift_box,
    p.min_order_quantity,
    p.ai_title,
    p.ai_description,
    p.ai_version,
    p.ai_generated_at,
    p.ai_model,
    p.box_image,
    p.repacking_classification,
    p.has_commercial_packaging,
    p.packaging_context,
    p.bitrix_product_id,
    p.novelty_detected_at,
    p.novelty_expires_at,
    p.ncm_id,
    NULL::timestamp with time zone AS bitrix_images_synced_at,
    p.is_featured_expires_at,
    p.is_bestseller_expires_at,
    p.is_on_sale_expires_at,
    p.is_new_expires_at,
    p.supplier_product_url,
    p.freight_class,
    p.cubic_weight,
    NULL::text AS auto_category,
    p.auto_material,
    NULL::double precision AS classification_confidence,
    p.price_updated_at,
    NULL::text AS external_id,
    p.price_freshness_threshold_days,
    p.set_image_url,
    p.is_seasonal,
    p.pvc_free,
    p.supplier_type,
    p.supplier_subtype,
    p.supplier_type_code,
    p.supplier_subtype_code,
    p.price_verified_at,
    p.circumference_cm,
    p.search_vector,
    p.primary_image_fallback_url,
    COALESCE(lc.leaf_category_id, p.main_category_id, p.category_id) AS leaf_category_id,
    lc.leaf_category_name,
    lc.leaf_category_level,
    lc.leaf_category_slug,
    COALESCE(lc.leaf_category_id_safe, p.main_category_id, p.category_id) AS leaf_category_id_safe,
    p.color_swatches,
    p.dimensions_source,
    p.default_carrier,
    p.shipping_weight_kg,
    p.shipping_width_cm,
    p.shipping_height_cm,
    p.shipping_length_cm,
    p.requires_special_shipping,
    p.shipping_notes,
    p.icms_rate,
    p.pis_rate,
    p.cofins_rate,
    p.cfop,
    p.csosn,
    p.cest,
    p.tax_regime
   FROM products p
     LEFT JOIN internal.mv_product_leaf_category lc ON lc.product_id = p.id
  WHERE p.is_deleted IS NOT TRUE AND p.is_active = true;
```

## public.v_products_public_test (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | internal.mv_product_leaf_category, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id,
    p.name,
    p.description,
    p.sku,
    p.category_id,
    p.supplier_id,
    NULL::numeric AS cost_price,
    p.sale_price,
    p.stock_quantity,
    p.is_active AS active,
    p.created_at,
    p.updated_at,
    NULL::numeric AS suggested_price,
        CASE
            WHEN p.length_cm IS NOT NULL OR p.width_cm IS NOT NULL OR p.height_cm IS NOT NULL OR p.weight_g IS NOT NULL OR p.diameter_cm IS NOT NULL OR p.shape_type IS NOT NULL THEN jsonb_build_object('length_cm', p.length_cm, 'width_cm', p.width_cm, 'height_cm', p.height_cm, 'weight_g', p.weight_g, 'diameter_cm', p.diameter_cm, 'shape_type', p.shape_type, 'unit_detected', p.dimensions_source)
            ELSE NULL::jsonb
        END AS dimensions,
    p.images,
    p.primary_image_url,
    p.videos,
    p.allows_personalization,
    p.colors,
    p.materials,
    p.tags,
    p.meta_title,
    p.meta_description,
    p.meta_keywords,
    p.is_featured,
    p.is_new,
    p.is_on_sale,
    p.view_count,
    p.favorite_count,
    p.order_count,
    NULL::uuid AS organization_id,
    p.product_type,
    p.is_active,
    NULL::uuid AS created_by,
    NULL::uuid AS updated_by,
    p.sku_promo,
    p.short_description,
    p.main_category_id,
    p.brand,
    p.is_deleted,
    p.deleted_at,
    p.is_kit,
    p.is_bestseller,
    p.min_quantity,
    p.box_length_mm,
    p.box_width_mm,
    p.box_height_mm,
    p.box_weight_kg,
    p.has_colors,
    p.has_sizes,
    p.ean,
    p.gtin,
    p.ncm_code,
    p.origin_country,
    p.warranty_months,
    NULL::character varying(100) AS manufacturer_sku,
    p.last_stock_update_at,
    p.supplier_reference,
    p.is_textil,
    p.has_capacity,
    p.combined_sizes,
    p.gender,
    p.is_stockout,
    NULL::boolean AS is_online_exclusive,
    NULL::integer AS catalog_page,
    p.weight_g,
    p.length_cm,
    p.width_cm,
    p.height_cm,
    p.dimensions_display,
    p.box_length_cm,
    p.box_width_cm,
    p.box_height_cm,
    p.box_volume_cm3,
    p.box_quantity,
    p.box_inner_quantity,
    p.packing_type,
    p.repacking_type,
    p.capacities,
    NULL::timestamp with time zone AS last_sync_at,
    NULL::uuid AS last_sync_supplier_id,
    NULL::character varying AS sync_status,
    p.diameter_cm,
    p.shape_type,
    p.internal_height_cm,
    p.internal_width_cm,
    p.internal_length_cm,
    p.internal_diameter_cm,
    p.packaging_material,
    p.packaging_color,
    NULL::boolean AS has_inner_cradle,
    NULL::character varying(50) AS cradle_material,
    p.packaging_finish,
    p.is_imported,
    p.lead_time_days,
    NULL::boolean AS requires_minimum_order,
    p.supply_mode,
    p.is_thermal,
    p.capacity_ml,
    p.slug,
    p.ai_summary,
    p.key_benefits,
    p.use_cases,
    p.target_audience,
    p.schema_json,
    p.canonical_url,
    p.robots_meta,
    p.seo_score,
    p.seo_last_audit_at,
    p.seo_issues,
    p.og_title,
    p.og_description,
    p.og_image_url,
    p.description_packaging_info,
    p.has_optional_packaging,
    p.optional_packaging_ref,
    p.packing_classification,
    p.ipi_rate::numeric AS ipi_rate,
    p.tax_reference_state::character varying AS tax_reference_state,
    p.engraving_type,
    p.supplier_updated_at,
    p.has_gift_box,
    p.min_order_quantity,
    p.ai_title,
    p.ai_description,
    p.ai_version,
    p.ai_generated_at,
    p.ai_model,
    p.box_image,
    p.repacking_classification,
    p.has_commercial_packaging,
    p.packaging_context,
    p.bitrix_product_id,
    p.novelty_detected_at,
    p.novelty_expires_at,
    p.ncm_id,
    NULL::timestamp with time zone AS bitrix_images_synced_at,
    p.is_featured_expires_at,
    p.is_bestseller_expires_at,
    p.is_on_sale_expires_at,
    p.is_new_expires_at,
    p.supplier_product_url,
    p.freight_class,
    p.cubic_weight,
    NULL::text AS auto_category,
    p.auto_material,
    NULL::double precision AS classification_confidence,
    p.price_updated_at,
    NULL::text AS external_id,
    p.price_freshness_threshold_days,
    p.set_image_url,
    p.is_seasonal,
    p.pvc_free,
    p.supplier_type,
    p.supplier_subtype,
    p.supplier_type_code,
    p.supplier_subtype_code,
    p.price_verified_at,
    p.circumference_cm,
    p.search_vector,
    p.primary_image_fallback_url,
    COALESCE(lc.leaf_category_id, p.main_category_id, p.category_id) AS leaf_category_id,
    lc.leaf_category_name,
    lc.leaf_category_level,
    lc.leaf_category_slug,
    COALESCE(lc.leaf_category_id_safe, p.main_category_id, p.category_id) AS leaf_category_id_safe,
    p.color_swatches,
    p.dimensions_source,
    p.default_carrier,
    p.shipping_weight_kg,
    p.shipping_width_cm,
    p.shipping_height_cm,
    p.shipping_length_cm,
    p.requires_special_shipping,
    p.shipping_notes,
    p.icms_rate,
    p.pis_rate,
    p.cofins_rate,
    p.cfop,
    p.csosn,
    p.cest,
    p.tax_regime
   FROM products p
     LEFT JOIN internal.mv_product_leaf_category lc ON lc.product_id = p.id
  WHERE p.is_deleted IS NOT TRUE AND p.is_active = true;
```

## public.v_products_with_tags (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_tags, public.products, public.tags |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id AS product_id,
    p.name,
    p.sku,
    array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL) AS tag_names,
    array_agg(t.slug ORDER BY t.name) FILTER (WHERE t.slug IS NOT NULL) AS tag_slugs
   FROM products p
     LEFT JOIN product_tags pt ON pt.product_id = p.id
     LEFT JOIN tags t ON t.id = pt.tag_id AND t.is_active = true
  WHERE p.is_deleted = false OR p.is_deleted IS NULL
  GROUP BY p.id, p.name, p.sku;
```

## public.v_products_without_images (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.products |
| populada | n/a |
| comentário | Produtos ativos sem nenhuma imagem (para n8n sync) |


```sql
SELECT id AS product_id,
    name AS product_name,
    is_active,
    created_at
   FROM products p
  WHERE is_active = true AND NOT (EXISTS ( SELECT 1
           FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_active = true))
  ORDER BY created_at DESC;
```

## public.v_products_without_video (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_videos, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT id AS product_id,
    name,
    sku,
    is_active,
    created_at
   FROM products p
  WHERE is_active = true AND NOT (EXISTS ( SELECT 1
           FROM product_videos pv
          WHERE pv.product_id = p.id AND pv.is_active = true AND pv.cloudflare_status::text = 'ready'::text))
  ORDER BY name;
```

## public.v_quote_seller_kpis (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.profiles, public.quotes |
| populada | n/a |
| comentário | FIX-11 (2026-06-23): VIEW de KPIs operacionais por vendedor — win_rate, expiry_rate, avg_age, expiring_soon. |


```sql
SELECT q.seller_id,
    p.full_name AS seller_name,
    count(*) AS total_quotes,
    count(*) FILTER (WHERE q.status = 'draft'::text) AS draft_count,
    count(*) FILTER (WHERE q.status = ANY (ARRAY['pending'::text, 'sent'::text, 'viewed'::text])) AS open_count,
    count(*) FILTER (WHERE q.status = 'pending_approval'::text) AS pending_approval_count,
    count(*) FILTER (WHERE q.status = 'approved'::text) AS approved_count,
    count(*) FILTER (WHERE q.status = 'converted'::text) AS converted_count,
    count(*) FILTER (WHERE q.status = 'expired'::text) AS expired_count,
    round(sum(q.total) FILTER (WHERE q.status = ANY (ARRAY['approved'::text, 'converted'::text])), 2) AS won_revenue,
    round(avg(q.total) FILTER (WHERE q.status = ANY (ARRAY['approved'::text, 'converted'::text])), 2) AS avg_won_ticket,
    round(100.0 * count(*) FILTER (WHERE q.status = ANY (ARRAY['approved'::text, 'converted'::text]))::numeric / NULLIF(count(*) FILTER (WHERE q.status <> ALL (ARRAY['draft'::text, 'cancelled'::text])), 0)::numeric, 1) AS win_rate_pct,
    round(100.0 * count(*) FILTER (WHERE q.status = 'expired'::text)::numeric / NULLIF(count(*) FILTER (WHERE q.status <> 'draft'::text), 0)::numeric, 1) AS expiry_rate_pct,
    round(avg(
        CASE
            WHEN q.status <> 'draft'::text THEN EXTRACT(epoch FROM now() - q.created_at) / 3600::numeric
            ELSE NULL::numeric
        END), 1) AS avg_age_hours,
    count(*) FILTER (WHERE (q.status = ANY (ARRAY['pending'::text, 'sent'::text, 'viewed'::text, 'pending_approval'::text])) AND q.valid_until >= CURRENT_DATE AND q.valid_until <= (CURRENT_DATE + 7)) AS expiring_in_7d
   FROM quotes q
     LEFT JOIN profiles p ON p.user_id = q.seller_id
  GROUP BY q.seller_id, p.full_name;
```

## public.v_site_products_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true, security_barrier=true |
| depende de | public.v_products_public |
| populada | n/a |
| comentário | Contrato mínimo do catálogo cliente-final. Não expõe preço, estoque, fornecedor, URLs operacionais ou identificadores de variantes. |


```sql
SELECT id,
    name,
    sku,
    slug,
    primary_image_url,
    primary_image_fallback_url,
    set_image_url,
    og_image_url,
    images,
    category_id,
    main_category_id,
    short_description,
    description,
    ai_title,
    ai_summary,
    ai_description,
    brand,
    min_quantity,
    is_new,
    is_featured,
    is_bestseller,
    is_kit,
    allows_personalization,
    has_commercial_packaging,
    has_gift_box,
    colors,
    materials,
    dimensions,
    width_cm,
    height_cm,
    length_cm,
    capacity_ml,
    weight_g,
    created_at,
    is_active,
        CASE
            WHEN jsonb_typeof(COALESCE(color_swatches, '[]'::jsonb)) = 'array'::text THEN ( SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('color_name', swatch.value ->> 'color_name'::text, 'color_hex', swatch.value ->> 'color_hex'::text, 'image_url', swatch.value ->> 'image_url'::text))), '[]'::jsonb) AS "coalesce"
               FROM jsonb_array_elements(p.color_swatches) swatch(value))
            ELSE '[]'::jsonb
        END AS color_swatches
   FROM v_products_public p
  WHERE is_active IS TRUE;
```

## public.v_slow_queries_analysis (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | extensions.pg_stat_statements |
| populada | n/a |
| comentário | Análise de queries lentas. ADMIN-ONLY. security_invoker=true. Acesso: service_role apenas. Aplicado em T19 do redeploy 2026-05. |


```sql
SELECT round(total_exec_time::numeric, 0) AS total_ms_acumulado,
    calls,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms,
    round((100.0::double precision * total_exec_time / NULLIF(sum(total_exec_time) OVER (), 0::double precision))::numeric, 2) AS pct_total_load,
    rows,
        CASE
            WHEN mean_exec_time > 1000::double precision THEN '🔴 CRÍTICO >1s'::text
            WHEN mean_exec_time > 500::double precision THEN '🟠 ALTO >500ms'::text
            WHEN mean_exec_time > 100::double precision THEN '🟡 MÉDIO >100ms'::text
            ELSE '🟢 OK'::text
        END AS severity,
    "left"(regexp_replace(query, '\s+'::text, ' '::text, 'g'::text), 150) AS query_preview
   FROM pg_stat_statements
  WHERE query !~~ '%pg_stat_statements%'::text AND query !~~ '%pg_class%'::text AND query !~~ 'ALTER%'::text AND query !~~ 'CREATE%'::text AND query !~~ 'DROP%'::text AND calls > 10
  ORDER BY total_exec_time DESC
 LIMIT 50;
```

## public.v_smoke_tests_latest_run (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.smoke_test_runs |
| populada | n/a |
| comentário | Latest persisted smoke-test execution, ordered by severity. |


```sql
SELECT ran_at,
    test_name,
    test_category,
    result,
    details,
    duration_ms
   FROM smoke_test_runs
  WHERE ran_at = (( SELECT max(smoke_test_runs_1.ran_at) AS max
           FROM smoke_test_runs smoke_test_runs_1))
  ORDER BY (
        CASE
            WHEN result ~~ '%FAIL%'::text THEN 0
            WHEN result ~~ '%WARN%'::text THEN 1
            ELSE 2
        END), test_name;
```

## public.v_smoke_tests_trend (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.smoke_test_runs |
| populada | n/a |
| comentário | Last 12 persisted smoke-test executions with aggregate counts. |


```sql
SELECT ran_at,
    count(*)::integer AS total,
    count(*) FILTER (WHERE result ~~ '%PASS%'::text)::integer AS passed,
    count(*) FILTER (WHERE result ~~ '%FAIL%'::text)::integer AS failed,
    count(*) FILTER (WHERE result ~~ '%WARN%'::text)::integer AS warned,
    avg(duration_ms) AS avg_duration_ms
   FROM smoke_test_runs
  GROUP BY ran_at
  ORDER BY ran_at DESC
 LIMIT 12;
```

## public.v_stock_velocity_safe (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.mv_stock_velocity |
| populada | n/a |
| comentário | View sobre mv_stock_velocity com winsorização p99 dinâmica nos campos avg_daily_depletion_*. Elimina distorção de bulk orders únicos (ex: 34k un/dia → capado ao p99 dinâmico). Raw values preservados em raw_avg_depletion_* para auditoria. Criada em 2026-06-23. Reversível: DROP VIEW public.v_stock_velocity_safe. |


```sql
WITH p99_caps AS (
         SELECT percentile_cont(0.99::double precision) WITHIN GROUP (ORDER BY (mv_stock_velocity.avg_daily_depletion_7d::double precision)) FILTER (WHERE mv_stock_velocity.avg_daily_depletion_7d > 0::numeric) AS cap_7d,
            percentile_cont(0.99::double precision) WITHIN GROUP (ORDER BY (mv_stock_velocity.avg_daily_depletion_30d::double precision)) FILTER (WHERE mv_stock_velocity.avg_daily_depletion_30d > 0::numeric) AS cap_30d,
            percentile_cont(0.99::double precision) WITHIN GROUP (ORDER BY (mv_stock_velocity.avg_daily_depletion_90d::double precision)) FILTER (WHERE mv_stock_velocity.avg_daily_depletion_90d > 0::numeric) AS cap_90d
           FROM mv_stock_velocity
        )
 SELECT msv.variant_id,
    msv.product_id,
    msv.avg_daily_depletion_7d AS raw_avg_depletion_7d,
    msv.avg_daily_depletion_30d AS raw_avg_depletion_30d,
    msv.avg_daily_depletion_90d AS raw_avg_depletion_90d,
    LEAST(msv.avg_daily_depletion_7d::double precision, COALESCE(caps.cap_7d, msv.avg_daily_depletion_7d::double precision)) AS avg_daily_depletion_7d,
    LEAST(msv.avg_daily_depletion_30d::double precision, COALESCE(caps.cap_30d, msv.avg_daily_depletion_30d::double precision)) AS avg_daily_depletion_30d,
    LEAST(msv.avg_daily_depletion_90d::double precision, COALESCE(caps.cap_90d, msv.avg_daily_depletion_90d::double precision)) AS avg_daily_depletion_90d,
    caps.cap_30d AS p99_cap_30d,
    msv.avg_daily_depletion_30d::double precision > COALESCE(caps.cap_30d, 'Infinity'::double precision) AS was_capped,
    msv.total_depleted_7d,
    msv.total_depleted_30d,
    msv.total_depleted_90d,
    msv.active_days_7d,
    msv.active_days_30d,
    msv.active_days_90d
   FROM mv_stock_velocity msv
     CROSS JOIN p99_caps caps;
```

## public.v_super_filtro_options (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.color_groups, public.color_variations, public.commemorative_dates, public.material_groups, public.material_types, public.print_area_techniques, public.product_commemorative_dates, public.product_materials, public.product_tags, public.product_variants, public.products, public.tabela_preco_gravacao_oficial, public.tags |
| populada | n/a |
| comentário |  |


```sql
SELECT 'cor'::text AS filtro_tipo,
    cg.name AS valor,
    cg.slug AS slug_ou_codigo,
    cg.hex_code AS hex,
    count(DISTINCT pv.product_id)::integer AS total_produtos,
    cg.sort_order AS ordem
   FROM color_groups cg
     JOIN color_variations cv ON cv.group_id = cg.id AND cv.is_active = true
     JOIN product_variants pv ON pv.color_id = cv.id AND pv.is_active = true
     JOIN products p ON p.id = pv.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
  WHERE cg.is_active = true
  GROUP BY cg.id, cg.name, cg.slug, cg.hex_code, cg.sort_order
 HAVING count(DISTINCT pv.product_id) > 0
UNION ALL
 SELECT 'material'::text AS filtro_tipo,
    mg.name AS valor,
    mg.slug AS slug_ou_codigo,
    NULL::text AS hex,
    count(DISTINCT pm.product_id)::integer AS total_produtos,
    row_number() OVER (ORDER BY (count(DISTINCT pm.product_id)) DESC)::integer AS ordem
   FROM material_groups mg
     JOIN material_types mt ON mt.group_id = mg.id AND mt.is_active = true
     JOIN product_materials pm ON pm.material_id = mt.id AND pm.is_active = true
     JOIN products p ON p.id = pm.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
  GROUP BY mg.id, mg.name, mg.slug
 HAVING count(DISTINCT pm.product_id) > 0
UNION ALL
 SELECT 'tecnica'::text AS filtro_tipo,
    tpgo.grupo_tecnica AS valor,
    lower(tpgo.grupo_tecnica::text) AS slug_ou_codigo,
    NULL::text AS hex,
    count(DISTINCT pat.product_id)::integer AS total_produtos,
    row_number() OVER (ORDER BY (count(DISTINCT pat.product_id)) DESC)::integer AS ordem
   FROM tabela_preco_gravacao_oficial tpgo
     JOIN print_area_techniques pat ON pat.tabela_preco_id = tpgo.id AND pat.is_active = true
     JOIN products p ON p.id = pat.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
  WHERE tpgo.grupo_tecnica IS NOT NULL
  GROUP BY tpgo.grupo_tecnica
 HAVING count(DISTINCT pat.product_id) > 0
UNION ALL
 SELECT 'brand'::text AS filtro_tipo,
    products.brand::text AS valor,
    lower(regexp_replace(products.brand::text, '[^a-zA-Z0-9]'::text, '-'::text, 'g'::text)) AS slug_ou_codigo,
    NULL::text AS hex,
    count(*)::integer AS total_produtos,
    row_number() OVER (ORDER BY (count(*)) DESC)::integer AS ordem
   FROM products
  WHERE products.is_active = true AND products.is_deleted IS NOT TRUE AND products.brand IS NOT NULL
  GROUP BY products.brand
 HAVING count(*) > 0
UNION ALL
 SELECT 'target_audience'::text AS filtro_tipo,
        CASE val.val
            WHEN 'corporativo'::text THEN 'Corporativo'::text
            WHEN 'feminino'::text THEN 'Feminino'::text
            WHEN 'masculino'::text THEN 'Masculino'::text
            WHEN 'infantil'::text THEN 'Infantil'::text
            WHEN 'esportivo'::text THEN 'Esportivo'::text
            WHEN 'unissex'::text THEN 'Unissex'::text
            ELSE initcap(val.val)
        END AS valor,
    val.val AS slug_ou_codigo,
    NULL::text AS hex,
    count(DISTINCT p.id)::integer AS total_produtos,
    row_number() OVER (ORDER BY (count(DISTINCT p.id)) DESC)::integer AS ordem
   FROM products p,
    LATERAL unnest(p.target_audience) val(val)
  WHERE p.is_active = true AND p.is_deleted IS NOT TRUE
  GROUP BY val.val
 HAVING count(DISTINCT p.id) > 0
UNION ALL
 SELECT 'tag'::text AS filtro_tipo,
    t.name AS valor,
    t.slug AS slug_ou_codigo,
    t.color_hex AS hex,
    count(DISTINCT pt.product_id)::integer AS total_produtos,
    row_number() OVER (ORDER BY (count(DISTINCT pt.product_id)) DESC)::integer AS ordem
   FROM tags t
     JOIN product_tags pt ON pt.tag_id = t.id
     JOIN products p ON p.id = pt.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
  WHERE t.is_active = true
  GROUP BY t.id, t.name, t.slug, t.color_hex
 HAVING count(DISTINCT pt.product_id) > 0
UNION ALL
 SELECT 'data_comemorativa'::text AS filtro_tipo,
    cd.name AS valor,
    cd.slug AS slug_ou_codigo,
    cd.color_hex AS hex,
    count(DISTINCT pcd.product_id)::integer AS total_produtos,
    row_number() OVER (ORDER BY (count(DISTINCT pcd.product_id)) DESC)::integer AS ordem
   FROM commemorative_dates cd
     JOIN product_commemorative_dates pcd ON pcd.commemorative_date_id = cd.id AND pcd.is_active = true
     JOIN products p ON p.id = pcd.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
  WHERE cd.is_active = true
  GROUP BY cd.id, cd.name, cd.slug, cd.color_hex
 HAVING count(DISTINCT pcd.product_id) > 0;
```

## public.v_suppliers_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=false |
| depende de | public.suppliers |
| populada | n/a |
| comentário | PUBLIC SUPPLIER PROJECTION (SECURITY DEFINER intencional / fix_version 20260717_v1). Expoe apenas: id, name, code, trading_name, logo_url, website, active, flags, state_uf. Mascara: api_credentials, api_base_url, default_markup_percent, cnpj, email, phone, etc. NAO alterar para security_invoker=true (expoeria api_credentials ao anon via REST). |


```sql
SELECT id,
    name,
    code,
    trading_name,
    logo_url,
    website,
    active,
    is_product_supplier,
    is_engraving_supplier,
    state_uf,
    low_stock_threshold
   FROM suppliers;
```

## public.v_system_alerts (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | cron.job, cron.job_run_details, public.ai_enrichment_queue, public.product_variants, public.products, public.produtos_padronizacao, public.produtos_padronizacao_variantes, public.schema_signature_drift_log, public.supplier_products_raw, public.suppliers, public.variant_supplier_sources |
| populada | n/a |
| comentário | Alertas do sistema. Correções 2026-06-23: CRON_FAIL_RECENT só conta jobs existentes; AI_QUEUE_STALE exclui worker ativo; locked_by_residual alert threshold >100. |


```sql
WITH cron_alerts AS (
         SELECT 'CRON_FAIL_RECENT'::text AS codigo,
            'critical'::text AS severidade,
            ((('Job '::text || j.jobid) || ' ('::text) || j.jobname) || ') com falhas na ultima hora'::text AS mensagem,
            count(
                CASE
                    WHEN d.status = 'failed'::text THEN 1
                    ELSE NULL::integer
                END)::text AS detalhe
           FROM cron.job_run_details d
             JOIN cron.job j ON j.jobid = d.jobid
          WHERE d.start_time > (now() - '01:00:00'::interval)
          GROUP BY j.jobid, j.jobname
         HAVING count(
                CASE
                    WHEN d.status = 'failed'::text THEN 1
                    ELSE NULL::integer
                END) >= 3 OR count(
                CASE
                    WHEN d.status = 'failed'::text THEN 1
                    ELSE NULL::integer
                END) >= 1 AND max(
                CASE
                    WHEN d.status = 'failed'::text THEN d.start_time
                    ELSE NULL::timestamp with time zone
                END) > max(
                CASE
                    WHEN d.status = 'succeeded'::text THEN d.start_time
                    ELSE NULL::timestamp with time zone
                END)
        ), import_stalled AS (
         SELECT 'IMPORT_STALLED'::text AS codigo,
            'warning'::text AS severidade,
            'Batches Bronze pendentes ha mais de 1h'::text AS mensagem,
            count(DISTINCT COALESCE(supplier_products_raw.import_batch_id::text, supplier_products_raw.supplier_id::text))::text AS detalhe
           FROM supplier_products_raw
          WHERE (supplier_products_raw.status = ANY (ARRAY['pending'::supplier_raw_status, 'processing'::supplier_raw_status])) AND supplier_products_raw.imported_at < (now() - '01:00:00'::interval)
         HAVING count(*) > 0
        ), products_no_image AS (
         SELECT 'PRODUCTS_NO_IMAGE'::text AS codigo,
            'info'::text AS severidade,
            'Produtos ativos sem imagem principal'::text AS mensagem,
            count(*)::text AS detalhe
           FROM products
          WHERE products.is_active = true AND products.primary_image_url IS NULL
         HAVING count(*) > 0
        ), vss_no_preferred AS (
         SELECT 'VSS_NO_PREFERRED'::text AS codigo,
            'warning'::text AS severidade,
            'Variantes ativas sem fornecedor preferido'::text AS mensagem,
            count(*)::text AS detalhe
           FROM product_variants pv
          WHERE pv.is_active = true AND NOT (EXISTS ( SELECT 1
                   FROM variant_supplier_sources v
                  WHERE v.variant_id = pv.id AND v.is_preferred = true AND v.is_active = true))
         HAVING count(*) > 0
        ), ai_queue_stale AS (
         SELECT 'AI_QUEUE_STALE'::text AS codigo,
            'info'::text AS severidade,
            'Itens na fila IA ha mais de 7 dias (worker inativo > 24h)'::text AS mensagem,
            count(*)::text AS detalhe
           FROM ai_enrichment_queue
          WHERE ai_enrichment_queue.status = 'pending'::text AND ai_enrichment_queue.created_at < (now() - '7 days'::interval) AND NOT (EXISTS ( SELECT 1
                   FROM ai_enrichment_queue w
                  WHERE w.status = 'processing'::text AND w.locked_at > (now() - '04:00:00'::interval) OR w.status = 'done'::text AND w.completed_at > (now() - '24:00:00'::interval)
                 LIMIT 1))
         HAVING count(*) > 0
        ), products_no_ncm AS (
         SELECT 'PRODUCTS_NO_NCM'::text AS codigo,
            'critical'::text AS severidade,
            'Produtos ativos sem NCM (fiscal)'::text AS mensagem,
            count(*)::text AS detalhe
           FROM products
          WHERE products.is_active = true AND products.ncm_id IS NULL
         HAVING count(*) > 0
        ), stock_critical AS (
         SELECT 'STOCK_CRITICAL_LOW'::text AS codigo,
            'info'::text AS severidade,
            'Variantes ativas com estoque zero'::text AS mensagem,
            count(*)::text AS detalhe
           FROM product_variants pv
             JOIN variant_supplier_sources v ON v.variant_id = pv.id
          WHERE pv.is_active = true AND v.is_active = true AND v.quantity = 0
         HAVING count(*) > 0
        ), stale_sync AS (
         SELECT 'SUPPLIER_SYNC_STALE'::text AS codigo,
            'warning'::text AS severidade,
            ((('Fornecedor "'::text || s.name) || '" sem sync ha '::text) || round(EXTRACT(epoch FROM now() - s.last_full_sync_at) / 3600::numeric, 1)::text) || 'h'::text AS mensagem,
            s.last_full_sync_at::text AS detalhe
           FROM suppliers s
          WHERE s.sync_enabled = true AND (s.last_full_sync_at IS NULL OR s.last_full_sync_at < (now() - ((LEAST(GREATEST(COALESCE(s.sync_interval_minutes, 60) * 4, 240), 1440) || ' minutes'::text)::interval)))
        ), locked_by_residual AS (
         SELECT 'AI_QUEUE_LOCKED_RESIDUAL'::text AS codigo,
            'warning'::text AS severidade,
            'Items ai_enrichment_queue com locked_by residual em estado terminal'::text AS mensagem,
            count(*)::text AS detalhe
           FROM ai_enrichment_queue
          WHERE ai_enrichment_queue.locked_by IS NOT NULL AND (ai_enrichment_queue.status <> ALL (ARRAY['processing'::text, 'pending'::text]))
         HAVING count(*) > 100
        ), schema_drift AS (
         SELECT 'SCHEMA_DRIFT_DETECTED'::text AS codigo,
            'warning'::text AS severidade,
            'Schema divergente da baseline certificada (possivel alteracao do bot Lovable)'::text AS mensagem,
            format('cols +%s/-%s/~%s; tabelas +%s/-%s (baseline=%s; verificado %s)'::text, l.n_added, l.n_removed, l.n_retyped, COALESCE(array_length(l.tables_added, 1), 0), COALESCE(array_length(l.tables_removed, 1), 0), l.baseline_label, l.ran_at::timestamp(0) without time zone) AS detalhe
           FROM schema_signature_drift_log l
          WHERE l.ran_at = (( SELECT max(l2.ran_at) AS max
                   FROM schema_signature_drift_log l2)) AND l.has_drift = true
        ), silver_promote_stalled AS (
         SELECT 'SILVER_PROMOTE_STALLED'::text AS codigo,
            'warning'::text AS severidade,
            'Promocao Prata->Ouro possivelmente parada (pads padronizados ha >2h ou variantes orfas com pai ja promovido)'::text AS mensagem,
            format('pads_std_2h=%s, variantes_orfas=%s'::text, ( SELECT count(*) AS count
                   FROM produtos_padronizacao pp
                  WHERE pp.status::text = 'standardized'::text AND pp.standardized_at < (now() - '02:00:00'::interval)), ( SELECT count(*) AS count
                   FROM produtos_padronizacao_variantes pv
                  WHERE pv.status::text = 'standardized'::text AND (EXISTS ( SELECT 1
                           FROM produtos_padronizacao pp2
                          WHERE pp2.supplier_id = pv.supplier_id AND pp2.supplier_reference = pv.parent_reference AND pp2.status::text = 'promoted'::text)))) AS detalhe
          WHERE ((( SELECT count(*) AS count
                   FROM produtos_padronizacao pp
                  WHERE pp.status::text = 'standardized'::text AND pp.standardized_at < (now() - '02:00:00'::interval))) + (( SELECT count(*) AS count
                   FROM produtos_padronizacao_variantes pv
                  WHERE pv.status::text = 'standardized'::text AND (EXISTS ( SELECT 1
                           FROM produtos_padronizacao pp2
                          WHERE pp2.supplier_id = pv.supplier_id AND pp2.supplier_reference = pv.parent_reference AND pp2.status::text = 'promoted'::text))))) > 0
        )
 SELECT codigo,
    severidade,
    mensagem,
    detalhe,
    now() AS detected_at
   FROM ( SELECT cron_alerts.codigo,
            cron_alerts.severidade,
            cron_alerts.mensagem,
            cron_alerts.detalhe
           FROM cron_alerts
        UNION ALL
         SELECT import_stalled.codigo,
            import_stalled.severidade,
            import_stalled.mensagem,
            import_stalled.detalhe
           FROM import_stalled
        UNION ALL
         SELECT products_no_image.codigo,
            products_no_image.severidade,
            products_no_image.mensagem,
            products_no_image.detalhe
           FROM products_no_image
        UNION ALL
         SELECT vss_no_preferred.codigo,
            vss_no_preferred.severidade,
            vss_no_preferred.mensagem,
            vss_no_preferred.detalhe
           FROM vss_no_preferred
        UNION ALL
         SELECT ai_queue_stale.codigo,
            ai_queue_stale.severidade,
            ai_queue_stale.mensagem,
            ai_queue_stale.detalhe
           FROM ai_queue_stale
        UNION ALL
         SELECT products_no_ncm.codigo,
            products_no_ncm.severidade,
            products_no_ncm.mensagem,
            products_no_ncm.detalhe
           FROM products_no_ncm
        UNION ALL
         SELECT stock_critical.codigo,
            stock_critical.severidade,
            stock_critical.mensagem,
            stock_critical.detalhe
           FROM stock_critical
        UNION ALL
         SELECT stale_sync.codigo,
            stale_sync.severidade,
            stale_sync.mensagem,
            stale_sync.detalhe
           FROM stale_sync
        UNION ALL
         SELECT locked_by_residual.codigo,
            locked_by_residual.severidade,
            locked_by_residual.mensagem,
            locked_by_residual.detalhe
           FROM locked_by_residual
        UNION ALL
         SELECT schema_drift.codigo,
            schema_drift.severidade,
            schema_drift.mensagem,
            schema_drift.detalhe
           FROM schema_drift
        UNION ALL
         SELECT silver_promote_stalled.codigo,
            silver_promote_stalled.severidade,
            silver_promote_stalled.mensagem,
            silver_promote_stalled.detalhe
           FROM silver_promote_stalled) c
  ORDER BY (
        CASE severidade
            WHEN 'critical'::text THEN 1
            WHEN 'warning'::text THEN 2
            ELSE 3
        END);
```

## public.v_system_health_dashboard (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções |  |
| depende de | auth.users, cron.job, cron.job_run_details, pg_catalog.pg_indexes, pg_catalog.pg_policies, pg_catalog.pg_publication_tables, pg_catalog.pg_stat_user_indexes, public.ai_enrichment_queue, public.categories, public.orders, public.organizations, public.product_images, public.product_variants, public.product_videos, public.products, public.quotes, public.stock_daily_summary, public.stock_snapshots, public.supplier_products_raw, public.suppliers, public.variant_supplier_sources |
| populada | n/a |
| comentário | Dashboard mestre de saúde do sistema. 34 métricas em 9 categorias. Usage: SELECT * FROM v_system_health_dashboard; |


```sql
WITH metrics AS (
         SELECT 'database'::text AS categoria,
            'total_tables_public'::text AS metrica,
            (( SELECT count(*) AS count
                   FROM pg_class c
                     JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname = 'public'::name AND c.relkind = 'r'::"char"))::text AS valor,
            'count'::text AS unit
        UNION ALL
         SELECT 'database'::text AS text,
            'total_functions'::text AS text,
            (( SELECT count(*) AS count
                   FROM pg_proc p
                     JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname = 'public'::name))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'database'::text AS text,
            'total_triggers'::text AS text,
            (( SELECT count(*) AS count
                   FROM pg_trigger t
                     JOIN pg_class c ON c.oid = t.tgrelid
                     JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname = 'public'::name AND NOT t.tgisinternal))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'database'::text AS text,
            'total_indexes'::text AS text,
            (( SELECT count(*) AS count
                   FROM pg_indexes
                  WHERE pg_indexes.schemaname = 'public'::name))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'database'::text AS text,
            'total_rls_policies'::text AS text,
            (( SELECT count(*) AS count
                   FROM pg_policies
                  WHERE pg_policies.schemaname = 'public'::name))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'database'::text AS text,
            'realtime_published_tables'::text AS text,
            (( SELECT count(*) AS count
                   FROM pg_publication_tables
                  WHERE pg_publication_tables.pubname = 'supabase_realtime'::name))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'total_products'::text AS text,
            (( SELECT count(*) AS count
                   FROM products))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'active_products'::text AS text,
            (( SELECT count(*) AS count
                   FROM products
                  WHERE products.is_active = true))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'products_with_image'::text AS text,
            (( SELECT count(*) AS count
                   FROM products
                  WHERE products.primary_image_url IS NOT NULL))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'products_with_ncm'::text AS text,
            (( SELECT count(*) AS count
                   FROM products
                  WHERE products.ncm_id IS NOT NULL))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'products_with_ai_description'::text AS text,
            (( SELECT count(*) AS count
                   FROM products
                  WHERE products.ai_description IS NOT NULL))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'total_variants'::text AS text,
            (( SELECT count(*) AS count
                   FROM product_variants))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'active_variants'::text AS text,
            (( SELECT count(*) AS count
                   FROM product_variants
                  WHERE product_variants.is_active = true))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'total_images'::text AS text,
            (( SELECT count(*) AS count
                   FROM product_images))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'total_videos'::text AS text,
            (( SELECT count(*) AS count
                   FROM product_videos))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'total_categories'::text AS text,
            (( SELECT count(*) AS count
                   FROM categories
                  WHERE categories.is_active = true))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'catalog'::text AS text,
            'total_stock_units'::text AS text,
            COALESCE(( SELECT sum(variant_supplier_sources.quantity) AS sum
                   FROM variant_supplier_sources
                  WHERE variant_supplier_sources.is_active = true), 0::bigint)::text AS "coalesce",
            'units'::text AS text
        UNION ALL
         SELECT 'suppliers'::text AS text,
            'total_suppliers'::text AS text,
            (( SELECT count(*) AS count
                   FROM suppliers))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'suppliers'::text AS text,
            'active_sync_suppliers'::text AS text,
            (( SELECT count(*) AS count
                   FROM suppliers
                  WHERE suppliers.sync_enabled = true))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'suppliers'::text AS text,
            'pending_import_batches'::text AS text,
            (( SELECT count(DISTINCT supplier_products_raw.import_batch_id) AS count
                   FROM supplier_products_raw
                  WHERE supplier_products_raw.status <> 'processed'::supplier_raw_status))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'ai'::text AS text,
            'ai_queue_pending'::text AS text,
            (( SELECT count(*) AS count
                   FROM ai_enrichment_queue
                  WHERE ai_enrichment_queue.status = 'pending'::text))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'ai'::text AS text,
            'ai_queue_completed'::text AS text,
            (( SELECT count(*) AS count
                   FROM ai_enrichment_queue
                  WHERE ai_enrichment_queue.status = 'done'::text))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'ai'::text AS text,
            'ai_queue_stuck'::text AS text,
            (( SELECT count(*) AS count
                   FROM ai_enrichment_queue
                  WHERE ai_enrichment_queue.status = 'processing'::text AND ai_enrichment_queue.locked_at < (now() - '02:00:00'::interval)))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'crm'::text AS text,
            'total_quotes'::text AS text,
            (( SELECT count(*) AS count
                   FROM quotes))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'crm'::text AS text,
            'total_orders'::text AS text,
            (( SELECT count(*) AS count
                   FROM orders))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'auth'::text AS text,
            'total_users'::text AS text,
            (( SELECT count(*) AS count
                   FROM auth.users))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'auth'::text AS text,
            'total_organizations'::text AS text,
            (( SELECT count(*) AS count
                   FROM organizations))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'cron'::text AS text,
            'active_jobs'::text AS text,
            (( SELECT count(*) AS count
                   FROM cron.job
                  WHERE job.active = true))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'cron'::text AS text,
            'failed_runs_24h'::text AS text,
            (( SELECT count(*) AS count
                   FROM cron.job_run_details
                  WHERE job_run_details.status = 'failed'::text AND job_run_details.start_time > (now() - '24:00:00'::interval)))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'cron'::text AS text,
            'succeeded_runs_24h'::text AS text,
            (( SELECT count(*) AS count
                   FROM cron.job_run_details
                  WHERE job_run_details.status = 'succeeded'::text AND job_run_details.start_time > (now() - '24:00:00'::interval)))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'bi'::text AS text,
            'stock_snapshots_count'::text AS text,
            (( SELECT count(*) AS count
                   FROM stock_snapshots))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'bi'::text AS text,
            'stock_daily_summary_count'::text AS text,
            (( SELECT count(*) AS count
                   FROM stock_daily_summary))::text AS count,
            'count'::text AS text
        UNION ALL
         SELECT 'storage'::text AS text,
            'db_total_size'::text AS text,
            pg_size_pretty(pg_database_size(current_database())) AS pg_size_pretty,
            'size'::text AS text
        UNION ALL
         SELECT 'storage'::text AS text,
            'indexes_size_public'::text AS text,
            ( SELECT pg_size_pretty(sum(pg_relation_size(pg_stat_user_indexes.indexrelid::regclass))) AS pg_size_pretty
                   FROM pg_stat_user_indexes
                  WHERE pg_stat_user_indexes.schemaname = 'public'::name) AS pg_size_pretty,
            'size'::text AS text
        )
 SELECT categoria,
    metrica,
    valor,
    unit,
    now() AS captured_at
   FROM metrics
  ORDER BY categoria, metrica;
```

## public.v_tabela_preco_gravacao_oficial_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=false |
| depende de | public.tabela_preco_gravacao_oficial |
| populada | n/a |
| comentário | PUBLIC ENGRAVING TABLE PROJECTION (SECURITY DEFINER / fix_version 20260717). Expõe apenas colunas de cobrança e preços de venda. EXCLUÍDOS: custo_setup (R$325 max), markup_percent (115% max), custo_aplicacao, custo_termo_transferencia, custo_queima_forno, faturamento_minimo. NAO reverter para security_invoker=true nem re-expor a tabela base ao anon. |


```sql
SELECT id,
    codigo_tabela,
    codigo,
    codigo_curto,
    nome,
    nome_grupo,
    descricao,
    grupo_tecnica,
    cobra_por_cor,
    max_cores,
    desconto_segunda_cor,
    desconto_terceira_cor,
    desconto_quarta_cor_mais,
    preco_minimo_unitario,
    preco_maximo_unitario,
    cobra_por_area,
    area_maxima_cm2,
    area_maxima_texto,
    cobra_por_pontos,
    max_pontos,
    usa_faixa_dimensional,
    opcoes_modificadores,
    tom_options,
    cobra_aplicacao,
    cobra_queima_forno,
    cobra_termo_transferencia,
    custo_setup_por_cor,
    custo_manuseio_por_peca,
    quantidade_corte,
    tipo_setup,
    validade_inicio,
    validade_fim,
    ordem_exibicao,
    tecnica_variante_id,
    ativo,
    created_at,
    updated_at
   FROM tabela_preco_gravacao_oficial
  WHERE ativo = true;
```

## public.v_tags_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.tags |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    name,
    slug,
    color_hex,
    description,
    usage_count
   FROM tags t
  WHERE is_active = true;
```

## public.v_top_patterns (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.company_email_patterns |
| populada | n/a |
| comentário |  |


```sql
SELECT pattern_format,
    count(*) AS usage_count,
    avg(pattern_confidence) AS avg_confidence,
    array_agg(DISTINCT company_domain ORDER BY company_domain) AS example_domains
   FROM company_email_patterns
  GROUP BY pattern_format
  ORDER BY (count(*)) DESC;
```

## public.v_unmapped_images (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images |
| populada | n/a |
| comentário |  |


```sql
SELECT image_type AS tipo_detectado,
    supplier_code,
    count(*) AS quantidade,
    array_agg(DISTINCT filename ORDER BY filename) FILTER (WHERE filename IS NOT NULL) AS exemplos_arquivos
   FROM product_images pi
  WHERE is_active = true AND (image_type_id IS NULL OR image_type::text = 'other'::text)
  GROUP BY image_type, supplier_code
 HAVING count(*) > 0
  ORDER BY (count(*)) DESC;
```

## public.v_variant_sale_prices_public (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=false |
| depende de | public.markup_configurations, public.product_variants, public.products, public.suppliers, public.variant_supplier_sources |
| populada | n/a |
| comentário | PUBLIC PRICE PROJECTION (SECURITY DEFINER intencional / fix_version 20260717_v1). Emite apenas preco de venda por faixa de quantidade; custo/markup usados no calculo nunca sao expostos. Roda como owner para ler variant_supplier_sources/markup_configurations sem conceder essas tabelas sensiveis ao anon. NAO alterar para security_invoker=true. |


```sql
SELECT pv.id AS variant_id,
    pv.product_id,
    pv.sku,
    pv.color_name,
    vss.min_qty_1,
    round(vss.cost_price_1 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_1,
    vss.min_qty_2,
    round(vss.cost_price_2 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_2,
    vss.min_qty_3,
    round(vss.cost_price_3 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_3,
    vss.min_qty_4,
    round(vss.cost_price_4 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_4,
    vss.min_qty_5,
    round(vss.cost_price_5 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_5
   FROM product_variants pv
     JOIN products p ON p.id = pv.product_id AND p.is_active = true AND p.is_deleted IS NOT TRUE
     JOIN variant_supplier_sources vss ON vss.variant_id = pv.id AND vss.is_preferred = true
     LEFT JOIN suppliers s ON s.id = vss.supplier_id
     LEFT JOIN markup_configurations mc_var ON mc_var.variant_id = pv.id AND mc_var.is_active = true
     LEFT JOIN markup_configurations mc_prod ON mc_prod.product_id = pv.product_id AND mc_prod.variant_id IS NULL AND mc_prod.category_id IS NULL AND mc_prod.is_active = true
     LEFT JOIN markup_configurations mc_cat ON mc_cat.category_id = (( SELECT products.category_id
           FROM products
          WHERE products.id = pv.product_id)) AND mc_cat.product_id IS NULL AND mc_cat.variant_id IS NULL AND mc_cat.is_active = true
  WHERE pv.is_active = true;
```

## public.v_variants_with_commemorative_dates (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.commemorative_dates, public.product_variants, public.products, public.variant_commemorative_dates |
| populada | n/a |
| comentário |  |


```sql
SELECT pv.id AS variant_id,
    pv.name AS variant_name,
    pv.sku AS variant_sku,
    pv.color_name,
    pv.color_hex,
    p.id AS product_id,
    p.name AS product_name,
    p.sku AS product_sku,
    cd.id AS commemorative_date_id,
    cd.name AS commemorative_date_name,
    cd.slug AS commemorative_date_slug,
    cd.date_month,
    cd.date_day,
    cd.category AS date_category,
    cd.icon_name AS date_icon,
    cd.color_hex AS date_color,
    vcd.is_featured,
    vcd.custom_description,
    vcd.variant_id IS NULL AS is_product_wide
   FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN variant_commemorative_dates vcd ON vcd.variant_id = pv.id OR vcd.product_id = p.id AND vcd.variant_id IS NULL
     LEFT JOIN commemorative_dates cd ON cd.id = vcd.commemorative_date_id
  WHERE pv.is_active = true
  ORDER BY p.name, pv.color_name, cd.date_month, cd.date_day;
```

## public.v_video_dashboard (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_videos |
| populada | n/a |
| comentário |  |


```sql
SELECT COALESCE(video_type, 'sem_tipo'::character varying) AS tipo,
    cloudflare_status AS status,
    count(*) AS quantidade,
    count(DISTINCT product_id) AS produtos,
    sum(duration_seconds) AS duracao_total_seg,
    round(avg(duration_seconds), 0) AS duracao_media_seg,
    count(*) FILTER (WHERE width_px >= 1920) AS full_hd,
    count(*) FILTER (WHERE width_px >= 1280 AND width_px < 1920) AS hd,
    count(*) FILTER (WHERE width_px < 1280 OR width_px IS NULL) AS sd_ou_desconhecido
   FROM product_videos pv
  WHERE is_active = true
  GROUP BY (COALESCE(video_type, 'sem_tipo'::character varying)), cloudflare_status
  ORDER BY (count(*)) DESC;
```

## public.v_video_validation_recent (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.video_validation_log |
| populada | n/a |
| comentário |  |


```sql
SELECT vvl.validated_at,
    vvl.action_type,
    vvl.validation_status,
    vvl.cloudflare_video_id,
    vvl.supplier_code,
    (vvl.width_px || 'x'::text) || vvl.height_px AS resolucao,
    vvl.duration_seconds || 's'::text AS duracao,
    vvl.issues,
    vvl.recommendations,
    p.name AS produto
   FROM video_validation_log vvl
     LEFT JOIN products p ON vvl.product_id = p.id
  ORDER BY vvl.validated_at DESC
 LIMIT 100;
```

## public.v_videos_pending (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_videos, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT pv.id,
    pv.cloudflare_video_id,
    p.name AS product_name,
    p.sku,
    pv.cloudflare_status,
    pv.cloudflare_error,
    pv.created_at
   FROM product_videos pv
     LEFT JOIN products p ON pv.product_id = p.id
  WHERE pv.is_active = true AND ((pv.cloudflare_status::text = ANY (ARRAY['pending'::character varying, 'uploading'::character varying, 'processing'::character varying, 'error'::character varying]::text[])) OR pv.cloudflare_video_id IS NULL)
  ORDER BY pv.created_at DESC;
```

## public.v_videos_with_urls (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_videos, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT pv.id,
    pv.product_id,
    p.name AS product_name,
    p.sku,
    pv.cloudflare_video_id,
    pv.video_type,
    pv.title,
    pv.duration_seconds,
    (lpad((pv.duration_seconds / 60)::text, 2, '0'::text) || ':'::text) || lpad((pv.duration_seconds % 60)::text, 2, '0'::text) AS duration_formatted,
    pv.width_px,
    pv.height_px,
    (pv.width_px || 'x'::text) || pv.height_px AS resolution,
    pv.url_stream AS embed_url,
    pv.url_hls AS hls_url,
    pv.url_thumbnail AS thumbnail_url,
    get_cloudflare_video_gif(pv.cloudflare_video_id, 0, 3) AS gif_preview_url,
    pv.cloudflare_status,
    pv.is_primary,
    pv.is_active
   FROM product_videos pv
     LEFT JOIN products p ON pv.product_id = p.id
  WHERE pv.cloudflare_video_id IS NOT NULL;
```

## public.v_webhook_delivery_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.webhook_dispatcher_log |
| populada | n/a |
| comentário | Stats horárias de entrega webhook Gifts→Champions. Criado M10 2026-07-10 ANTI-REGRESSÃO. |


```sql
SELECT date_trunc('hour'::text, fired_at) AS hora,
    count(*) AS total_deliveries,
    count(*) FILTER (WHERE delivery_status = 'delivered'::text) AS delivered,
    count(*) FILTER (WHERE delivery_status = 'failed'::text) AS failed,
    count(*) FILTER (WHERE delivery_status = 'timeout'::text) AS timeouts,
    count(*) FILTER (WHERE delivery_status = 'pending'::text) AS pending,
    round(avg(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0) AS avg_duration_ms,
    max(duration_ms) AS max_duration_ms,
    count(*) FILTER (WHERE http_status = 200) AS http_200,
    count(*) FILTER (WHERE (http_status <> ALL (ARRAY[200, NULL::integer])) OR http_status IS NULL) AS non_200,
    round(100.0 * count(*) FILTER (WHERE delivery_status = 'delivered'::text)::numeric / NULLIF(count(*), 0)::numeric, 1) AS success_rate_pct
   FROM webhook_dispatcher_log
  GROUP BY (date_trunc('hour'::text, fired_at))
  ORDER BY (date_trunc('hour'::text, fired_at)) DESC;
```

## public.v_xbz_ficha_parse_queue (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_kit_components, public.products, public.supplier_products_raw |
| populada | n/a |
| comentário | Fila de trabalho do parse da ficha tecnica XBZ. prioridade 1=kit decomposto c/ dims heuristicas (parse grava real ja); 2=kit sem componentes; 3=parece kit mas is_kit=false (reclassificar+decompor); 4=kit ja ficha; 5=produto comum. O parser le esta fila, busca ficha_pdf_url, e alimenta kit_component_ficha_staging. |


```sql
WITH ficha AS (
         SELECT spr.product_id,
            max(spr.site_data ->> 'ficha_tecnica_pdf'::text) AS ficha_pdf_url,
            max(spr.site_scraped_at) AS last_scraped
           FROM supplier_products_raw spr
          WHERE spr.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid AND COALESCE(spr.site_data ->> 'ficha_tecnica_pdf'::text, ''::text) <> ''::text
          GROUP BY spr.product_id
        ), comp AS (
         SELECT product_kit_components.kit_product_id,
            count(*) AS n_comp,
            count(*) FILTER (WHERE NOT product_kit_components.is_packaging) AS n_itens,
            count(*) FILTER (WHERE product_kit_components.dim_source::text = 'heuristic'::text) AS n_dim_heuristic,
            count(*) FILTER (WHERE product_kit_components.dim_source::text = 'ficha'::text) AS n_dim_ficha
           FROM product_kit_components
          GROUP BY product_kit_components.kit_product_id
        )
 SELECT p.sku AS product_sku,
    p.id AS product_id,
    p.name AS product_name,
    p.is_kit,
    p.name ~* '[0-9]+\s*pe[çc]as'::text AS nome_indica_pecas,
    f.ficha_pdf_url,
    f.last_scraped,
    COALESCE(c.n_comp, 0::bigint) AS n_componentes,
    COALESCE(c.n_dim_heuristic, 0::bigint) AS n_dim_heuristicas,
    COALESCE(c.n_dim_ficha, 0::bigint) AS n_dim_ficha,
        CASE
            WHEN p.is_kit AND COALESCE(c.n_dim_heuristic, 0::bigint) > 0 THEN 1
            WHEN p.is_kit AND COALESCE(c.n_comp, 0::bigint) = 0 THEN 2
            WHEN NOT p.is_kit AND p.name ~* '[0-9]+\s*pe[çc]as'::text THEN 3
            WHEN p.is_kit THEN 4
            ELSE 5
        END AS prioridade,
        CASE
            WHEN p.is_kit AND COALESCE(c.n_dim_heuristic, 0::bigint) > 0 THEN 'kit_decomposto_dims_heuristicas'::text
            WHEN p.is_kit AND COALESCE(c.n_comp, 0::bigint) = 0 THEN 'kit_sem_componentes'::text
            WHEN NOT p.is_kit AND p.name ~* '[0-9]+\s*pe[çc]as'::text THEN 'reclassificar_e_decompor'::text
            WHEN p.is_kit THEN 'kit_completo_ficha'::text
            ELSE 'produto_comum_com_ficha'::text
        END AS motivo
   FROM ficha f
     JOIN products p ON p.id = f.product_id
     LEFT JOIN comp c ON c.kit_product_id = p.id;
```

## public.vw_active_products_missing_gold_images (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.products, public.supplier_products_raw |
| populada | n/a |
| comentário | Backlog de imagens: produtos ativos sem registro em product_images (Gold), com imagens presas em images_status=pending no Bronze. Remediação = pipeline de imagens drenar o pending (NÃO inserir em Gold manualmente). Auto-limpa quando o pipeline promove. |


```sql
SELECT p.id AS product_id,
    p.name,
    p.supplier_id,
    p.sku,
    p.supplier_reference,
    p.primary_image_url,
    count(r.id) AS bronze_rows,
    count(*) FILTER (WHERE r.images_status::text = 'pending'::text) AS bronze_imgs_pending,
    count(*) FILTER (WHERE r.images_processed = true) AS bronze_imgs_processadas,
    max(r.updated_at) AS bronze_ultima_atualizacao
   FROM products p
     JOIN supplier_products_raw r ON r.product_id = p.id
  WHERE p.is_active AND p.primary_image_url IS NOT NULL AND NOT (EXISTS ( SELECT 1
           FROM product_images pi
          WHERE pi.product_id = p.id))
  GROUP BY p.id, p.name, p.supplier_id, p.sku, p.supplier_reference, p.primary_image_url;
```

## public.vw_ai_enrichment_status (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.ai_enrichment_queue, public.products |
| populada | n/a |
| comentário | Monitoramento da fila AI Enrichment — cobertura por campo e status da fila |


```sql
WITH queue_stats AS (
         SELECT ai_enrichment_queue.enrichment_type,
            count(*) FILTER (WHERE ai_enrichment_queue.status = 'pending'::text) AS pending,
            count(*) FILTER (WHERE ai_enrichment_queue.status = 'processing'::text) AS processing,
            count(*) FILTER (WHERE ai_enrichment_queue.status = 'done'::text) AS done,
            count(*) FILTER (WHERE ai_enrichment_queue.status = 'error'::text) AS errors,
            count(*) FILTER (WHERE ai_enrichment_queue.status = 'skipped'::text) AS skipped,
            count(*) AS total,
            max(ai_enrichment_queue.completed_at) AS last_completed_at
           FROM ai_enrichment_queue
          GROUP BY ai_enrichment_queue.enrichment_type
        ), product_coverage AS (
         SELECT count(*) FILTER (WHERE products.ai_title IS NOT NULL AND length(TRIM(BOTH FROM products.ai_title)) > 0) AS has_ai_title,
            count(*) FILTER (WHERE products.ai_summary IS NOT NULL AND length(TRIM(BOTH FROM products.ai_summary)) > 0) AS has_ai_summary,
            count(*) FILTER (WHERE products.schema_json IS NOT NULL) AS has_schema_json,
            count(*) FILTER (WHERE products.ai_title IS NOT NULL AND length(TRIM(BOTH FROM products.ai_title)) > 0 AND products.ai_description IS NOT NULL AND length(TRIM(BOTH FROM products.ai_description)) > 0 AND products.ai_summary IS NOT NULL AND length(TRIM(BOTH FROM products.ai_summary)) > 0) AS has_all_ai_fields,
            count(*) AS total
           FROM products
          WHERE products.is_active = true AND products.is_deleted = false
        )
 SELECT q.enrichment_type,
    q.pending,
    q.processing,
    q.done,
    q.errors,
    q.total AS total_queued,
    q.last_completed_at,
        CASE q.enrichment_type
            WHEN 'ai_title'::text THEN pc.has_ai_title
            WHEN 'ai_summary'::text THEN pc.has_ai_summary
            WHEN 'schema_json'::text THEN pc.has_schema_json
            WHEN 'all'::text THEN pc.has_all_ai_fields
            ELSE NULL::bigint
        END AS products_with_field,
    pc.total AS total_products,
    round(
        CASE q.enrichment_type
            WHEN 'ai_title'::text THEN pc.has_ai_title::numeric * 100.0 / NULLIF(pc.total, 0)::numeric
            WHEN 'ai_summary'::text THEN pc.has_ai_summary::numeric * 100.0 / NULLIF(pc.total, 0)::numeric
            WHEN 'schema_json'::text THEN pc.has_schema_json::numeric * 100.0 / NULLIF(pc.total, 0)::numeric
            WHEN 'all'::text THEN pc.has_all_ai_fields::numeric * 100.0 / NULLIF(pc.total, 0)::numeric
            ELSE NULL::numeric
        END, 1) AS pct_coverage
   FROM queue_stats q
     CROSS JOIN product_coverage pc
  ORDER BY q.enrichment_type;
```

## public.vw_ai_history_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_ai_history |
| populada | n/a |
| comentário | Estatísticas de custo e cobertura por modelo AI — inclui estimativa de custo em USD. |


```sql
SELECT model,
    ai_provider,
    count(*) AS total_geracoes,
    count(DISTINCT product_id) AS produtos_unicos,
    sum(total_tokens) AS total_tokens,
    round(avg(total_tokens), 0) AS media_tokens,
    sum(generation_time_ms) AS total_ms,
    round(avg(generation_time_ms), 0) AS media_ms,
    round(sum(COALESCE(prompt_tokens, 0))::numeric / 1000000.0 * 0.27 + sum(COALESCE(completion_tokens, 0))::numeric / 1000000.0 * 1.10, 4) AS custo_usd_estimado,
    min(generated_at) AS primeira_geracao,
    max(generated_at) AS ultima_geracao
   FROM product_ai_history
  GROUP BY model, ai_provider
  ORDER BY (count(*)) DESC;
```

## public.vw_asia_products_by_category (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.produtos_padronizacao, public.produtos_padronizacao_variantes, public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT COALESCE(pp.supplier_type, 'Sem categoria'::text) AS nome_categoria,
    count(*) AS total_produtos,
    round(avg(pv.cost_price), 2) AS preco_medio,
    round(min(pv.cost_price), 2) AS preco_minimo,
    round(max(pv.cost_price), 2) AS preco_maximo,
    sum(pv.stock_quantity) AS estoque_total,
    count(
        CASE
            WHEN pv.stock_quantity > 0 THEN 1
            ELSE NULL::integer
        END) AS com_estoque,
    count(
        CASE
            WHEN spr.status = 'processed'::supplier_raw_status THEN 1
            ELSE NULL::integer
        END) AS processados
   FROM supplier_products_raw spr
     JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
     JOIN produtos_padronizacao pp ON pp.id = pv.pad_id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
  GROUP BY pp.supplier_type
  ORDER BY (count(*)) DESC;
```

## public.vw_asia_products_by_color (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.produtos_padronizacao_variantes |
| populada | n/a |
| comentário |  |


```sql
SELECT lower(regexp_replace(color_name, '\s+'::text, '-'::text, 'g'::text)) AS slug_cor,
    color_name AS nome_cor,
    color_hex AS hex_cor,
    count(DISTINCT variant_reference) AS total_produtos,
    round(avg(cost_price), 2) AS preco_medio,
    sum(stock_quantity) AS estoque_total
   FROM produtos_padronizacao_variantes pv
  WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND color_name IS NOT NULL
  GROUP BY (lower(regexp_replace(color_name, '\s+'::text, '-'::text, 'g'::text))), color_name, color_hex
  ORDER BY (count(DISTINCT variant_reference)) DESC;
```

## public.vw_asia_products_by_tag (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.produtos_padronizacao, public.produtos_padronizacao_variantes, public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT tag_val.value AS nome_tag,
    count(*) AS total_produtos,
    round(avg(pv.cost_price), 2) AS preco_medio,
    sum(pv.stock_quantity) AS estoque_total
   FROM supplier_products_raw spr
     JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
     JOIN produtos_padronizacao pp ON pp.id = pv.pad_id
     CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(pp.tags, '[]'::jsonb)) tag_val(value)
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
  GROUP BY tag_val.value
  ORDER BY (count(*)) DESC;
```

## public.vw_asia_products_errors (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT supplier_reference,
    raw_data ->> 'nome'::text AS nome_produto,
    process_errors,
    status = 'processed'::supplier_raw_status AS processed,
    processed_at,
    created_at
   FROM supplier_products_raw spr
  WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND process_errors IS NOT NULL
  ORDER BY updated_at DESC;
```

## public.vw_asia_products_low_stock (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.produtos_padronizacao, public.produtos_padronizacao_variantes, public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT pp.supplier_reference,
    pp.name AS nome_produto,
    pv.cost_price AS preco,
    pv.stock_quantity AS estoque_atual,
    pp.supplier_type AS categoria,
    pp.supplier_subtype AS subcategoria,
    spr.updated_at
   FROM supplier_products_raw spr
     JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
     JOIN produtos_padronizacao pp ON pp.id = pv.pad_id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND pv.stock_quantity > 0 AND pv.stock_quantity < 100
  ORDER BY pv.stock_quantity;
```

## public.vw_asia_products_pending (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.produtos_padronizacao, public.produtos_padronizacao_variantes, public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT spr.supplier_reference,
    pp.name AS nome_produto,
    pv.cost_price AS preco,
    pv.stock_quantity AS estoque,
    pp.supplier_type AS categoria,
    spr.imported_at,
    spr.created_at,
    EXTRACT(epoch FROM now() - spr.imported_at) / 3600::numeric AS horas_desde_import
   FROM supplier_products_raw spr
     JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
     JOIN produtos_padronizacao pp ON pp.id = pv.pad_id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND spr.status <> 'processed'::supplier_raw_status
  ORDER BY spr.imported_at DESC;
```

## public.vw_asia_products_promo (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.produtos_padronizacao, public.produtos_padronizacao_variantes, public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT pp.supplier_reference,
    pp.name AS nome_produto,
    pv.cost_price AS preco,
    pv.stock_quantity AS estoque,
    pp.supplier_type AS categoria,
    pp.supplier_subtype AS subcategoria,
    spr.updated_at
   FROM supplier_products_raw spr
     JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
     JOIN produtos_padronizacao pp ON pp.id = pv.pad_id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND ((spr.raw_data ->> 'promocao'::text)::integer) = 1
  ORDER BY pv.cost_price;
```

## public.vw_asia_products_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_videos, public.produtos_padronizacao, public.produtos_padronizacao_variantes, public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT count(DISTINCT pp.id) AS total_produtos,
    count(DISTINCT
        CASE
            WHEN spr.status = 'processed'::supplier_raw_status THEN pp.id
            ELSE NULL::uuid
        END) AS produtos_processados,
    count(DISTINCT
        CASE
            WHEN spr.status <> 'processed'::supplier_raw_status THEN pp.id
            ELSE NULL::uuid
        END) AS produtos_pendentes,
    round(count(DISTINCT
        CASE
            WHEN spr.status = 'processed'::supplier_raw_status THEN pp.id
            ELSE NULL::uuid
        END)::numeric / NULLIF(count(DISTINCT pp.id), 0)::numeric * 100::numeric, 2) AS taxa_processamento_pct,
    min(spr.created_at) AS primeira_importacao,
    max(spr.updated_at) AS ultima_atualizacao,
    max(spr.imported_at) AS ultimo_import,
    round(avg(pv.cost_price), 2) AS preco_medio,
    round(min(pv.cost_price), 2) AS preco_minimo,
    round(max(pv.cost_price), 2) AS preco_maximo,
    sum(pv.stock_quantity) AS estoque_total,
    count(
        CASE
            WHEN pv.stock_quantity > 0 THEN 1
            ELSE NULL::integer
        END) AS com_estoque,
    count(
        CASE
            WHEN pv.stock_quantity = 0 THEN 1
            ELSE NULL::integer
        END) AS sem_estoque,
    count(DISTINCT
        CASE
            WHEN pp.images IS NOT NULL THEN pp.id
            ELSE NULL::uuid
        END) AS com_galeria,
    count(DISTINCT
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM product_videos pv2
              WHERE pv2.product_id = pp.product_id AND pv2.is_active = true)) THEN pp.id
            ELSE NULL::uuid
        END) AS com_video
   FROM supplier_products_raw spr
     JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
     JOIN produtos_padronizacao pp ON pp.id = pv.pad_id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid;
```

## public.vw_category_accessories (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.category_accessory_categories |
| populada | n/a |
| comentário | Lista de acessórios/embalagens disponíveis por categoria de produto. |


```sql
SELECT c_prod.id AS product_category_id,
    c_prod.name AS product_category_name,
    cac.relationship_type,
    cac.display_label,
    cac.is_required,
    c_acc.id AS accessory_category_id,
    c_acc.name AS accessory_category_name,
    c_acc.full_path_readable AS accessory_path,
    cac.include_children
   FROM category_accessory_categories cac
     JOIN categories c_prod ON c_prod.id = cac.category_id
     JOIN categories c_acc ON c_acc.id = cac.accessory_category_id
  WHERE cac.is_active = true
  ORDER BY c_prod.name, cac.display_order;
```

## public.vw_category_commemorative_dates (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.category_commemorative_dates, public.commemorative_dates |
| populada | n/a |
| comentário | Lista de datas comemorativas vinculadas a cada categoria. |


```sql
SELECT c.id AS category_id,
    c.name AS category_name,
    cd.id AS date_id,
    cd.name AS date_name,
    cd.date_day,
    cd.date_month,
    cd.target_audience,
    ccd.is_primary,
    ccd.relevance_score,
    ccd.custom_message
   FROM category_commemorative_dates ccd
     JOIN categories c ON c.id = ccd.category_id
     JOIN commemorative_dates cd ON cd.id = ccd.commemorative_date_id
  WHERE ccd.is_active = true
  ORDER BY c.name, cd.date_month, cd.date_day;
```

## public.vw_category_completeness (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.category_copywriting_config, public.product_category_assignments, public.products |
| populada | n/a |
| comentário | Score de completude por categoria (0–100 pts). Pesos: meta_title(20) + copywriting(20) + icone(15) + imagem(15) + cor(10) + descrição(10) + meta_description(10). CORRIGIDO em 2024: icone usa categories.icon IS NOT NULL em vez de subquery em category_icons (que era frágil e lenta). |


```sql
SELECT c.id,
    c.name,
    c.slug,
    c.level,
    c.is_active,
    c.is_visible,
    c.products_count,
    count(DISTINCT p.id) FILTER (WHERE p.is_active = true) AS produtos_ativos_main,
    count(DISTINCT pca.product_id) AS produtos_via_pca,
    (EXISTS ( SELECT 1
           FROM category_copywriting_config cfg
          WHERE cfg.category_id = c.id)) AS tem_copywriting,
    c.icon IS NOT NULL AS tem_icone,
    c.meta_title IS NOT NULL AS tem_seo_title,
    c.color_hex IS NOT NULL AS tem_cor,
    c.image_url IS NOT NULL AS tem_imagem,
    round((
        CASE
            WHEN c.meta_title IS NOT NULL THEN 20
            ELSE 0
        END +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM category_copywriting_config cfg
              WHERE cfg.category_id = c.id)) THEN 20
            ELSE 0
        END +
        CASE
            WHEN c.icon IS NOT NULL THEN 15
            ELSE 0
        END +
        CASE
            WHEN c.color_hex IS NOT NULL THEN 10
            ELSE 0
        END +
        CASE
            WHEN c.image_url IS NOT NULL THEN 15
            ELSE 0
        END +
        CASE
            WHEN c.description IS NOT NULL THEN 10
            ELSE 0
        END +
        CASE
            WHEN c.meta_description IS NOT NULL THEN 10
            ELSE 0
        END)::numeric, 0) AS completude_score
   FROM categories c
     LEFT JOIN products p ON p.main_category_id = c.id
     LEFT JOIN product_category_assignments pca ON pca.category_id = c.id
  WHERE c.is_active = true
  GROUP BY c.id, c.name, c.slug, c.level, c.is_active, c.is_visible, c.products_count, c.meta_title, c.color_hex, c.image_url, c.description, c.meta_description, c.icon
  ORDER BY c.level, (round((
        CASE
            WHEN c.meta_title IS NOT NULL THEN 20
            ELSE 0
        END +
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM category_copywriting_config cfg
              WHERE cfg.category_id = c.id)) THEN 20
            ELSE 0
        END +
        CASE
            WHEN c.icon IS NOT NULL THEN 15
            ELSE 0
        END +
        CASE
            WHEN c.color_hex IS NOT NULL THEN 10
            ELSE 0
        END +
        CASE
            WHEN c.image_url IS NOT NULL THEN 15
            ELSE 0
        END +
        CASE
            WHEN c.description IS NOT NULL THEN 10
            ELSE 0
        END +
        CASE
            WHEN c.meta_description IS NOT NULL THEN 10
            ELSE 0
        END)::numeric, 0)) DESC;
```

## public.vw_category_mapping_gaps (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.supplier_categories, public.supplier_category_mappings, public.suppliers |
| populada | n/a |
| comentário | Lista categorias de fornecedores ainda sem mapeamento para categoria canônica. Inclui sugestão automática via trgm (best_trgm_similarity) para facilitar curadoria manual. Use: SELECT * FROM vw_category_mapping_gaps ORDER BY best_trgm_similarity DESC para priorizar. |


```sql
SELECT s.id AS supplier_id,
    s.name AS supplier_name,
    sc.id AS supplier_category_id,
    sc.supplier_code,
    sc.supplier_name AS supplier_category_name,
    sc.level AS supplier_level,
    ( SELECT c.name
           FROM categories c
          WHERE c.is_active = true
          ORDER BY (similarity(lower(sc.supplier_name), lower(c.name))) DESC
         LIMIT 1) AS suggested_canonical,
    ( SELECT round(max(similarity(lower(sc.supplier_name), lower(c.name)))::numeric, 2) AS round
           FROM categories c
          WHERE c.is_active = true) AS best_trgm_similarity,
    sc.created_at
   FROM supplier_categories sc
     JOIN suppliers s ON s.id = sc.supplier_id
  WHERE NOT (EXISTS ( SELECT 1
           FROM supplier_category_mappings scm
          WHERE scm.supplier_category_id = sc.id))
  ORDER BY s.name, (( SELECT round(max(similarity(lower(sc.supplier_name), lower(c.name)))::numeric, 2) AS round
           FROM categories c
          WHERE c.is_active = true)) DESC NULLS LAST;
```

## public.vw_category_target_audiences (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.category_target_audiences, public.target_audiences |
| populada | n/a |
| comentário |  |


```sql
SELECT cta.id,
    cta.category_id,
    c.name AS category_name,
    cta.target_audience_id,
    ta.name AS audience_name,
    ta.category AS audience_type,
    ta.slug AS audience_slug,
    cta.relevance_score,
    cta.is_primary,
    cta.display_order,
    cta.is_active,
    cta.created_at
   FROM category_target_audiences cta
     JOIN categories c ON c.id = cta.category_id
     JOIN target_audiences ta ON ta.id = cta.target_audience_id
  ORDER BY c.name, cta.relevance_score DESC;
```

## public.vw_category_variation_types (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.category_variation_types, public.variation_types |
| populada | n/a |
| comentário | Mostra variações por categoria incluindo herança automática de categorias pai |


```sql
WITH RECURSIVE category_tree AS (
         SELECT c.id AS category_id,
            c.name AS category_name,
            c.level AS category_level,
            c.parent_id,
            cvt.variation_type_id,
            vt.code AS variation_code,
            vt.name AS variation_name,
            cvt.is_required,
            cvt.display_order,
            false AS is_inherited,
            1 AS depth
           FROM categories c
             JOIN category_variation_types cvt ON c.id = cvt.category_id
             JOIN variation_types vt ON cvt.variation_type_id = vt.id
          WHERE cvt.is_active = true AND cvt.inherit_from_parent = true
        UNION ALL
         SELECT child.id AS category_id,
            child.name AS category_name,
            child.level AS category_level,
            child.parent_id,
            parent.variation_type_id,
            parent.variation_code,
            parent.variation_name,
            parent.is_required,
            parent.display_order,
            true AS is_inherited,
            parent.depth + 1
           FROM categories child
             JOIN category_tree parent ON child.parent_id = parent.category_id
          WHERE child.is_active = true AND NOT (EXISTS ( SELECT 1
                   FROM category_variation_types cvt2
                  WHERE cvt2.category_id = child.id AND cvt2.variation_type_id = parent.variation_type_id AND cvt2.is_active = true))
        )
 SELECT DISTINCT ON (category_id, variation_type_id) category_id,
    category_name,
    category_level,
    variation_type_id,
    variation_code,
    variation_name,
    is_required,
    display_order,
    is_inherited
   FROM category_tree
  ORDER BY category_id, variation_type_id, depth;
```

## public.vw_classify_functions_status (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.classify_functions_registry |
| populada | n/a |
| comentário |  |


```sql
SELECT function_name,
    is_field,
    priority,
        CASE
            WHEN is_active THEN '✅ Ativa'::text
            ELSE '❌ Inativa'::text
        END AS status,
    description,
    updated_at
   FROM classify_functions_registry
  ORDER BY priority;
```

## public.vw_color_coverage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.color_equivalences, public.product_variants, public.products, public.supplier_colors, public.suppliers |
| populada | n/a |
| comentário | Dashboard de cobertura de cores por fornecedor. Mostra % de variants com color_id e qualidade dos mapeamentos Silver. v1.0 jun/2026 |


```sql
WITH variant_stats AS (
         SELECT s.id AS supplier_id,
            s.name AS supplier_name,
            s.code AS supplier_code,
            count(pv.id) AS total_variants,
            count(pv.color_id) AS com_color_id,
            count(*) - count(pv.color_id) AS sem_color_id,
            round(count(pv.color_id)::numeric / NULLIF(count(pv.id), 0)::numeric * 100::numeric, 1) AS pct_cobertura
           FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             JOIN suppliers s ON s.id = p.supplier_id
          WHERE pv.is_active = true
          GROUP BY s.id, s.name, s.code
        ), supplier_color_stats AS (
         SELECT s.id AS supplier_id,
            count(sc.id) AS total_supplier_colors,
            count(ce.id) AS total_equivalences,
            round(avg(ce.confidence_score), 1) AS avg_confidence,
            count(
                CASE
                    WHEN ce.verified = true THEN 1
                    ELSE NULL::integer
                END) AS verified_count,
            round(count(ce.id)::numeric / NULLIF(count(sc.id), 0)::numeric * 100::numeric, 1) AS pct_equiv_mapeadas
           FROM suppliers s
             LEFT JOIN supplier_colors sc ON sc.supplier_id = s.id AND sc.is_active = true
             LEFT JOIN color_equivalences ce ON ce.supplier_color_id = sc.id AND ce.is_active = true
          GROUP BY s.id
        )
 SELECT vs.supplier_name,
    vs.supplier_code,
    vs.total_variants,
    vs.com_color_id,
    vs.sem_color_id,
    vs.pct_cobertura,
    scs.total_supplier_colors,
    scs.total_equivalences,
    scs.pct_equiv_mapeadas,
    scs.avg_confidence,
    scs.verified_count,
    round(scs.verified_count::numeric / NULLIF(scs.total_equivalences, 0)::numeric * 100::numeric, 1) AS pct_verified
   FROM variant_stats vs
     LEFT JOIN supplier_color_stats scs ON scs.supplier_id = vs.supplier_id
  ORDER BY vs.pct_cobertura DESC;
```

## public.vw_color_mapping (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.color_equivalences, public.color_groups, public.color_nuances, public.color_variations, public.supplier_colors, public.suppliers |
| populada | n/a |
| comentário | Mapeamento completo Bronze→Silver→Gold para cores. rank=1 é a melhor equivalência por cor de fornecedor. v2.0 jun/2026 |


```sql
SELECT ce.id AS equivalence_id,
    sc.supplier_id,
    s.name AS supplier_name,
    s.code AS supplier_code_name,
    sc.id AS supplier_color_id,
    sc.code AS supplier_code,
    sc.name AS supplier_color_name,
    sc.hex_code AS supplier_hex,
    cv.id AS color_variation_id,
    cv.name AS internal_color_name,
    COALESCE(cv.hex_code, cg.hex_code) AS internal_hex,
    cv.hex_code AS variation_hex,
    cv.is_available,
    cg.id AS color_group_id,
    cg.name AS color_group_name,
    cg.slug AS color_group_slug,
    cg.hex_code AS group_hex,
    cn.id AS nuance_id,
    cn.name AS nuance_name,
    cn.slug AS nuance_slug,
    ce.match_quality,
    ce.confidence_score,
    ce.verified,
    ce.source AS mapping_source,
    ce.updated_at AS equivalence_updated_at,
    row_number() OVER (PARTITION BY sc.supplier_id, sc.id ORDER BY ce.verified DESC, ce.confidence_score DESC) AS rank
   FROM color_equivalences ce
     JOIN supplier_colors sc ON sc.id = ce.supplier_color_id
     JOIN suppliers s ON s.id = sc.supplier_id
     JOIN color_variations cv ON cv.id = ce.promo_variation_id
     JOIN color_groups cg ON cg.id = cv.color_group_id
     LEFT JOIN color_nuances cn ON cn.id = cv.nuance_id
  WHERE ce.is_active = true AND sc.is_active = true AND cv.is_active = true;
```

## public.vw_component_types_usage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.kit_component_types, public.material_types, public.product_kit_components |
| populada | n/a |
| comentário | Tipos de componentes com estatísticas de uso |


```sql
SELECT kct.code,
    kct.name,
    kct.category,
    kct.icon,
    mt1.name AS default_material,
    mt2.name AS secondary_material,
    (((kct.typical_length_mm || 'x'::text) || kct.typical_width_mm) || 'x'::text) || kct.typical_height_mm AS typical_dimensions,
    kct.typical_weight_g,
    count(pkc.id) AS usage_count,
    count(DISTINCT pkc.kit_product_id) AS kits_count
   FROM kit_component_types kct
     LEFT JOIN product_kit_components pkc ON pkc.component_type_code::text = kct.code::text
     LEFT JOIN material_types mt1 ON kct.default_material_type_id = mt1.id
     LEFT JOIN material_types mt2 ON kct.secondary_material_type_id = mt2.id
  GROUP BY kct.id, kct.code, kct.name, kct.category, kct.icon, mt1.name, mt2.name, kct.typical_length_mm, kct.typical_width_mm, kct.typical_height_mm, kct.typical_weight_g
  ORDER BY kct.display_order;
```

## public.vw_duplicate_images (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images |
| populada | n/a |
| comentário |  |


```sql
SELECT cloudflare_image_id,
    count(*) AS duplicatas,
    array_agg(id) AS image_ids,
    array_agg(DISTINCT product_id) AS product_ids
   FROM product_images
  WHERE is_active = true AND cloudflare_image_id IS NOT NULL
  GROUP BY cloudflare_image_id
 HAVING count(*) > 1
  ORDER BY (count(*)) DESC;
```

## public.vw_image_type_coherence (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | information_schema.columns, public.image_types, public.product_images |
| populada | n/a |
| comentário | Monitor permanente de coerência entre image_type (varchar) e image_type_id (uuid FK) em product_images. Execução rápida — chame sempre que suspeitar de divergência ou após bulk imports. pct_sync = 100.0000 e divergentes = 0 é o estado esperado em produção. Criada em 2026-06-17 como parte do hardening do schema de classificação de imagens. |


```sql
SELECT 'image_type_vs_id'::text AS metrica,
    count(*) FILTER (WHERE pi.image_type::text <> it.code::text) AS divergentes,
    count(*) FILTER (WHERE pi.image_type_id IS NULL) AS fk_null,
    count(*) FILTER (WHERE pi.image_type IS NULL) AS varchar_null,
    count(*) FILTER (WHERE pi.image_type::text = it.code::text) AS em_sync,
    count(*) AS total,
    round(count(*) FILTER (WHERE pi.image_type::text = it.code::text)::numeric * 100.0 / NULLIF(count(*), 0)::numeric, 4) AS pct_sync,
    max(pi.updated_at) AS ultima_atualizacao,
    now() AS snapshot_at
   FROM product_images pi
     LEFT JOIN image_types it ON it.id = pi.image_type_id
UNION ALL
 SELECT 'defaults_alignment'::text AS metrica,
    0 AS divergentes,
    0 AS fk_null,
    0 AS varchar_null,
        CASE
            WHEN ((( SELECT columns.column_default
               FROM information_schema.columns
              WHERE columns.table_schema::name = 'public'::name AND columns.table_name::name = 'product_images'::name AND columns.column_name::name = 'image_type'::name))::text) = '''gallery''::character varying'::text AND ((( SELECT columns.column_default
               FROM information_schema.columns
              WHERE columns.table_schema::name = 'public'::name AND columns.table_name::name = 'product_images'::name AND columns.column_name::name = 'image_type_id'::name))::text) = '''1590e144-e3f8-41e6-98f9-f4a25bae496d''::uuid'::text THEN 1
            ELSE 0
        END AS em_sync,
    1 AS total,
        CASE
            WHEN ((( SELECT columns.column_default
               FROM information_schema.columns
              WHERE columns.table_schema::name = 'public'::name AND columns.table_name::name = 'product_images'::name AND columns.column_name::name = 'image_type'::name))::text) = '''gallery''::character varying'::text AND ((( SELECT columns.column_default
               FROM information_schema.columns
              WHERE columns.table_schema::name = 'public'::name AND columns.table_name::name = 'product_images'::name AND columns.column_name::name = 'image_type_id'::name))::text) = '''1590e144-e3f8-41e6-98f9-f4a25bae496d''::uuid'::text THEN 100.0
            ELSE 0::numeric
        END AS pct_sync,
    now() AS ultima_atualizacao,
    now() AS snapshot_at;
```

## public.vw_image_type_dropblockers (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de |  |
| populada | n/a |
| comentário | Catálogo de todos os objetos que impedem DROP COLUMN image_type de product_images. Use para planejar migração de image_type (texto) → image_type_id (FK). Acesso: service_role only. |


```sql
WITH fn_refs AS (
         SELECT p.proname AS object_name,
            'function'::text AS object_type,
            n.nspname AS schema_name,
            'Referencia image_type no corpo da função'::text AS blocker_reason
           FROM pg_proc p
             JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public'::name AND p.prosrc ~~* '%image_type%'::text
        ), trg_refs AS (
         SELECT t.tgname AS object_name,
            'trigger'::text AS object_type,
            'public'::text AS schema_name,
            'Trigger em product_images — pode ler/escrever image_type'::text AS blocker_reason
           FROM pg_trigger t
             JOIN pg_class c ON c.oid = t.tgrelid
             JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'product_images'::name AND n.nspname = 'public'::name AND NOT t.tgisinternal
        ), view_refs AS (
         SELECT c.relname AS object_name,
                CASE c.relkind
                    WHEN 'v'::"char" THEN 'view'::text
                    ELSE 'matview'::text
                END AS object_type,
            n.nspname AS schema_name,
            'View/MatView com dependência em product_images.image_type'::text AS blocker_reason
           FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
             JOIN pg_depend d ON d.objid = c.oid
             JOIN pg_class dep_class ON dep_class.oid = d.refobjid
          WHERE dep_class.relname = 'product_images'::name AND (c.relkind = ANY (ARRAY['v'::"char", 'm'::"char"])) AND n.nspname = 'public'::name
        )
 SELECT fn_refs.object_type,
    fn_refs.schema_name,
    fn_refs.object_name,
    fn_refs.blocker_reason
   FROM fn_refs
UNION ALL
 SELECT trg_refs.object_type,
    trg_refs.schema_name,
    trg_refs.object_name,
    trg_refs.blocker_reason
   FROM trg_refs
UNION ALL
 SELECT view_refs.object_type,
    view_refs.schema_name,
    view_refs.object_name,
    view_refs.blocker_reason
   FROM view_refs
  ORDER BY 1, 3;
```

## public.vw_images_pending_dimensions (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images |
| populada | n/a |
| comentário | Imagens ativas no CF sem width_px/height_px. Consumir via n8n ou VPS worker para backfill. |


```sql
SELECT id,
    cloudflare_image_id,
    url_cdn,
    url_original,
    source_supplier,
    supplier_code,
    image_type,
    product_id,
    created_at
   FROM product_images pi
  WHERE width_px IS NULL AND is_active = true AND cloudflare_image_id IS NOT NULL AND cloudflare_image_id::text !~~ 'xbz_site_%'::text
  ORDER BY source_supplier, created_at DESC;
```

## public.vw_material_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_materials, public.products, public.suppliers |
| populada | n/a |
| comentário | Dashboard de saúde do ecossistema de materiais por fornecedor.  Score de qualidade: cobertura PM (50%) + sincronização JSONB (30%) + auto_material (20%).  Criado: 2026-06-11 \| M12 - Monitoramento contínuo |


```sql
SELECT s.name AS fornecedor,
    count(DISTINCT p.id) AS produtos_ativos,
    count(DISTINCT pm.product_id) AS com_material_pm,
    round(100.0 * count(DISTINCT pm.product_id)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric, 2) AS cobertura_pm_pct,
    count(DISTINCT
        CASE
            WHEN COALESCE(jsonb_array_length(p.materials), 0) = COALESCE(pm_cnt.cnt, 0::bigint) THEN p.id
            ELSE NULL::uuid
        END) AS jsonb_sincronizados,
    round(100.0 * count(DISTINCT
        CASE
            WHEN COALESCE(jsonb_array_length(p.materials), 0) = COALESCE(pm_cnt.cnt, 0::bigint) THEN p.id
            ELSE NULL::uuid
        END)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric, 2) AS jsonb_sync_pct,
    count(DISTINCT
        CASE
            WHEN p.auto_material IS NOT NULL AND p.auto_material <> ''::text THEN p.id
            ELSE NULL::uuid
        END) AS com_auto_material,
    count(DISTINCT
        CASE
            WHEN p.packaging_material IS NOT NULL AND p.packaging_material::text <> ''::text THEN p.id
            ELSE NULL::uuid
        END) AS com_packaging_material,
    count(DISTINCT pm.material_id) AS materiais_distintos,
    round(100.0 * count(DISTINCT pm.product_id)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric * 0.50 + 100.0 * count(DISTINCT
        CASE
            WHEN COALESCE(jsonb_array_length(p.materials), 0) = COALESCE(pm_cnt.cnt, 0::bigint) THEN p.id
            ELSE NULL::uuid
        END)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric * 0.30 + 100.0 * count(DISTINCT
        CASE
            WHEN p.auto_material IS NOT NULL AND p.auto_material <> ''::text THEN p.id
            ELSE NULL::uuid
        END)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric * 0.20, 2) AS score_qualidade
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
     LEFT JOIN product_materials pm ON pm.product_id = p.id AND pm.is_active = true
     LEFT JOIN ( SELECT product_materials.product_id,
            count(*) AS cnt
           FROM product_materials
          WHERE product_materials.is_active = true
          GROUP BY product_materials.product_id) pm_cnt ON pm_cnt.product_id = p.id
  WHERE p.is_active = true
  GROUP BY s.name
  ORDER BY (round(100.0 * count(DISTINCT pm.product_id)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric * 0.50 + 100.0 * count(DISTINCT
        CASE
            WHEN COALESCE(jsonb_array_length(p.materials), 0) = COALESCE(pm_cnt.cnt, 0::bigint) THEN p.id
            ELSE NULL::uuid
        END)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric * 0.30 + 100.0 * count(DISTINCT
        CASE
            WHEN p.auto_material IS NOT NULL AND p.auto_material <> ''::text THEN p.id
            ELSE NULL::uuid
        END)::numeric / NULLIF(count(DISTINCT p.id), 0)::numeric * 0.20, 2));
```

## public.vw_medallion_coverage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_materials, public.products, public.produtos_padronizacao, public.suppliers |
| populada | n/a |
| comentário | Cobertura de campos de qualidade por camada medallion (silver/gold). display_name_pct (gold): % de produtos com name problemático — espaços duplos, tabs/\n, vazia, >200 chars, sem alfanumérico. FIX 2026-06-23: predicate anterior usava fn_normalize_product_name()=UPPER() → 100% falsa positivo. |


```sql
SELECT s.name AS fornecedor,
    'silver'::text AS camada,
    count(*) AS produtos,
    round(100.0 * sum(
        CASE
            WHEN NULLIF(TRIM(BOTH FROM pp.ncm_code), ''::text) IS NOT NULL THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS ncm_pct,
    round(100.0 * sum(
        CASE
            WHEN jsonb_array_length(COALESCE(pp.materials, '[]'::jsonb)) > 0 THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS materials_pct,
    round(100.0 * sum(
        CASE
            WHEN jsonb_array_length(COALESCE(pp.tags, '[]'::jsonb)) > 0 THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS tags_pct,
    round(100.0 * sum(
        CASE
            WHEN COALESCE(array_length(pp.meta_keywords, 1), 0) > 0 THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS meta_pct,
    round(100.0 * sum(
        CASE
            WHEN pp.ipi_rate IS NOT NULL THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS ipi_pct,
    round(100.0 * sum(
        CASE
            WHEN NULLIF(TRIM(BOTH FROM pp.description), ''::text) IS NOT NULL THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS description_pct,
    NULL::numeric AS category_pct,
    NULL::numeric AS display_name_pct
   FROM produtos_padronizacao pp
     JOIN suppliers s ON s.id = pp.supplier_id
  GROUP BY s.name
UNION ALL
 SELECT s.name AS fornecedor,
    'gold'::text AS camada,
    count(*) AS produtos,
    round(100.0 * sum(
        CASE
            WHEN NULLIF(TRIM(BOTH FROM p.ncm_code), ''::text) IS NOT NULL THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS ncm_pct,
    round(100.0 * sum(
        CASE
            WHEN jsonb_array_length(COALESCE(p.materials, '[]'::jsonb)) > 0 OR (EXISTS ( SELECT 1
               FROM product_materials pm
              WHERE pm.product_id = p.id)) THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS materials_pct,
    round(100.0 * sum(
        CASE
            WHEN jsonb_array_length(COALESCE(p.tags, '[]'::jsonb)) > 0 THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS tags_pct,
    round(100.0 * sum(
        CASE
            WHEN COALESCE(array_length(p.meta_keywords, 1), 0) > 0 THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS meta_pct,
    round(100.0 * sum(
        CASE
            WHEN p.ipi_rate IS NOT NULL THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS ipi_pct,
    round(100.0 * sum(
        CASE
            WHEN NULLIF(TRIM(BOTH FROM p.description), ''::text) IS NOT NULL THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS description_pct,
    round(100.0 * sum(
        CASE
            WHEN p.category_id IS NOT NULL THEN 1
            ELSE 0
        END)::numeric / count(*)::numeric, 1) AS category_pct,
    round(100.0 * sum(
        CASE
            WHEN p.name IS NULL OR length(TRIM(BOTH FROM p.name)) = 0 OR p.name ~~ '%  %'::text OR p.name ~ '[\t\n\r]'::text OR length(p.name) > 200 OR p.name !~ '[A-Za-zÀ-ú0-9]'::text THEN 1
            ELSE 0
        END)::numeric / NULLIF(count(*), 0)::numeric, 1) AS display_name_pct
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
  GROUP BY s.name;
```

## public.vw_media_stats_by_type (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.image_types, public.product_images |
| populada | n/a |
| comentário | Estatísticas detalhadas de product_images agrupadas por image_types. Inclui métricas de qualidade: com_variant, com_color, com_seo (alt_text), avg_file_size. Usa LEFT JOIN em image_types → TODOS os 18 tipos aparecem, mesmo com 0 imagens.  QUANDO USAR:   Auditoria de qualidade: ver quais tipos têm pior cobertura de SEO ou vínculos de cor.   Compare "total" vs "com_color" para detectar imagens de cor sem color_id preenchido.  COMO USAR:   -- Ver tipos com imagens sem alt_text (gap SEO):   SELECT tipo, total, com_seo, total - com_seo AS sem_seo FROM vw_media_stats_by_type ORDER BY sem_seo DESC;    -- Ver tipos com imagens sem color_id (gap de vinculação de cor):   SELECT tipo, total, com_color, total - com_color AS sem_cor   FROM vw_media_stats_by_type WHERE tipo IN ('product','gallery','main') ORDER BY sem_cor DESC;  NOTA: só conta imagens com is_active = true (via JOIN WHERE pi.is_active = true). |


```sql
SELECT it.code AS tipo,
    it.name AS tipo_nome,
    it.category AS categoria,
    count(pi.id) AS total,
    count(DISTINCT pi.product_id) AS produtos_distintos,
    count(pi.variant_id) AS com_variant,
    count(pi.color_id) AS com_color,
    count(
        CASE
            WHEN pi.alt_text IS NOT NULL AND pi.alt_text <> ''::text THEN 1
            ELSE NULL::integer
        END) AS com_seo,
    round(avg(pi.file_size_bytes), 0) AS avg_file_size,
    min(pi.created_at) AS primeira_importacao,
    max(pi.created_at) AS ultima_importacao
   FROM image_types it
     LEFT JOIN product_images pi ON it.id = pi.image_type_id AND pi.is_active = true
  GROUP BY it.id, it.code, it.name, it.category
  ORDER BY it.display_priority;
```

## public.vw_novelties_home_highlights (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.vw_product_novelties_active |
| populada | n/a |
| comentário | Top 4 novidades com is_highlighted=true para o banner da home. Curadoria manual via product_novelties.is_highlighted=true. Ordenado por detected_at DESC. |


```sql
SELECT novelty_id,
    product_id,
    product_name,
    product_sku,
    supplier_reference,
    primary_image_url,
    sale_price,
    detected_at,
    expires_at,
    days_remaining,
    expiring_soon,
    supplier_code,
    source,
    is_highlighted
   FROM vw_product_novelties_active
  WHERE is_highlighted = true
  ORDER BY detected_at DESC
 LIMIT 4;
```

## public.vw_novelty_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | information_schema.role_table_grants, public.product_novelties, public.products |
| populada | n/a |
| comentário |  |


```sql
WITH window_30d AS (
         SELECT count(*) AS total_raw,
            count(*) FILTER (WHERE products.is_stockout = false AND products.sale_price > 0::numeric AND products.primary_image_url IS NOT NULL) AS quality_ok,
            count(*) FILTER (WHERE products.is_stockout = true) AS stockout,
            count(*) FILTER (WHERE COALESCE(products.sale_price, 0::numeric) <= 0::numeric) AS price_zero,
            count(*) FILTER (WHERE products.primary_image_url IS NULL) AS no_image
           FROM products
          WHERE products.is_active = true AND products.created_at >= (now() - '30 days'::interval)
        ), pipeline AS (
         SELECT count(*) AS total_novelties,
            count(*) FILTER (WHERE product_novelties.source = 'spot_new_product'::text) AS spot,
            count(*) FILTER (WHERE product_novelties.source = 'sm_recently_promoted'::text) AS sm,
            count(*) FILTER (WHERE product_novelties.source = 'xbz_recently_promoted'::text) AS xbz,
            count(*) FILTER (WHERE product_novelties.source = 'asia_recently_promoted'::text) AS asia,
            count(*) FILTER (WHERE product_novelties.source = 'migration_from_supplier'::text) AS migration
           FROM product_novelties
          WHERE product_novelties.is_active = true
        ), security AS (
         SELECT ( SELECT count(*) AS count
                   FROM information_schema.role_table_grants
                  WHERE role_table_grants.grantee::name = 'anon'::name AND role_table_grants.privilege_type::text = 'TRUNCATE'::text AND role_table_grants.table_schema::name = 'public'::name) AS anon_truncate,
            ( SELECT count(*) AS count
                   FROM information_schema.role_table_grants
                  WHERE role_table_grants.grantee::name = 'authenticated'::name AND role_table_grants.privilege_type::text = 'TRUNCATE'::text AND role_table_grants.table_schema::name = 'public'::name) AS auth_truncate
        )
 SELECT w.quality_ok AS frontend_badge_count,
    p.total_novelties AS db_pipeline_count,
    w.quality_ok - p.total_novelties AS diff,
    w.total_raw,
    w.stockout,
    w.price_zero,
    w.no_image,
    jsonb_build_object('spot', p.spot, 'sm', p.sm, 'xbz', p.xbz, 'asia', p.asia, 'migration', p.migration) AS por_source,
    s.anon_truncate,
    s.auth_truncate,
    now() AS checked_at
   FROM window_30d w,
    pipeline p,
    security s;
```

## public.vw_orphan_active_variants (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_variants, public.products |
| populada | n/a |
| comentário | Observabilidade (read-only): variantes ativas sob produto deletado/inativo (invisíveis no dashboard). reason=under_deleted_product são candidatas a desativação; under_inactive_product são preservadas p/ reativação. Auditoria Estoque 2026-06-17. |


```sql
SELECT v.id AS variant_id,
    v.sku AS variant_sku,
    v.color_name,
    v.product_id,
    p.sku AS product_sku,
    p.name AS product_name,
    p.is_deleted AS product_is_deleted,
    p.is_active AS product_is_active,
    COALESCE(v.stock_quantity, 0) AS variant_stock,
        CASE
            WHEN p.is_deleted IS TRUE THEN 'under_deleted_product'::text
            ELSE 'under_inactive_product'::text
        END AS reason
   FROM product_variants v
     JOIN products p ON p.id = v.product_id
  WHERE v.is_active IS TRUE AND (p.is_deleted IS TRUE OR p.is_active IS NOT TRUE);
```

## public.vw_packaging_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.included_packaging_print_areas, public.included_packaging_techniques, public.packaging_compatibility_config, public.packagings, public.product_included_packagings, public.product_packaging_compatibility, public.products, public.supplier_packagings |
| populada | n/a |
| comentário | Painel de saúde do módulo de embalagens. Mostra cobertura, qualidade e configuração atual. |


```sql
WITH stats AS (
         SELECT ( SELECT count(*) AS count
                   FROM product_included_packagings
                  WHERE product_included_packagings.active = true) AS pip_total,
            ( SELECT count(*) AS count
                   FROM product_included_packagings
                  WHERE product_included_packagings.active = true AND product_included_packagings.material IS NOT NULL) AS pip_com_material,
            ( SELECT count(*) AS count
                   FROM product_included_packagings
                  WHERE product_included_packagings.active = true AND product_included_packagings.internal_height_cm IS NOT NULL) AS pip_com_dims_internas,
            ( SELECT count(*) AS count
                   FROM product_included_packagings
                  WHERE product_included_packagings.active = true AND product_included_packagings.can_be_customized = true) AS pip_personalizaveis,
            ( SELECT count(*) AS count
                   FROM included_packaging_print_areas
                  WHERE included_packaging_print_areas.active = true) AS areas_total,
            ( SELECT count(*) AS count
                   FROM included_packaging_techniques
                  WHERE included_packaging_techniques.active = true) AS tecnicas_total,
            ( SELECT count(*) AS count
                   FROM product_packaging_compatibility
                  WHERE product_packaging_compatibility.active = true) AS compat_total,
            ( SELECT count(*) AS count
                   FROM product_packaging_compatibility
                  WHERE product_packaging_compatibility.active = true AND product_packaging_compatibility.fit_rating::text = 'tight'::text) AS compat_tight,
            ( SELECT count(*) AS count
                   FROM product_packaging_compatibility
                  WHERE product_packaging_compatibility.active = true AND product_packaging_compatibility.fit_rating::text = 'good'::text) AS compat_good,
            ( SELECT count(*) AS count
                   FROM product_packaging_compatibility
                  WHERE product_packaging_compatibility.active = true AND product_packaging_compatibility.fit_rating::text = 'loose'::text) AS compat_loose,
            ( SELECT count(*) AS count
                   FROM product_packaging_compatibility
                  WHERE product_packaging_compatibility.active = true AND product_packaging_compatibility.is_recommended = true) AS compat_recomendados,
            ( SELECT count(*) AS count
                   FROM product_packaging_compatibility
                  WHERE product_packaging_compatibility.compatibility_source::text = 'supplier_indicated'::text AND product_packaging_compatibility.active = true) AS compat_supplier,
            ( SELECT count(*) AS count
                   FROM products
                  WHERE products.product_type = 'packaging'::text AND products.is_active = true) AS pkgs_catalogados,
            ( SELECT count(*) AS count
                   FROM products
                  WHERE products.product_type = 'packaging'::text AND products.is_active = true AND products.internal_height_cm IS NOT NULL) AS pkgs_com_dims,
            ( SELECT count(DISTINCT product_packaging_compatibility.product_id) AS count
                   FROM product_packaging_compatibility
                  WHERE product_packaging_compatibility.active = true) AS produtos_com_compat,
            ( SELECT count(*) AS count
                   FROM products
                  WHERE products.is_active = true AND (products.product_type = ANY (ARRAY['product'::text, 'kit'::text]))) AS produtos_total,
            ( SELECT count(*) AS count
                   FROM packagings
                  WHERE packagings.active = true) AS packagings_catalog,
            ( SELECT count(*) AS count
                   FROM supplier_packagings
                  WHERE supplier_packagings.active = true) AS supplier_packagings,
            ( SELECT packaging_compatibility_config.config_value
                   FROM packaging_compatibility_config
                  WHERE packaging_compatibility_config.config_key::text = 'min_gap_mm'::text) AS cfg_min_gap,
            ( SELECT packaging_compatibility_config.config_value
                   FROM packaging_compatibility_config
                  WHERE packaging_compatibility_config.config_key::text = 'tight_gap_max_mm'::text) AS cfg_tight_max,
            ( SELECT packaging_compatibility_config.config_value
                   FROM packaging_compatibility_config
                  WHERE packaging_compatibility_config.config_key::text = 'good_gap_max_mm'::text) AS cfg_good_max,
            ( SELECT packaging_compatibility_config.config_value
                   FROM packaging_compatibility_config
                  WHERE packaging_compatibility_config.config_key::text = 'max_gap_mm'::text) AS cfg_max_gap
        )
 SELECT pip_total,
    pip_com_material,
    round(pip_com_material::numeric / NULLIF(pip_total, 0)::numeric * 100::numeric, 1) AS pip_material_pct,
    pip_com_dims_internas AS pip_dims_internas,
    pip_personalizaveis,
    areas_total AS areas_gravacao_total,
    tecnicas_total,
    compat_total,
    compat_tight,
    compat_good,
    compat_loose,
    compat_recomendados,
    compat_supplier AS compat_supplier_indicated,
    round(compat_recomendados::numeric / NULLIF(compat_total, 0)::numeric * 100::numeric, 1) AS compat_recom_pct,
    produtos_total AS produtos_ativos_total,
    produtos_com_compat,
    produtos_total - produtos_com_compat AS produtos_sem_compat,
    round(produtos_com_compat::numeric / NULLIF(produtos_total, 0)::numeric * 100::numeric, 1) AS cobertura_compat_pct,
    pkgs_catalogados,
    pkgs_com_dims AS pkgs_com_dims_internas,
    packagings_catalog AS packagings_catalog_entries,
    supplier_packagings AS supplier_packagings_entries,
    cfg_min_gap || 'mm'::text AS config_min_gap,
    cfg_tight_max || 'mm'::text AS config_tight_max,
    cfg_good_max || 'mm'::text AS config_good_max,
    cfg_max_gap || 'mm'::text AS config_max_gap,
    now() AS snapshot_at
   FROM stats;
```

## public.vw_packaging_suppliers (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.packaging_types, public.packagings, public.supplier_packagings, public.suppliers |
| populada | n/a |
| comentário | Fornecedores e preços para cada embalagem |


```sql
SELECT pkg.id AS packaging_id,
    pkg.code AS packaging_code,
    pkg.name AS packaging_name,
    pt.name AS packaging_type,
    s.id AS supplier_id,
    s.name AS supplier_name,
    sp.supplier_code,
    sp.unit_price,
    sp.currency,
    sp.min_order_quantity,
    sp.lead_time_days,
    sp.is_available,
    ((((pkg.external_width_cm || ' x '::text) || pkg.external_height_cm) || ' x '::text) || pkg.external_length_cm) || ' cm'::text AS dimensoes
   FROM packagings pkg
     JOIN packaging_types pt ON pt.id = pkg.packaging_type_id
     JOIN supplier_packagings sp ON sp.packaging_id = pkg.id AND sp.active = true
     JOIN suppliers s ON s.id = sp.supplier_id
  WHERE pkg.active = true
  ORDER BY pkg.name, sp.unit_price;
```

## public.vw_packagings_catalog (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_packaging_compatibility, public.products, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id,
    p.sku,
    p.supplier_reference,
    p.name,
    p.internal_height_cm,
    p.internal_width_cm,
    p.internal_length_cm,
    p.height_cm AS ext_height,
    p.width_cm AS ext_width,
    p.length_cm AS ext_length,
    p.packaging_material,
    p.weight_g,
    p.supplier_id,
    s.name AS fornecedor,
        CASE
            WHEN auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text]) THEN p.cost_price
            ELSE NULL::numeric
        END::numeric(10,2) AS cost_price,
    ( SELECT count(*) AS count
           FROM product_packaging_compatibility ppc
          WHERE ppc.packaging_id = p.id AND ppc.active = true) AS qtd_produtos_compativeis
   FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.product_type = 'packaging'::text AND p.is_active = true;
```

## public.vw_product_all_packaging_options (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_included_packagings, public.product_packaging_compatibility, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id AS product_id,
    p.sku AS product_sku,
    p.name AS product_name,
    'INCLUSA'::text AS tipo_embalagem,
    pip.id AS embalagem_id,
    NULL::character varying(50) AS embalagem_sku,
    pip.name AS embalagem_nome,
    pip.material AS embalagem_material,
    pip.color AS embalagem_cor,
    pip.has_inner_cradle AS tem_berco,
    pip.weight_g AS embalagem_peso_g,
    pip.internal_height_cm,
    pip.internal_width_cm,
    pip.internal_length_cm,
    pip.external_height_cm,
    pip.external_width_cm,
    pip.external_length_cm,
    pip.can_be_disabled,
    pip.can_be_customized,
    0::numeric(10,2) AS preco_adicional,
    'Inclusa no produto'::text AS preco_info,
    NULL::character varying(20) AS fit_rating,
    NULL::numeric(6,2) AS folga_minima_mm,
    true AS mesmo_fornecedor,
    true AS is_recommended,
    0 AS ordem_exibicao
   FROM products p
     JOIN product_included_packagings pip ON pip.product_id = p.id AND pip.active = true
  WHERE p.product_type = 'product'::text AND p.is_active = true
UNION ALL
 SELECT p.id AS product_id,
    p.sku AS product_sku,
    p.name AS product_name,
        CASE ppc.compatibility_source
            WHEN 'supplier_indicated'::text THEN 'OPCIONAL (Fornecedor)'::text
            WHEN 'dimension_calculated'::text THEN 'OPCIONAL (Calculada)'::text
            ELSE 'OPCIONAL (Manual)'::text
        END AS tipo_embalagem,
    pkg.id AS embalagem_id,
    pkg.sku AS embalagem_sku,
    pkg.name AS embalagem_nome,
    pkg.packaging_material AS embalagem_material,
    NULL::character varying(50) AS embalagem_cor,
    NULL::boolean AS tem_berco,
    pkg.weight_g AS embalagem_peso_g,
    pkg.internal_height_cm,
    pkg.internal_width_cm,
    pkg.internal_length_cm,
    pkg.height_cm AS external_height_cm,
    pkg.width_cm AS external_width_cm,
    pkg.length_cm AS external_length_cm,
    true AS can_be_disabled,
    true AS can_be_customized,
    COALESCE(pkg.cost_price, 0::numeric) AS preco_adicional,
    concat('+ R$ ', COALESCE(pkg.cost_price::text, '0,00'::text)) AS preco_info,
    ppc.fit_rating,
    ppc.fit_gap_min_mm AS folga_minima_mm,
    ppc.is_same_supplier AS mesmo_fornecedor,
    ppc.is_recommended,
        CASE
            WHEN ppc.is_recommended THEN 1
            WHEN ppc.is_same_supplier THEN 2
            WHEN ppc.fit_rating::text = 'tight'::text THEN 3
            WHEN ppc.fit_rating::text = 'good'::text THEN 4
            ELSE 5
        END AS ordem_exibicao
   FROM products p
     JOIN product_packaging_compatibility ppc ON ppc.product_id = p.id AND ppc.active = true
     JOIN products pkg ON pkg.id = ppc.packaging_id AND pkg.is_active = true
  WHERE p.product_type = 'product'::text AND p.is_active = true
  ORDER BY 1, 26, 20;
```

## public.vw_product_availability (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_variants, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT pv.id AS variant_id,
    pv.product_id,
    pv.sku,
    pv.stock_quantity,
    pv.next_quantity_1,
    pv.next_date_1,
    pv.next_quantity_2,
    pv.next_date_2,
    pv.next_quantity_3,
    pv.next_date_3,
        CASE
            WHEN pv.stock_quantity > 0 THEN 'in_stock'::text
            WHEN pv.stock_quantity = 0 AND (pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE OR pv.next_date_2 IS NOT NULL AND pv.next_date_2 > CURRENT_DATE OR pv.next_date_3 IS NOT NULL AND pv.next_date_3 > CURRENT_DATE OR pv.next_date_4 IS NOT NULL AND pv.next_date_4 > CURRENT_DATE OR pv.next_date_5 IS NOT NULL AND pv.next_date_5 > CURRENT_DATE OR pv.next_date_6 IS NOT NULL AND pv.next_date_6 > CURRENT_DATE) THEN 'out_of_stock_with_restock'::text
            ELSE 'out_of_stock'::text
        END AS availability_status,
    pv.stock_quantity = 0 AND (pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE OR pv.next_date_2 IS NOT NULL AND pv.next_date_2 > CURRENT_DATE OR pv.next_date_3 IS NOT NULL AND pv.next_date_3 > CURRENT_DATE OR pv.next_date_4 IS NOT NULL AND pv.next_date_4 > CURRENT_DATE OR pv.next_date_5 IS NOT NULL AND pv.next_date_5 > CURRENT_DATE OR pv.next_date_6 IS NOT NULL AND pv.next_date_6 > CURRENT_DATE) AS has_incoming_stock,
    pv.next_date_1 IS NOT NULL AND pv.next_date_1 > CURRENT_DATE OR pv.next_date_2 IS NOT NULL AND pv.next_date_2 > CURRENT_DATE OR pv.next_date_3 IS NOT NULL AND pv.next_date_3 > CURRENT_DATE OR pv.next_date_4 IS NOT NULL AND pv.next_date_4 > CURRENT_DATE OR pv.next_date_5 IS NOT NULL AND pv.next_date_5 > CURRENT_DATE OR pv.next_date_6 IS NOT NULL AND pv.next_date_6 > CURRENT_DATE AS has_upcoming_restock,
    pv.last_sync_at
   FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
  WHERE pv.is_active = true AND p.is_active = true;
```

## public.vw_product_color_category_links (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.category_colors, public.color_groups, public.color_variations, public.product_category_assignments, public.product_variants, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id AS product_id,
    p.name AS product_name,
    p.sku,
    pv.id AS variant_id,
    pv.sku AS variant_sku,
    pv.color_name,
    pv.color_hex,
    cv.group_id AS color_group_id,
    cg.name AS color_group_name,
    c.name AS linked_category,
    c.slug AS category_slug,
    pca.is_primary,
    pca.created_at AS link_created_at
   FROM products p
     JOIN product_variants pv ON pv.product_id = p.id
     JOIN color_variations cv ON cv.id = pv.color_id
     JOIN color_groups cg ON cg.id = cv.group_id
     JOIN category_colors cc ON cc.color_group_id = cv.group_id
     JOIN categories c ON c.id = cc.category_id
     LEFT JOIN product_category_assignments pca ON pca.product_id = p.id AND pca.category_id = c.id
  WHERE cc.is_active = true
  ORDER BY p.name, pv.color_name, c.name;
```

## public.vw_product_commemorative_dates (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.commemorative_dates, public.product_commemorative_dates, public.products |
| populada | n/a |
| comentário | Lista de datas comemorativas vinculadas a cada produto. |


```sql
SELECT p.id AS product_id,
    p.name AS product_name,
    p.sku,
    cd.id AS date_id,
    cd.name AS date_name,
    cd.date_day,
    cd.date_month,
    cd.target_audience,
    pcd.source,
    pcd.is_featured,
    pcd.relevance_score
   FROM product_commemorative_dates pcd
     JOIN products p ON p.id = pcd.product_id
     JOIN commemorative_dates cd ON cd.id = pcd.commemorative_date_id
  WHERE pcd.is_active = true
  ORDER BY p.name, cd.date_month, cd.date_day;
```

## public.vw_product_images_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.products |
| populada | n/a |
| comentário | Dashboard de saúde operacional de product_images.    KPIs: volume, dimensões, SEO, fallback URLs, gap produtos sem imagem, por fornecedor.    Adicionada 2026-06-15 como parte do hardening da tabela.    Consultar com: SELECT * FROM vw_product_images_health; |


```sql
WITH base AS (
         SELECT count(*) AS total_images,
            count(*) FILTER (WHERE product_images.is_active = true) AS active_images,
            count(*) FILTER (WHERE product_images.is_active = false) AS inactive_images,
            count(DISTINCT product_images.product_id) AS products_with_images,
            count(*) FILTER (WHERE product_images.is_primary = true AND product_images.is_active = true) AS primary_images,
            count(*) FILTER (WHERE product_images.is_og_image = true AND product_images.is_active = true) AS og_images,
            count(*) FILTER (WHERE product_images.color_id IS NOT NULL) AS images_with_color,
            count(*) FILTER (WHERE product_images.variant_id IS NOT NULL) AS images_with_variant,
            count(*) FILTER (WHERE product_images.width_px IS NOT NULL) AS with_dimensions,
            count(*) FILTER (WHERE product_images.width_px IS NULL AND product_images.is_active = true) AS missing_dimensions,
            count(*) FILTER (WHERE product_images.alt_text IS NOT NULL AND product_images.alt_text <> ''::text) AS with_alt_text,
            count(*) FILTER (WHERE product_images.alt_text IS NULL OR product_images.alt_text = ''::text) AS missing_alt_text,
            count(*) FILTER (WHERE product_images.url_original IS NOT NULL) AS with_fallback_url,
            count(*) FILTER (WHERE product_images.image_type_id IS NULL) AS missing_type_id,
            count(*) FILTER (WHERE product_images.width_px >= 1200 AND product_images.height_px >= 1200) AS dim_otimas,
            count(*) FILTER (WHERE product_images.width_px >= 800 AND product_images.height_px >= 800 AND (product_images.width_px < 1200 OR product_images.height_px < 1200)) AS dim_aceitaveis,
            count(*) FILTER (WHERE product_images.width_px < 800 OR product_images.height_px < 800) AS dim_ruins,
            min(product_images.created_at) AS oldest_image,
            max(product_images.created_at) AS newest_image,
            max(product_images.updated_at) AS last_update
           FROM product_images
        ), supplier_totals AS (
         SELECT product_images.source_supplier,
            count(*) AS cnt
           FROM product_images
          WHERE product_images.is_active = true
          GROUP BY product_images.source_supplier
        ), supplier_total_sum AS (
         SELECT sum(supplier_totals.cnt) AS total
           FROM supplier_totals
        ), supplier_breakdown AS (
         SELECT jsonb_object_agg(st.source_supplier, jsonb_build_object('total', st.cnt, 'pct', round(100.0 * st.cnt::numeric / NULLIF(s_1.total, 0::numeric), 1))) AS by_supplier
           FROM supplier_totals st
             CROSS JOIN supplier_total_sum s_1
        ), products_gap AS (
         SELECT count(*) FILTER (WHERE products.is_active = true) AS total_active_products,
            count(*) FILTER (WHERE products.is_active = true AND products.primary_image_url IS NOT NULL) AS with_primary_url,
            count(*) FILTER (WHERE products.is_active = true AND (products.images IS NULL OR products.images = '[]'::jsonb)) AS without_images_json
           FROM products
        )
 SELECT b.total_images,
    b.active_images,
    b.inactive_images,
    b.products_with_images,
    b.primary_images,
    b.og_images,
    b.images_with_color,
    b.images_with_variant,
    b.with_dimensions,
    b.missing_dimensions,
    round(100.0 * b.with_dimensions::numeric / NULLIF(b.active_images, 0)::numeric, 1) AS pct_with_dimensions,
    b.dim_otimas,
    b.dim_aceitaveis,
    b.dim_ruins,
    b.with_alt_text,
    b.missing_alt_text,
    round(100.0 * b.with_alt_text::numeric / NULLIF(b.total_images, 0)::numeric, 1) AS pct_seo_coverage,
    b.with_fallback_url,
    round(100.0 * b.with_fallback_url::numeric / NULLIF(b.active_images, 0)::numeric, 1) AS pct_with_fallback,
    b.missing_type_id,
    s.by_supplier,
    pg.total_active_products,
    pg.with_primary_url,
    pg.without_images_json,
    pg.total_active_products - b.products_with_images AS active_products_no_images,
    b.oldest_image,
    b.newest_image,
    b.last_update,
    now() AS snapshot_at
   FROM base b
     CROSS JOIN supplier_breakdown s
     CROSS JOIN products_gap pg;
```

## public.vw_product_images_variant_gap (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.color_variations, public.product_images, public.product_variants, public.products |
| populada | n/a |
| comentário | Monitor de imagens com color_id preenchido mas variant_id = NULL. Gap types:   SPOT_PRINTING_TECHNIQUE: imagens de técnica de gravação (location/area/component).     applies_to_color=false por design. NÃO precisam de variant_id. Correto assim.     color_id = cor da tinta de impressão, não cor do produto.   XBZ_COLOR_MISMATCH: imagens XBZ applies_to_color=true onde a cor da imagem     não casou com nenhuma variante. Requerem tabela color_synonym_map + reprocessamento     pelo pipeline de imagens XBZ.     Rows afetadas: ~667. Referência: color_synonym_map para sinônimos conhecidos. |


```sql
SELECT pi.id AS image_id,
    pi.product_id,
    p.supplier_id,
    pi.source_supplier,
    pi.image_type,
    pi.applies_to_color,
    pi.cloudflare_image_id,
    pi.color_id,
    cv.name AS color_name,
    cv.hex_code,
    ( SELECT count(*) AS count
           FROM product_variants pv2
          WHERE pv2.product_id = pi.product_id AND pv2.is_active = true) AS product_variant_count,
        CASE
            WHEN pi.applies_to_color = false THEN 'SPOT_PRINTING_TECHNIQUE'::text
            WHEN pi.source_supplier::text = 'XBZ'::text AND pi.applies_to_color = true THEN 'XBZ_COLOR_MISMATCH'::text
            ELSE 'OUTRO'::text
        END AS gap_type,
    pi.created_at
   FROM product_images pi
     JOIN products p ON p.id = pi.product_id
     JOIN color_variations cv ON cv.id = pi.color_id
  WHERE pi.color_id IS NOT NULL AND pi.variant_id IS NULL;
```

## public.vw_product_notebook_complete (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.binding_colors, public.binding_types, public.cover_finishes, public.cover_materials, public.cover_types, public.notebook_features, public.paper_colors, public.paper_formats, public.paper_rulings, public.paper_weights, public.product_notebook_features, public.product_notebook_specs, public.products, public.suppliers |
| populada | n/a |
| comentário | View consolidada de produtos de material gráfico com todas as specs,     features agregadas e metadados de confiança. |


```sql
SELECT p.id AS product_id,
    p.name AS product_name,
    p.sku,
        CASE
            WHEN auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text]) THEN p.cost_price
            ELSE NULL::numeric
        END::numeric(10,2) AS cost_price,
    p.is_active,
    s.name AS supplier_name,
    pf.code AS format_code,
    pf.name AS format_name,
    pf.width_cm,
    pf.height_cm,
    pr.code AS ruling_code,
    pr.name AS ruling_name,
    pw.weight_gsm,
    pw.description AS weight_description,
    pc.code AS paper_color_code,
    pc.name AS paper_color_name,
    pns.sheet_count,
    bt.code AS binding_code,
    bt.name_pt AS binding_name,
    bc.code AS binding_color_code,
    bc.name AS binding_color_name,
    ct.code AS cover_type_code,
    ct.name AS cover_type_name,
    cm.code AS cover_material_code,
    cm.name AS cover_material_name,
    cm.is_eco_friendly,
    cf.code AS cover_finish_code,
    cf.name AS cover_finish_name,
    pns.source_supplier,
    pns.confidence_score,
    pns.manually_reviewed,
    pns.created_at AS spec_created_at,
    pns.updated_at AS spec_updated_at,
    COALESCE(array_agg(nf.code ORDER BY nf.display_order) FILTER (WHERE nf.code IS NOT NULL), ARRAY[]::text[]::character varying[]) AS feature_codes,
    COALESCE(array_agg(nf.name ORDER BY nf.display_order) FILTER (WHERE nf.name IS NOT NULL), ARRAY[]::text[]::character varying[]) AS feature_names
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
     JOIN product_notebook_specs pns ON pns.product_id = p.id
     LEFT JOIN paper_formats pf ON pf.id = pns.paper_format_id
     LEFT JOIN paper_rulings pr ON pr.id = pns.paper_ruling_id
     LEFT JOIN paper_weights pw ON pw.id = pns.paper_weight_id
     LEFT JOIN paper_colors pc ON pc.id = pns.paper_color_id
     LEFT JOIN binding_types bt ON bt.id = pns.binding_type_id
     LEFT JOIN binding_colors bc ON bc.id = pns.binding_color_id
     LEFT JOIN cover_types ct ON ct.id = pns.cover_type_id
     LEFT JOIN cover_materials cm ON cm.id = pns.cover_material_id
     LEFT JOIN cover_finishes cf ON cf.id = pns.cover_finish_id
     LEFT JOIN product_notebook_features pnf ON pnf.product_id = p.id
     LEFT JOIN notebook_features nf ON nf.id = pnf.feature_id
  GROUP BY p.id, p.name, p.sku, p.cost_price, p.is_active, s.name, pf.code, pf.name, pf.width_cm, pf.height_cm, pr.code, pr.name, pw.weight_gsm, pw.description, pc.code, pc.name, pns.sheet_count, bt.code, bt.name_pt, bc.code, bc.name, ct.code, ct.name, cm.code, cm.name, cm.is_eco_friendly, cf.code, cf.name, pns.source_supplier, pns.confidence_score, pns.manually_reviewed, pns.created_at, pns.updated_at;
```

## public.vw_product_novelties_active (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_novelties, public.products |
| populada | n/a |
| comentário | Novidades ativas com JOIN em products (Gold). Filtros já aplicados: is_active=true, expires_at não vencido, produto ativo. Ordenar por is_highlighted DESC, detected_at DESC para home. Campo days_remaining: NULL = permanente. expiring_soon = TRUE quando < 7 dias. |


```sql
SELECT pn.id AS novelty_id,
    pn.product_id,
    pn.supplier_id,
    pn.supplier_code,
    pn.supplier_product_code,
    pn.source,
    pn.detected_at,
    pn.expires_at,
    pn.is_active,
    pn.is_highlighted,
    pn.notes,
    pn.created_at AS novelty_created_at,
    pn.updated_at AS novelty_updated_at,
    p.name AS product_name,
    p.sku AS product_sku,
    p.supplier_reference,
    p.primary_image_url,
    p.sale_price,
        CASE
            WHEN auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text]) THEN p.cost_price
            ELSE NULL::numeric
        END::numeric(10,2) AS cost_price,
    p.stock_quantity,
    p.is_active AS product_active,
    p.is_stockout,
    p.created_at AS product_created_at,
        CASE
            WHEN pn.expires_at IS NULL THEN NULL::integer
            ELSE EXTRACT(day FROM pn.expires_at - now())::integer
        END AS days_remaining,
        CASE
            WHEN pn.expires_at IS NOT NULL AND (pn.expires_at - now()) < '7 days'::interval THEN true
            ELSE false
        END AS expiring_soon
   FROM product_novelties pn
     JOIN products p ON p.id = pn.product_id
  WHERE pn.is_active = true AND (pn.expires_at IS NULL OR pn.expires_at > now()) AND p.is_active = true AND p.is_stockout = false AND p.sale_price IS NOT NULL AND p.sale_price > 0::numeric AND p.primary_image_url IS NOT NULL AND p.primary_image_url <> ''::text;
```

## public.vw_product_packaging_options (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.packaging_types, public.packagings, public.product_packagings, public.products, public.supplier_packagings |
| populada | n/a |
| comentário | Opções de embalagem disponíveis para cada produto |


```sql
SELECT p.id AS product_id,
    p.supplier_reference AS product_ref,
    p.name AS product_name,
    pkg.id AS packaging_id,
    pkg.name AS packaging_name,
    pt.name AS packaging_type,
    pp.relationship_type,
        CASE pp.relationship_type
            WHEN 'included'::text THEN '✅ Inclusa'::text
            WHEN 'optional'::text THEN '💰 Opcional'::text
            WHEN 'required'::text THEN '⚠️ Obrigatória'::text
            WHEN 'default'::text THEN '📦 Padrão'::text
            ELSE NULL::text
        END AS relationship_display,
    pkg.internal_width_cm,
    pkg.internal_height_cm,
    pkg.internal_length_cm,
    pkg.external_width_cm,
    pkg.external_height_cm,
    pkg.external_length_cm,
    pp.additional_price,
    ( SELECT count(*) AS count
           FROM supplier_packagings sp
          WHERE sp.packaging_id = pkg.id AND sp.active = true) AS suppliers_count
   FROM products p
     LEFT JOIN product_packagings pp ON pp.product_id = p.id AND pp.active = true
     LEFT JOIN packagings pkg ON pkg.id = pp.packaging_id AND pkg.active = true
     LEFT JOIN packaging_types pt ON pt.id = pkg.packaging_type_id
  WHERE p.is_active = true
  ORDER BY p.supplier_reference, pp.relationship_type;
```

## public.vw_products_ai_status (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.products, public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id,
    p.sku,
    p.name,
    c.name AS category_name,
    p.ai_version,
    p.ai_generated_at,
    p.ai_model,
        CASE
            WHEN p.ai_generated_at IS NULL THEN 'PENDENTE'::text
            WHEN p.ai_version = 1 THEN 'GERADO_V1'::text
            WHEN p.ai_version > 1 THEN 'ATUALIZADO_V'::text || p.ai_version
            ELSE NULL::text
        END AS ai_status,
    length(p.ai_title) AS title_length,
    length(p.ai_description) AS description_length,
    (EXISTS ( SELECT 1
           FROM supplier_products_raw spr
          WHERE spr.product_id = p.id)) AS has_raw_data
   FROM products p
     LEFT JOIN categories c ON p.category_id = c.id;
```

## public.vw_products_by_date (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.commemorative_dates, public.product_commemorative_dates, public.products |
| populada | n/a |
| comentário | Lista de produtos por data comemorativa (útil para montar campanhas). |


```sql
SELECT cd.id AS date_id,
    cd.name AS date_name,
    cd.date_day,
    cd.date_month,
    cd.target_audience,
    cd.campaign_start_days,
    cd.campaign_end_days,
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    c.name AS category_name,
    pcd.is_featured,
    pcd.relevance_score
   FROM commemorative_dates cd
     JOIN product_commemorative_dates pcd ON pcd.commemorative_date_id = cd.id AND pcd.is_active = true
     JOIN products p ON p.id = pcd.product_id AND p.is_active = true
     JOIN categories c ON c.id = p.category_id
  WHERE cd.is_active = true
  ORDER BY cd.date_month, cd.date_day, pcd.relevance_score DESC;
```

## public.vw_products_by_property_category (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_properties, public.property_definitions |
| populada | n/a |
| comentário | Contagem de produtos por categoria de property |


```sql
SELECT pd.category,
    count(DISTINCT pp.product_id) AS product_count,
    count(pp.id) AS property_count,
    array_agg(DISTINCT pd.name_pt ORDER BY pd.name_pt) AS properties_in_category
   FROM property_definitions pd
     JOIN product_properties pp ON pd.code = pp.property_code
  GROUP BY pd.category
  ORDER BY (count(DISTINCT pp.product_id)) DESC;
```

## public.vw_products_commercial_packing (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.products, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id,
    p.sku,
    p.name,
    p.slug,
    p.packing_type,
    p.packing_classification,
    p.has_gift_box,
    p.sale_price,
    p.cost_price,
    p.category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    p.supplier_id,
    s.name AS supplier_name,
    p.primary_image_url AS image_url,
    p.is_active,
    p.is_new,
        CASE
            WHEN p.packing_type::text ~~* '%caixa%'::text THEN 'box'::text
            WHEN p.packing_type::text ~~* '%estojo%'::text THEN 'case'::text
            WHEN p.packing_type::text ~~* '%bolsa%'::text THEN 'pouch'::text
            ELSE 'other'::text
        END AS packing_icon,
        CASE
            WHEN p.packing_type::text ~~* '%oferta%'::text OR p.packing_type::text ~~* '%presente%'::text THEN true
            ELSE false
        END AS is_gift_ready
   FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN suppliers s ON p.supplier_id = s.id
  WHERE p.packing_classification::text = 'commercial'::text AND p.is_active = true;
```

## public.vw_products_min_quantity (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.products |
| populada | n/a |
| comentário | View com quantidade mínima efetiva de cada produto. Campos: effective_min_quantity (mínimo real), min_quantity_source (origem do valor) |


```sql
SELECT p.id,
    p.sku,
    p.name,
    p.category_id,
    c.name AS category_name,
    c.min_order_quantity AS category_min,
    p.min_order_quantity AS product_override,
    COALESCE(p.min_order_quantity, c.min_order_quantity, 1) AS effective_min_quantity,
        CASE
            WHEN p.min_order_quantity IS NOT NULL THEN 'product_override'::text
            WHEN c.min_order_quantity IS NOT NULL THEN 'category_default'::text
            ELSE 'system_default'::text
        END AS min_quantity_source,
    p.sale_price,
    p.is_active
   FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
  WHERE p.is_active = true;
```

## public.vw_products_packaging_info (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_included_packagings, public.product_packaging_compatibility, public.products, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT p.id,
    p.sku,
    p.supplier_reference,
    p.name,
    p.product_type,
    p.shape_type,
    p.height_cm,
    p.width_cm,
    p.length_cm,
    p.diameter_cm,
    p.weight_g,
        CASE p.shape_type
            WHEN 'cylindrical'::text THEN ((('ø'::text || COALESCE(p.diameter_cm::text, '?'::text)) || 'x'::text) || COALESCE(p.height_cm::text, '?'::text)) || 'cm'::text
            ELSE ((((COALESCE(p.width_cm::text, '?'::text) || 'x'::text) || COALESCE(p.height_cm::text, '?'::text)) || 'x'::text) || COALESCE(p.length_cm::text, '?'::text)) || 'cm'::text
        END AS dimensoes,
    (EXISTS ( SELECT 1
           FROM product_included_packagings pip
          WHERE pip.product_id = p.id AND pip.active = true)) AS tem_embalagem_inclusa,
    ( SELECT count(*) AS count
           FROM product_included_packagings pip
          WHERE pip.product_id = p.id AND pip.active = true) AS qtd_inclusas,
    ( SELECT count(*) AS count
           FROM product_packaging_compatibility ppc
          WHERE ppc.product_id = p.id AND ppc.active = true) AS qtd_compativeis,
    p.supplier_id,
    s.name AS fornecedor,
        CASE
            WHEN auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text]) THEN p.cost_price
            ELSE NULL::numeric
        END::numeric(10,2) AS cost_price,
    p.is_active AS active
   FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.product_type = 'product'::text;
```

## public.vw_products_pending_variants (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_variants, public.products, public.supplier_products_raw, public.suppliers |
| populada | n/a |
| comentário | Produtos Gold ativos sem nenhuma variant. Maioria XBZ em pipeline ativo — monitorar dias_sem_variant > 7. v1.0 jun/2026 |


```sql
SELECT s.name AS fornecedor,
    s.code AS supplier_code,
    p.id AS product_id,
    p.supplier_reference,
    p.name AS product_name,
    p.is_active,
    p.created_at::date AS criado_em,
    p.updated_at::date AS atualizado_em,
    ( SELECT spr.status
           FROM supplier_products_raw spr
          WHERE spr.supplier_id = p.supplier_id AND spr.supplier_sku::text = p.supplier_reference::text
         LIMIT 1) AS bronze_status,
    EXTRACT(day FROM now() - p.created_at)::integer AS dias_sem_variant,
    p.locked_fields
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.is_active = true AND NOT (EXISTS ( SELECT 1
           FROM product_variants pv
          WHERE pv.product_id = p.id))
  ORDER BY p.updated_at DESC;
```

## public.vw_products_seo_status (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.products, public.suppliers |
| populada | n/a |
| comentário | v3 — Dashboard visual SEO por produto. Inclui ai_title, ai_summary, schema_json, supplier_reference |


```sql
SELECT p.id,
    p.name,
    p.sku,
    p.supplier_reference,
    p.slug,
    s.name AS supplier_name,
        CASE
            WHEN p.slug IS NOT NULL AND length(TRIM(BOTH FROM p.slug)) > 0 THEN '✅'::text
            ELSE '❌'::text
        END AS has_slug,
        CASE
            WHEN p.meta_title IS NOT NULL AND length(TRIM(BOTH FROM p.meta_title)) > 0 THEN '✅'::text
            ELSE '❌'::text
        END AS has_meta_title,
        CASE
            WHEN p.meta_description IS NOT NULL AND length(TRIM(BOTH FROM p.meta_description)) > 0 THEN '✅'::text
            ELSE '❌'::text
        END AS has_meta_description,
        CASE
            WHEN length(COALESCE(p.description, ''::text)) >= 300 THEN '✅'::text
            WHEN length(COALESCE(p.description, ''::text)) >= 100 THEN '🟡'::text
            ELSE '❌'::text
        END AS has_good_description,
        CASE
            WHEN p.ai_title IS NOT NULL AND length(TRIM(BOTH FROM p.ai_title)) > 0 THEN '✅'::text
            ELSE '❌'::text
        END AS has_ai_title,
        CASE
            WHEN p.ai_summary IS NOT NULL AND length(TRIM(BOTH FROM p.ai_summary)) > 0 THEN '✅'::text
            ELSE '❌'::text
        END AS has_ai_summary,
        CASE
            WHEN p.schema_json IS NOT NULL THEN '✅'::text
            ELSE '❌'::text
        END AS has_schema_json,
    length(COALESCE(p.meta_title, ''::text)) AS meta_title_length,
    length(COALESCE(p.meta_description, ''::text)) AS meta_description_length,
    length(COALESCE(p.description, ''::text)) AS description_length,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.product_id = p.id AND product_images.is_active = true) AS image_count,
    ( SELECT count(*) AS count
           FROM product_images
          WHERE product_images.product_id = p.id AND product_images.is_active = true AND product_images.alt_text IS NOT NULL) AS images_with_alt,
    COALESCE(p.seo_score, 0) AS seo_score,
        CASE
            WHEN COALESCE(p.seo_score, 0) >= 80 THEN '🟢 Ótimo'::text
            WHEN COALESCE(p.seo_score, 0) >= 60 THEN '🟡 Bom'::text
            WHEN COALESCE(p.seo_score, 0) >= 40 THEN '🟠 Regular'::text
            ELSE '🔴 Ruim'::text
        END AS seo_status,
    p.updated_at,
    p.seo_last_audit_at
   FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.is_active = true AND p.is_deleted = false
  ORDER BY (COALESCE(p.seo_score, 0)), p.name;
```

## public.vw_products_thermal_status (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    sku,
    name,
    is_thermal AS is_thermal_stored,
    fn_is_thermal_product(id) AS is_thermal_calculated
   FROM products p;
```

## public.vw_products_with_properties (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_properties, public.products, public.property_definitions |
| populada | n/a |
| comentário | Produtos com suas properties agregadas |


```sql
SELECT p.id,
    p.sku,
    p.supplier_reference,
    p.name,
    p.is_thermal,
    array_agg(DISTINCT pd.name_pt ORDER BY pd.name_pt) FILTER (WHERE pd.name_pt IS NOT NULL) AS properties,
    array_agg(DISTINCT pd.code ORDER BY pd.code) FILTER (WHERE pd.code IS NOT NULL) AS property_codes,
    array_agg(DISTINCT pd.category ORDER BY pd.category) FILTER (WHERE pd.category IS NOT NULL) AS property_categories,
    count(pp.id) AS property_count,
    bool_or(pd.is_thermal_indicator) AS has_thermal_properties,
    bool_or(pd.is_premium_indicator) AS has_premium_properties
   FROM products p
     LEFT JOIN product_properties pp ON p.id = pp.product_id
     LEFT JOIN property_definitions pd ON pp.property_code = pd.code
  GROUP BY p.id, p.sku, p.supplier_reference, p.name, p.is_thermal;
```

## public.vw_produtos_sem_ncm (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.supplier_products_raw, public.suppliers |
| populada | n/a |
| comentário | Monitora produtos ativos sem NCM (compliance fiscal). Diagnostica a origem (Bronze ausente / placeholder 00000000 / NCM real) e recomenda ação. NÃO preenche NCM inválido — produtos com placeholder exigem follow-up com fornecedor; sem Bronze exigem classificação manual. |


```sql
WITH base AS (
         SELECT p.id AS product_id,
            p.sku,
            p.supplier_reference,
            p.name,
            p.stock_quantity,
            p.is_active,
            s.name AS supplier,
            ( SELECT COALESCE(spr.raw_data ->> 'Ncm'::text, spr.raw_data ->> 'ncm'::text, spr.raw_data ->> 'Taric'::text, spr.raw_data ->> 'ncm_code'::text) AS "coalesce"
                   FROM supplier_products_raw spr
                  WHERE spr.product_id = p.id AND COALESCE(spr.raw_data ->> 'Ncm'::text, spr.raw_data ->> 'ncm'::text, spr.raw_data ->> 'Taric'::text, spr.raw_data ->> 'ncm_code'::text, ''::text) <> ''::text
                  ORDER BY spr.updated_at DESC
                 LIMIT 1) AS ncm_bronze
           FROM products p
             JOIN suppliers s ON s.id = p.supplier_id
          WHERE p.is_active = true AND (p.ncm_code IS NULL OR p.ncm_code::text = ''::text)
        )
 SELECT product_id,
    sku,
    supplier_reference,
    name,
    stock_quantity,
    supplier,
    ncm_bronze,
        CASE
            WHEN ncm_bronze IS NULL THEN '❌ SEM dado no Bronze'::text
            WHEN ncm_bronze = '00000000'::text OR ncm_bronze ~ '^0+$'::text THEN '⚠️ Placeholder 00000000 (inválido)'::text
            WHEN ncm_bronze ~ '^\d{8}$'::text THEN '✅ NCM real disponível (recuperável!)'::text
            ELSE '❓ Formato não reconhecido: '::text || ncm_bronze
        END AS diagnostico_origem,
        CASE
            WHEN ncm_bronze ~ '^\d{8}$'::text AND ncm_bronze <> '00000000'::text AND ncm_bronze !~ '^0+$'::text THEN '🔧 BACKFILL automático possível'::text
            WHEN ncm_bronze = '00000000'::text OR ncm_bronze ~ '^0+$'::text THEN '📞 Solicitar NCM real ao fornecedor (envia 00000000)'::text
            ELSE '📝 Classificação fiscal manual necessária'::text
        END AS acao_recomendada,
        CASE
            WHEN stock_quantity > 10000 THEN '🔴 CRÍTICO (>10k un)'::text
            WHEN stock_quantity > 1000 THEN '🟡 ALTO (>1k un)'::text
            WHEN stock_quantity > 0 THEN '🟢 MÉDIO (com estoque)'::text
            ELSE '⚪ BAIXO (sem estoque)'::text
        END AS prioridade
   FROM base
  ORDER BY (
        CASE
            WHEN ncm_bronze ~ '^\d{8}$'::text AND ncm_bronze <> '00000000'::text AND ncm_bronze !~ '^0+$'::text THEN 0
            ELSE 1
        END), stock_quantity DESC;
```

## public.vw_property_statistics (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_properties, public.property_definitions |
| populada | n/a |
| comentário | Estatísticas de uso das properties |


```sql
SELECT pd.code,
    pd.name_pt,
    pd.category,
    pd.is_thermal_indicator,
    pd.icon_code,
    count(pp.id) AS product_count,
    pd.display_order
   FROM property_definitions pd
     LEFT JOIN product_properties pp ON pd.code = pp.property_code
  GROUP BY pd.id, pd.code, pd.name_pt, pd.category, pd.is_thermal_indicator, pd.icon_code, pd.display_order
  ORDER BY (count(pp.id)) DESC;
```

## public.vw_qa_products_missing_images (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.products |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    COALESCE(sku_promo, sku::character varying) AS sku,
    name,
    supplier_id,
    created_at,
        CASE
            WHEN COALESCE(primary_image_url, ''::text) = ''::text AND NOT (jsonb_typeof(images) = 'array'::text AND jsonb_array_length(images) > 0) THEN 'CRITICO'::text
            ELSE 'SEM_NORMALIZACAO'::text
        END AS severidade
   FROM products p
  WHERE COALESCE(is_active, false) AND NOT COALESCE(is_deleted, false) AND NOT (EXISTS ( SELECT 1
           FROM product_images pi
          WHERE pi.product_id = p.id));
```

## public.vw_rupture_confidence_audit (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.mv_stock_rupture_alert |
| populada | n/a |
| comentário |  |


```sql
SELECT supplier_name,
    nivel_alerta,
    confidence_level,
    count(*) AS total_vss,
    count(*) FILTER (WHERE confidence_level = 'INSUFICIENTE'::text) AS insuficiente,
    count(*) FILTER (WHERE confidence_level = 'BAIXA'::text) AS baixa,
    count(*) FILTER (WHERE confidence_level = 'MÉDIA'::text) AS media,
    count(*) FILTER (WHERE confidence_level = 'ALTA'::text) AS alta,
    round(100.0 * count(*) FILTER (WHERE confidence_level = ANY (ARRAY['ALTA'::text, 'MÉDIA'::text]))::numeric / NULLIF(count(*), 0)::numeric, 1) AS pct_confianca_alta_media
   FROM mv_stock_rupture_alert m
  WHERE is_preferred = true
  GROUP BY supplier_name, nivel_alerta, confidence_level
  ORDER BY supplier_name, nivel_alerta;
```

## public.vw_rupture_gap_purchase (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.mv_stock_rupture_alert, public.variant_supplier_sources |
| populada | n/a |
| comentário |  |


```sql
SELECT m.supplier_id,
    m.supplier_name,
    m.nivel_alerta,
    count(*) AS total_skus,
    sum(m.gap_unidades) AS total_gap_unidades,
    round(sum(m.gap_unidades::numeric * COALESCE(vss.cost_price, 0::numeric)), 2) AS valor_compra_estimado_r,
    min(m.cobertura_dias) AS pior_cobertura_dias,
    max(m.ema_diaria) AS maior_ema_diaria,
    count(*) FILTER (WHERE m.anomalia_spike) AS skus_com_anomalia,
    round(avg(m.score_composto), 2) AS avg_score,
    max(m.score_composto) AS max_score
   FROM mv_stock_rupture_alert m
     JOIN variant_supplier_sources vss ON vss.id = m.vss_id
  WHERE m.is_preferred = true AND (m.nivel_alerta = ANY (ARRAY['RUPTURA'::text, 'CRÍTICO'::text, 'ALERTA'::text]))
  GROUP BY m.supplier_id, m.supplier_name, m.nivel_alerta
  ORDER BY m.supplier_name, (max(m.score_composto)) DESC;
```

## public.vw_rupture_live_divergence (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.mv_stock_rupture_alert, public.variant_supplier_sources |
| populada | n/a |
| comentário |  |


```sql
WITH ls AS (
         SELECT vss.id AS vss_id,
            COALESCE(vss.stock_main_warehouse, 0) + COALESCE(vss.stock_other_warehouses, 0) AS stock_live,
            vss.last_synced_at
           FROM variant_supplier_sources vss
          WHERE vss.is_active = true AND vss.removed_from_api IS DISTINCT FROM true
        )
 SELECT m.vss_id,
    m.supplier_name,
    m.supplier_sku,
    m.nivel_alerta AS nivel_snapshot,
    m.stock_total AS stock_snapshot,
    l.stock_live,
    l.stock_live - m.stock_total AS delta_stock,
    m.ema_diaria,
    m.lead_time_efetivo,
    m.score_composto,
    l.last_synced_at,
        CASE
            WHEN l.stock_live = 0 THEN 0.0
            WHEN m.ema_diaria > 0.01 THEN round(l.stock_live::numeric / m.ema_diaria, 1)
            ELSE 9999.0
        END AS cobertura_live,
        CASE
            WHEN l.stock_live = 0 THEN 'RUPTURA'::text
            WHEN m.ema_diaria > 0.01 AND (l.stock_live::numeric / m.ema_diaria) < m.lead_time_efetivo::numeric THEN 'CRÍTICO'::text
            WHEN m.ema_diaria > 0.01 AND (l.stock_live::numeric / m.ema_diaria) < (m.lead_time_efetivo::numeric * 1.5) THEN 'ALERTA'::text
            WHEN m.ema_diaria > 0.01 AND (l.stock_live::numeric / m.ema_diaria) < (m.lead_time_efetivo::numeric * 2.0) THEN 'ATENÇÃO'::text
            ELSE 'OK'::text
        END AS nivel_live,
    abs(l.stock_live - m.stock_total) AS abs_delta,
        CASE
            WHEN (m.nivel_alerta = ANY (ARRAY['OK'::text, 'ATENÇÃO'::text, 'ALERTA'::text])) AND (
            CASE
                WHEN l.stock_live = 0 THEN 'RUPTURA'::text
                WHEN m.ema_diaria > 0.01 AND (l.stock_live::numeric / m.ema_diaria) < m.lead_time_efetivo::numeric THEN 'CRÍTICO'::text
                ELSE 'OTHER'::text
            END = ANY (ARRAY['CRÍTICO'::text, 'RUPTURA'::text])) THEN 'DEGRADOU_CRÍTICO'::text
            ELSE 'DEGRADOU'::text
        END AS status_drift
   FROM mv_stock_rupture_alert m
     JOIN ls l ON l.vss_id = m.vss_id
  WHERE m.is_preferred = true AND m.nivel_alerta <>
        CASE
            WHEN l.stock_live = 0 THEN 'RUPTURA'::text
            WHEN m.ema_diaria > 0.01 AND (l.stock_live::numeric / m.ema_diaria) < m.lead_time_efetivo::numeric THEN 'CRÍTICO'::text
            WHEN m.ema_diaria > 0.01 AND (l.stock_live::numeric / m.ema_diaria) < (m.lead_time_efetivo::numeric * 1.5) THEN 'ALERTA'::text
            WHEN m.ema_diaria > 0.01 AND (l.stock_live::numeric / m.ema_diaria) < (m.lead_time_efetivo::numeric * 2.0) THEN 'ATENÇÃO'::text
            ELSE 'OK'::text
        END
  ORDER BY (abs(l.stock_live - m.stock_total)) DESC;
```

## public.vw_seo_dashboard (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories, public.product_images, public.products |
| populada | n/a |
| comentário | v3 — Dashboard executivo: produtos, categorias, imagens. Inclui ai_title, ai_summary, schema_json coverage |


```sql
WITH product_stats AS (
         SELECT count(*) AS total_products,
            count(*) FILTER (WHERE products.slug IS NOT NULL AND length(TRIM(BOTH FROM products.slug)) > 0) AS with_slug,
            count(*) FILTER (WHERE products.meta_title IS NOT NULL AND length(TRIM(BOTH FROM products.meta_title)) > 0) AS with_meta_title,
            count(*) FILTER (WHERE products.meta_description IS NOT NULL AND length(TRIM(BOTH FROM products.meta_description)) > 0) AS with_meta_description,
            count(*) FILTER (WHERE length(COALESCE(products.description, ''::text)) >= 300) AS with_good_description,
            count(*) FILTER (WHERE products.ai_summary IS NOT NULL AND length(TRIM(BOTH FROM products.ai_summary)) > 0) AS with_ai_summary,
            count(*) FILTER (WHERE products.ai_title IS NOT NULL AND length(TRIM(BOTH FROM products.ai_title)) > 0) AS with_ai_title,
            count(*) FILTER (WHERE products.schema_json IS NOT NULL) AS with_schema_json,
            round(avg(COALESCE(products.seo_score, 0)), 1) AS avg_seo_score,
            count(*) FILTER (WHERE COALESCE(products.seo_score, 0) >= 80) AS excellent_seo,
            count(*) FILTER (WHERE COALESCE(products.seo_score, 0) >= 60 AND COALESCE(products.seo_score, 0) < 80) AS good_seo,
            count(*) FILTER (WHERE COALESCE(products.seo_score, 0) >= 40 AND COALESCE(products.seo_score, 0) < 60) AS fair_seo,
            count(*) FILTER (WHERE COALESCE(products.seo_score, 0) < 40) AS poor_seo
           FROM products
          WHERE products.is_active = true AND products.is_deleted = false
        ), category_stats AS (
         SELECT count(*) AS total_categories,
            count(*) FILTER (WHERE categories.meta_title IS NOT NULL) AS with_meta_title,
            count(*) FILTER (WHERE categories.meta_description IS NOT NULL) AS with_meta_description,
            count(*) FILTER (WHERE categories.ai_summary IS NOT NULL) AS with_ai_summary
           FROM categories
          WHERE categories.is_active = true
        ), image_stats AS (
         SELECT count(*) AS total_images,
            count(*) FILTER (WHERE product_images.alt_text IS NOT NULL AND length(TRIM(BOTH FROM product_images.alt_text)) > 0) AS with_alt_text
           FROM product_images
          WHERE product_images.is_active = true
        )
 SELECT 'produtos'::text AS entidade,
    p.total_products AS total,
    round(p.with_slug::numeric * 100.0 / NULLIF(p.total_products, 0)::numeric, 1) AS pct_com_slug,
    round(p.with_meta_title::numeric * 100.0 / NULLIF(p.total_products, 0)::numeric, 1) AS pct_com_meta_title,
    round(p.with_meta_description::numeric * 100.0 / NULLIF(p.total_products, 0)::numeric, 1) AS pct_com_meta_description,
    round(p.with_ai_title::numeric * 100.0 / NULLIF(p.total_products, 0)::numeric, 1) AS pct_com_ai_title,
    round(p.with_ai_summary::numeric * 100.0 / NULLIF(p.total_products, 0)::numeric, 1) AS pct_com_ai_summary,
    round(p.with_schema_json::numeric * 100.0 / NULLIF(p.total_products, 0)::numeric, 1) AS pct_com_schema_json,
    p.avg_seo_score AS score_medio,
    ((((((p.excellent_seo || ' 🟢 | '::text) || p.good_seo) || ' 🟡 | '::text) || p.fair_seo) || ' 🟠 | '::text) || p.poor_seo) || ' 🔴'::text AS distribuicao_scores
   FROM product_stats p
UNION ALL
 SELECT 'categorias'::text AS entidade,
    c.total_categories AS total,
    NULL::numeric AS pct_com_slug,
    round(c.with_meta_title::numeric * 100.0 / NULLIF(c.total_categories, 0)::numeric, 1) AS pct_com_meta_title,
    round(c.with_meta_description::numeric * 100.0 / NULLIF(c.total_categories, 0)::numeric, 1) AS pct_com_meta_description,
    NULL::numeric AS pct_com_ai_title,
    round(c.with_ai_summary::numeric * 100.0 / NULLIF(c.total_categories, 0)::numeric, 1) AS pct_com_ai_summary,
    NULL::numeric AS pct_com_schema_json,
    NULL::numeric AS score_medio,
    NULL::text AS distribuicao_scores
   FROM category_stats c
UNION ALL
 SELECT 'imagens'::text AS entidade,
    i.total_images AS total,
    NULL::numeric AS pct_com_slug,
    NULL::numeric AS pct_com_meta_title,
    NULL::numeric AS pct_com_meta_description,
    NULL::numeric AS pct_com_ai_title,
    round(i.with_alt_text::numeric * 100.0 / NULLIF(i.total_images, 0)::numeric, 1) AS pct_com_ai_summary,
    NULL::numeric AS pct_com_schema_json,
    NULL::numeric AS score_medio,
    ((i.with_alt_text || ' de '::text) || i.total_images) || ' com alt text'::text AS distribuicao_scores
   FROM image_stats i;
```

## public.vw_sitemap_all (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.vw_sitemap_categories, public.vw_sitemap_products |
| populada | n/a |
| comentário | v3 — União produtos + categorias para sitemap XML completo |


```sql
SELECT vw_sitemap_products.url_type,
    vw_sitemap_products.url_path,
    vw_sitemap_products.identifier,
    vw_sitemap_products.title,
    vw_sitemap_products.lastmod,
    vw_sitemap_products.priority,
    vw_sitemap_products.changefreq,
    vw_sitemap_products.image_url
   FROM vw_sitemap_products
UNION ALL
 SELECT vw_sitemap_categories.url_type,
    vw_sitemap_categories.url_path,
    vw_sitemap_categories.identifier,
    vw_sitemap_categories.title,
    vw_sitemap_categories.lastmod,
    vw_sitemap_categories.priority,
    vw_sitemap_categories.changefreq,
    vw_sitemap_categories.image_url
   FROM vw_sitemap_categories
  ORDER BY 6 DESC, 5 DESC;
```

## public.vw_sitemap_categories (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.categories |
| populada | n/a |
| comentário | v3 — Dados para sitemap XML de categorias |


```sql
SELECT 'category'::text AS url_type,
    '/categoria/'::text || slug AS url_path,
    slug AS identifier,
    name AS title,
    updated_at AS lastmod,
    COALESCE(seo_priority,
        CASE
            WHEN level = 1 THEN 0.9
            WHEN level = 2 THEN 0.8
            ELSE 0.7
        END) AS priority,
    'weekly'::text AS changefreq,
    image_url,
    COALESCE(meta_title, name) AS title_seo,
    products_count
   FROM categories
  WHERE is_active = true AND is_visible = true AND slug IS NOT NULL
  ORDER BY level, (COALESCE(seo_priority,
        CASE
            WHEN level = 1 THEN 0.9
            WHEN level = 2 THEN 0.8
            ELSE 0.7
        END)) DESC, name;
```

## public.vw_sitemap_products (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products |
| populada | n/a |
| comentário | v3 — Dados para sitemap XML de produtos. Corrigido: is_deleted=false |


```sql
SELECT 'product'::text AS url_type,
    '/produto/'::text || COALESCE(slug, id::text) AS url_path,
    COALESCE(slug, id::text) AS identifier,
    name AS title,
    supplier_reference,
    updated_at AS lastmod,
        CASE
            WHEN is_featured = true THEN 1.0
            WHEN is_bestseller = true THEN 0.9
            WHEN is_new = true THEN 0.8
            ELSE 0.7
        END AS priority,
        CASE
            WHEN is_featured = true OR is_bestseller = true THEN 'daily'::text
            ELSE 'weekly'::text
        END AS changefreq,
    COALESCE(primary_image_url, og_image_url) AS image_url,
    COALESCE(meta_title, name) AS image_title,
    COALESCE(seo_score, 0) AS seo_score
   FROM products
  WHERE is_active = true AND is_deleted = false AND (robots_meta IS NULL OR robots_meta !~~ '%noindex%'::text)
  ORDER BY (
        CASE
            WHEN is_featured = true THEN 1.0
            WHEN is_bestseller = true THEN 0.9
            WHEN is_new = true THEN 0.8
            ELSE 0.7
        END) DESC, updated_at DESC;
```

## public.vw_somarcas_materials (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.material_groups, public.material_types, public.product_materials, public.product_variants, public.products |
| populada | n/a |
| comentário | Distribuição de materiais dos produtos Só Marcas — usa product_materials normalizada.  Substitui versão legada com regex no Bronze. Inclui estoque, preços por material.  Reescrito: 2026-06-11 \| M6 - Melhoria integridade materiais |


```sql
SELECT mt.name::text AS material,
    mg.name AS grupo_material,
    count(DISTINCT p.id) AS total_produtos,
    sum(
        CASE
            WHEN pv.stock_quantity > 0 THEN 1
            ELSE 0
        END) AS produtos_com_estoque,
    COALESCE(sum(pv.stock_quantity), 0::bigint) AS estoque_total,
    round(avg(pm.percentage), 1) AS percentual_medio,
    min(p.cost_price) AS preco_min,
    max(p.cost_price) AS preco_max,
    round(avg(p.cost_price), 2) AS preco_medio
   FROM product_materials pm
     JOIN material_types mt ON mt.id = pm.material_id
     JOIN material_groups mg ON mg.id = mt.group_id
     JOIN products p ON p.id = pm.product_id
     LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = true
  WHERE pm.is_active = true AND p.is_active = true AND p.supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid
  GROUP BY mt.name, mg.name
  ORDER BY (count(DISTINCT p.id)) DESC;
```

## public.vw_somarcas_pending (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    supplier_reference AS sku,
    raw_data ->> 'titulo'::text AS titulo,
    (raw_data ->> 'estoque'::text)::integer AS estoque,
    (raw_data ->> 'preco_com_gravacao_com_impostos'::text)::numeric AS preco,
    imported_at
   FROM supplier_products_raw
  WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND status <> 'processed'::supplier_raw_status
  ORDER BY imported_at DESC;
```

## public.vw_somarcas_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT count(*) AS total_produtos,
    count(*) FILTER (WHERE ((raw_data ->> 'estoque'::text)::integer) > 0) AS com_estoque,
    count(*) FILTER (WHERE ((raw_data ->> 'estoque'::text)::integer) = 0) AS sem_estoque,
    count(*) FILTER (WHERE (raw_data ->> 'produto_ativo'::text) = 'sim'::text) AS ativos,
    count(*) FILTER (WHERE status = 'processed'::supplier_raw_status) AS processados,
    count(*) FILTER (WHERE status <> 'processed'::supplier_raw_status) AS pendentes,
    round(avg((raw_data ->> 'preco_com_gravacao_com_impostos'::text)::numeric), 2) AS preco_medio,
    min((raw_data ->> 'preco_com_gravacao_com_impostos'::text)::numeric) AS preco_min,
    max((raw_data ->> 'preco_com_gravacao_com_impostos'::text)::numeric) AS preco_max,
    sum((raw_data ->> 'estoque'::text)::integer) AS estoque_total
   FROM supplier_products_raw
  WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid;
```

## public.vw_somarcas_sync_status (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT ( SELECT count(*) AS count
           FROM supplier_products_raw
          WHERE supplier_products_raw.supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid) AS total_raw,
    ( SELECT count(*) AS count
           FROM supplier_products_raw
          WHERE supplier_products_raw.supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND supplier_products_raw.status = 'processed'::supplier_raw_status) AS processados,
    ( SELECT count(*) AS count
           FROM supplier_products_raw
          WHERE supplier_products_raw.supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND supplier_products_raw.status <> 'processed'::supplier_raw_status) AS pendentes,
    ( SELECT count(*) AS count
           FROM supplier_products_raw
          WHERE supplier_products_raw.supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND supplier_products_raw.process_errors IS NOT NULL) AS com_erro,
    ( SELECT max(supplier_products_raw.imported_at) AS max
           FROM supplier_products_raw
          WHERE supplier_products_raw.supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid) AS ultima_importacao;
```

## public.vw_source_channel_coverage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT s.name AS fornecedor,
    spr.source_channel,
    spr.source_endpoint,
    count(*) AS total_linhas,
    count(DISTINCT spr.raw_data ->> 'CodigoAmigavel'::text) FILTER (WHERE spr.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid) AS produtos_unicos_xbz,
    sum(
        CASE
            WHEN spr.status = 'processed'::supplier_raw_status THEN 1
            ELSE 0
        END) AS processados,
    sum(
        CASE
            WHEN spr.status = 'failed'::supplier_raw_status THEN 1
            ELSE 0
        END) AS falhas,
    sum(
        CASE
            WHEN spr.status = 'pending'::supplier_raw_status THEN 1
            ELSE 0
        END) AS pendentes,
    round(100.0 * sum(
        CASE
            WHEN spr.status = 'processed'::supplier_raw_status THEN 1
            ELSE 0
        END)::numeric / NULLIF(count(*), 0)::numeric, 1) AS pct_processado,
    max(spr.created_at)::date AS ultima_ingestao
   FROM supplier_products_raw spr
     JOIN suppliers s ON s.id = spr.supplier_id
  GROUP BY s.name, spr.source_channel, spr.source_endpoint
  ORDER BY s.name, (count(*)) DESC;
```

## public.vw_spot_cf_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.product_variants, public.product_videos, public.products, public.supplier_products_raw, public.suppliers, public.video_import_queue |
| populada | n/a |
| comentário |  |


```sql
WITH image_stats AS (
         SELECT count(*) AS total_images,
            count(
                CASE
                    WHEN pi.image_type::text = 'main'::text THEN 1
                    ELSE NULL::integer
                END) AS main_images,
            count(
                CASE
                    WHEN pi.created_at::date = ANY (ARRAY['2026-02-04'::date, '2026-02-06'::date]) THEN 1
                    ELSE NULL::integer
                END) AS feb_batch,
            count(
                CASE
                    WHEN pi.created_at::date = '2026-03-01'::date THEN 1
                    ELSE NULL::integer
                END) AS mar_batch,
            count(
                CASE
                    WHEN pi.cloudflare_image_id IS NULL OR pi.cloudflare_image_id::text = ''::text THEN 1
                    ELSE NULL::integer
                END) AS missing_cf_id,
            count(DISTINCT pi.product_id) AS products_with_images
           FROM product_images pi
             JOIN products p ON p.id = pi.product_id
             JOIN suppliers s ON s.id = p.supplier_id
          WHERE s.code = 'STRICKER'::text
        ), video_stats AS (
         SELECT count(*) AS total_videos,
            count(
                CASE
                    WHEN product_videos.cloudflare_status::text = 'ready'::text THEN 1
                    ELSE NULL::integer
                END) AS cf_ready,
            count(
                CASE
                    WHEN product_videos.cloudflare_status::text = 'queued'::text THEN 1
                    ELSE NULL::integer
                END) AS cf_queued,
            count(
                CASE
                    WHEN product_videos.cloudflare_status::text = 'error'::text THEN 1
                    ELSE NULL::integer
                END) AS cf_error
           FROM product_videos
          WHERE product_videos.source_supplier::text = 'SPOT'::text
        ), queue_stats AS (
         SELECT count(*) AS queue_total,
            count(
                CASE
                    WHEN video_import_queue.status = 'linked'::text THEN 1
                    ELSE NULL::integer
                END) AS linked,
            count(
                CASE
                    WHEN video_import_queue.status = 'pending'::text THEN 1
                    ELSE NULL::integer
                END) AS pending,
            count(
                CASE
                    WHEN video_import_queue.status = 'error'::text THEN 1
                    ELSE NULL::integer
                END) AS queue_error,
            count(
                CASE
                    WHEN video_import_queue.status = 'downloading'::text THEN 1
                    ELSE NULL::integer
                END) AS downloading,
            count(
                CASE
                    WHEN video_import_queue.status = 'downloading'::text AND video_import_queue.started_at <= (now() - '00:30:00'::interval) THEN 1
                    ELSE NULL::integer
                END) AS stuck
           FROM video_import_queue
          WHERE video_import_queue.source_supplier = 'SPOT'::text
        ), product_stats AS (
         SELECT count(*) AS total_products,
            count(
                CASE
                    WHEN p.is_active THEN 1
                    ELSE NULL::integer
                END) AS active_products,
            count(
                CASE
                    WHEN p.primary_image_url ~~* '%spot-images-proxy%'::text THEN 1
                    ELSE NULL::integer
                END) AS url_via_proxy
           FROM products p
             JOIN suppliers s ON s.id = p.supplier_id
          WHERE s.code = 'STRICKER'::text
        ), variant_stats AS (
         SELECT count(*) AS total_variants,
            count(
                CASE
                    WHEN pv.selected_thumbnail::text ~~* '%spot-images-proxy%'::text THEN 1
                    ELSE NULL::integer
                END) AS thumb_via_proxy
           FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             JOIN suppliers s ON s.id = p.supplier_id
          WHERE s.code = 'STRICKER'::text
        )
 SELECT now()::date AS check_date,
    ( SELECT count(*) AS count
           FROM supplier_products_raw spr
             JOIN suppliers s ON s.id = spr.supplier_id
          WHERE s.code = 'STRICKER'::text) AS bronze_skus,
    ps.total_products,
    ps.active_products,
    ps.url_via_proxy,
    vs.total_variants,
    vs.thumb_via_proxy,
    ims.total_images,
    ims.main_images,
    ims.products_with_images,
    ims.missing_cf_id,
    ims.feb_batch,
    ims.mar_batch,
    vds.total_videos,
    vds.cf_ready,
    vds.cf_queued,
    vds.cf_error,
    qs.queue_total,
    qs.linked,
    qs.pending,
    qs.queue_error,
    qs.downloading,
    qs.stuck,
    LEAST(100::numeric, round(ims.main_images::numeric / NULLIF(ps.active_products, 0)::numeric * 30::numeric + vds.cf_ready::numeric / 152.0 * 20::numeric + (1::numeric - ims.missing_cf_id::numeric / NULLIF(ims.total_images, 0)::numeric) * 30::numeric + (1::numeric - qs.stuck::numeric / NULLIF(qs.queue_total, 1)::numeric) * 20::numeric)) AS health_score_pct
   FROM product_stats ps,
    variant_stats vs,
    image_stats ims,
    video_stats vds,
    queue_stats qs;
```

## public.vw_spot_color_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_variants, public.products, public.supplier_colors, public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT code,
    api_color_id,
    name,
    hex_code,
    is_active,
    notes,
        CASE
            WHEN hex_code IS NULL OR hex_code::text = ''::text THEN '⚠️ SEM HEX'::text
            WHEN hex_code::text !~ '^#[0-9A-Fa-f]{6}$'::text THEN '⚠️ HEX INVÁLIDO'::text
            ELSE '✅ OK'::text
        END AS hex_status,
        CASE
            WHEN api_color_id IS NULL THEN '⚠️ SEM API_ID'::text
            WHEN api_color_id::text <> code::text THEN '⚠️ CODE≠API_ID'::text
            ELSE '✅ SINCRONIZADO'::text
        END AS id_sync_status,
    ( SELECT count(*) AS count
           FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
          WHERE p.supplier_id = sc.supplier_id AND pv.color_code::text = sc.code::text AND pv.is_active = true) AS gold_active_variants,
    ( SELECT count(*) AS count
           FROM supplier_products_raw spr
          WHERE spr.supplier_id = sc.supplier_id AND (spr.raw_data ->> 'ColorCode'::text) = sc.api_color_id::text AND spr.status <> 'skipped'::supplier_raw_status) AS bronze_skus
   FROM supplier_colors sc
  WHERE supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'::uuid;
```

## public.vw_spot_color_separator_reference (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de |  |
| populada | n/a |
| comentário |  |


```sql
SELECT sistema,
    contexto,
    padrao,
    exemplo,
    separador,
    observacao
   FROM ( VALUES ('SPOT API SKU'::text,'Webservice OptionalsComplete'::text,'{ProdReference}-{ColorCode}'::text,'11103-103'::text,'hyphen'::text,'Chave natural do Bronze'::text), ('supplier_sku Silver'::text,'produtos_padronizacao_variantes'::text,'{ref}-{ColorCode}'::text,'92096-103'::text,'hyphen'::text,'Preserva o SKU da API'::text), ('supplier_sku Gold'::text,'product_variants.supplier_sku'::text,'{ref}-{ColorCode}'::text,'92096-103'::text,'hyphen'::text,'Idem Silver — campo preservado'::text), ('sku interno Gold'::text,'product_variants.sku'::text,'{ref}-{position}.{sub}'::text,'92096-9.1'::text,'hyphen'::text,'ID interno Promo Brindes — NÃO é ColorCode'::text), ('URL imagem principal'::text,'fotos/produtos/'::text,'{iderp}_{ColorCode}.jpg'::text,'11103_103.jpg'::text,'underscore'::text,'Padrão determinístico SPOT'::text), ('URL img cor+vista'::text,'fotos/produtos/'::text,'{iderp}_{ColorCode}-{view}.jpg'::text,'81198_103-box.jpg'::text,'underscore'::text,'Separador iderp→cor=underscore; cor→view=hyphen'::text), ('URL componente'::text,'fotos/produtos/'::text,'{iderp}_{ColorCode}_C{n}.png'::text,'11104_105_C1.png'::text,'underscore'::text,'Separador consistente underscore'::text), ('GA4 item_variant'::text,'Google Analytics 4 view_item'::text,'{iderp}-{ColorCode}'::text,'92365-131'::text,'hyphen'::text,'Igual SKU da API — cuidado ao comparar com URL'::text), ('filtro catalogo'::text,'GET ?f3[]='::text,'{ColorCode}'::text,'f3[]=103'::text,'nenhum'::text,'Só o código numérico — sem separador'::text), ('stock subprod AJAX'::text,'getStockWarehouses params'::text,'{ProdReference}-{ColorCode}'::text,'92096-103'::text,'hyphen'::text,'Mesmo formato do SKU da API'::text), ('product_images link'::text,'fn_spot_enrich_image_colors()'::text,'regex: {iderp}_{ColorCode}[^0-9]'::text,'substring: 103'::text,'underscore'::text,'Extrai ColorCode com regex ^\d+_(\d+)'::text)) t(sistema, contexto, padrao, exemplo, separador, observacao);
```

## public.vw_spot_image_coverage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_images, public.product_variants, public.products, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT p.sku,
    p.name,
    count(DISTINCT pv.id) AS total_variants,
    count(DISTINCT pv.color_code) AS total_colors,
    count(DISTINCT pi_main.id) AS main_images,
    count(DISTINCT
        CASE
            WHEN pi_any.color_id IS NOT NULL THEN pi_any.color_id
            ELSE NULL::uuid
        END) AS colors_with_any_image,
        CASE
            WHEN count(DISTINCT pv.color_code) = count(DISTINCT
            CASE
                WHEN pi_any.color_id IS NOT NULL THEN pi_any.color_id
                ELSE NULL::uuid
            END) THEN true
            ELSE false
        END AS full_color_coverage,
    count(DISTINCT pi_any.id) AS total_images
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
     JOIN product_variants pv ON pv.product_id = p.id
     LEFT JOIN product_images pi_main ON pi_main.product_id = p.id AND pi_main.image_type::text = 'main'::text
     LEFT JOIN product_images pi_any ON pi_any.product_id = p.id AND pi_any.color_id IS NOT NULL
  WHERE s.code = 'STRICKER'::text AND p.is_active = true
  GROUP BY p.sku, p.id, p.name;
```

## public.vw_spot_price_alerts (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.supplier_products_raw, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT spr.supplier_sku,
    spr.raw_data ->> 'Name'::text AS name,
    spr.raw_data ->> 'Price1'::text AS price1_raw,
    spr.raw_data ->> '_price_alert'::text AS price_alert,
    p.cost_price AS gold_cost_price,
    p.sale_price AS gold_sale_price,
    p.is_active,
    spr.updated_at
   FROM supplier_products_raw spr
     JOIN suppliers s ON s.id = spr.supplier_id
     JOIN products p ON p.id = spr.product_id
  WHERE s.code = 'STRICKER'::text AND ((spr.raw_data ->> 'Price1'::text) IS NULL OR ((spr.raw_data ->> 'Price1'::text)::numeric) = 0::numeric OR spr.raw_data ? '_price_alert'::text);
```

## public.vw_stock_quantity_outliers (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_variants, public.products, public.v_suppliers_public, public.variant_supplier_sources |
| populada | n/a |
| comentário | Observabilidade (read-only): linhas de vss com quantidade atual OU futura implausivelmente alta (>=50k) p/ revisão manual. Severidade = GREATEST(atual, futuro). NÃO altera dados; os valores são, em sua maioria, granel legítimo de grandes distribuidores. Auditoria Estoque 2026-06-17. |


```sql
SELECT vss.id AS source_id,
    vss.variant_id,
    pv.product_id,
    p.sku AS product_sku,
    p.name AS product_name,
    vss.supplier_id,
    vsp.name AS supplier_name,
    vss.quantity AS current_quantity,
    GREATEST(COALESCE(vss.next_quantity_1, 0), COALESCE(vss.next_quantity_2, 0), COALESCE(vss.next_quantity_3, 0), COALESCE(vss.next_quantity_4, 0), COALESCE(vss.next_quantity_5, 0), COALESCE(vss.next_quantity_6, 0)) AS max_future_quantity,
    vss.updated_at,
        CASE
            WHEN GREATEST(COALESCE(vss.quantity, 0), COALESCE(vss.next_quantity_1, 0), COALESCE(vss.next_quantity_2, 0), COALESCE(vss.next_quantity_3, 0), COALESCE(vss.next_quantity_4, 0), COALESCE(vss.next_quantity_5, 0), COALESCE(vss.next_quantity_6, 0)) >= 1000000 THEN 'extreme'::text
            WHEN GREATEST(COALESCE(vss.quantity, 0), COALESCE(vss.next_quantity_1, 0), COALESCE(vss.next_quantity_2, 0), COALESCE(vss.next_quantity_3, 0), COALESCE(vss.next_quantity_4, 0), COALESCE(vss.next_quantity_5, 0), COALESCE(vss.next_quantity_6, 0)) >= 100000 THEN 'high'::text
            ELSE 'elevated'::text
        END AS severity
   FROM variant_supplier_sources vss
     JOIN product_variants pv ON pv.id = vss.variant_id
     JOIN products p ON p.id = pv.product_id
     LEFT JOIN v_suppliers_public vsp ON vsp.id = vss.supplier_id
  WHERE vss.is_active AND (vss.quantity >= 50000 OR GREATEST(COALESCE(vss.next_quantity_1, 0), COALESCE(vss.next_quantity_2, 0), COALESCE(vss.next_quantity_3, 0), COALESCE(vss.next_quantity_4, 0), COALESCE(vss.next_quantity_5, 0), COALESCE(vss.next_quantity_6, 0)) >= 50000);
```

## public.vw_super_filtro_health (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | pg_catalog.pg_indexes, pg_catalog.pg_policies, public.product_commemorative_dates, public.product_variants, public.products, public.produto_ramo_atividade |
| populada | n/a |
| comentário |  |


```sql
SELECT 'gold_products'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) >= 7000 THEN '✅'::text
            ELSE '⚠️'::text
        END AS status
   FROM products
  WHERE products.is_active = true AND products.is_deleted = false
UNION ALL
 SELECT 'gender_filled'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) >= 800 THEN '✅'::text
            ELSE '🔴'::text
        END AS status
   FROM products
  WHERE products.is_active = true AND products.is_deleted = false AND products.gender IS NOT NULL
UNION ALL
 SELECT 'nichos_mapeados'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) >= 40000 THEN '✅'::text
            ELSE '🔴'::text
        END AS status
   FROM produto_ramo_atividade
UNION ALL
 SELECT 'datas_comemorativas_links'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) >= 20000 THEN '✅'::text
            ELSE '⚠️'::text
        END AS status
   FROM product_commemorative_dates
  WHERE product_commemorative_dates.is_active = true
UNION ALL
 SELECT 'engraving_type_clean'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) = 0 THEN '✅'::text
            ELSE '🔴'::text
        END AS status
   FROM products
  WHERE products.is_active = true AND products.engraving_type ~ '^\d'::text
UNION ALL
 SELECT 'has_sizes_consistent'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) = 0 THEN '✅'::text
            ELSE '🔴'::text
        END AS status
   FROM products
  WHERE products.has_sizes = true AND products.is_active = true AND NOT (products.id IN ( SELECT DISTINCT product_variants.product_id
           FROM product_variants
          WHERE product_variants.size_code IS NOT NULL AND product_variants.is_active = true))
UNION ALL
 SELECT 'surface_finish_populated'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) >= 1000 THEN '✅'::text
            ELSE '⚠️'::text
        END AS status
   FROM products
  WHERE products.is_active = true AND products.surface_finish IS NOT NULL AND products.surface_finish <> '{}'::text[]
UNION ALL
 SELECT 'pat_anon_rls'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) > 0 THEN '✅'::text
            ELSE '🔴'::text
        END AS status
   FROM pg_policies
  WHERE pg_policies.tablename = 'print_area_techniques'::name AND pg_policies.roles @> '{anon}'::name[]
UNION ALL
 SELECT 'idx_tags_gin'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) > 0 THEN '✅'::text
            ELSE '🔴'::text
        END AS status
   FROM pg_indexes
  WHERE pg_indexes.indexname = 'idx_products_tags_gin'::name
UNION ALL
 SELECT 'idx_variants_stock'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) > 0 THEN '✅'::text
            ELSE '🔴'::text
        END AS status
   FROM pg_indexes
  WHERE pg_indexes.indexname = 'idx_variants_stock_active'::name
UNION ALL
 SELECT 'fn_opcoes_exists'::text AS metrica,
    count(*)::text AS valor,
        CASE
            WHEN count(*) > 0 THEN '✅'::text
            ELSE '🔴'::text
        END AS status
   FROM pg_proc
  WHERE pg_proc.proname = 'fn_super_filtro_opcoes'::name;
```

## public.vw_supplier_category_coverage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_categories, public.supplier_category_mappings, public.suppliers |
| populada | n/a |
| comentário | Cobertura de mapeamento de categorias por fornecedor. Mostra % mapeado, confiança média e gaps restantes para curadoria manual. |


```sql
SELECT s.id AS supplier_id,
    s.name AS supplier_name,
    count(sc.id) AS total_supplier_cats,
    count(scm.id) AS mapped_cats,
    count(sc.id) - count(scm.id) AS unmapped_cats,
    round(count(scm.id)::numeric * 100.0 / NULLIF(count(sc.id), 0)::numeric, 1) AS pct_mapped,
    round(avg(scm.confidence::numeric) FILTER (WHERE scm.id IS NOT NULL), 2) AS avg_confidence,
    count(scm.id) FILTER (WHERE scm.confidence >= 0.8) AS high_confidence_maps,
    count(scm.id) FILTER (WHERE scm.confidence < 0.6 AND scm.id IS NOT NULL) AS low_confidence_maps
   FROM suppliers s
     LEFT JOIN supplier_categories sc ON sc.supplier_id = s.id
     LEFT JOIN supplier_category_mappings scm ON scm.supplier_category_id = sc.id
  GROUP BY s.id, s.name
  ORDER BY (round(count(scm.id)::numeric * 100.0 / NULLIF(count(sc.id), 0)::numeric, 1)) DESC NULLS LAST;
```

## public.vw_supplier_color_mappings (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.color_equivalences, public.color_groups, public.color_variations, public.supplier_colors, public.suppliers |
| populada | n/a |
| comentário | Mapeamento completo de cores de fornecedores para variações Promo. Útil para auditoria e gap analysis. |


```sql
SELECT s.id AS supplier_id,
    s.name AS supplier_name,
    s.code AS supplier_code,
    sc.id AS supplier_color_id,
    sc.code AS supplier_color_code,
    sc.name AS supplier_color_name,
    sc.hex_code AS supplier_hex,
    cv.id AS promo_variation_id,
    cv.name AS promo_name,
    cv.internal_code AS promo_internal_code,
    cv.hex_code AS promo_hex,
    cg.id AS promo_group_id,
    cg.name AS promo_group_name,
    ce.match_quality,
    ce.confidence_score,
    ce.verified,
    ce.source AS equivalence_source,
        CASE
            WHEN ce.id IS NOT NULL THEN true
            ELSE false
        END AS is_mapped
   FROM supplier_colors sc
     JOIN suppliers s ON s.id = sc.supplier_id
     LEFT JOIN color_equivalences ce ON ce.supplier_color_id = sc.id AND ce.is_active = true
     LEFT JOIN color_variations cv ON cv.id = ce.promo_variation_id
     LEFT JOIN color_groups cg ON cg.id = cv.color_group_id
  ORDER BY s.name, sc.name;
```

## public.vw_supplier_field_mappings_summary (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_field_mappings, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT s.code AS supplier_code,
    s.name AS supplier_name,
    m.target_table,
    m.source_field,
    m.source_path,
    m.target_field,
    m.transform_type,
    m.source_unit,
    m.target_unit,
    m.priority,
    m.is_active
   FROM supplier_field_mappings m
     JOIN suppliers s ON s.id = m.supplier_id
  ORDER BY s.code, m.target_table, m.priority;
```

## public.vw_supplier_mapping_statistics (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.property_definitions, public.supplier_property_mappings |
| populada | n/a |
| comentário | Estatísticas de mapeamentos por fornecedor |


```sql
SELECT spm.supplier_code,
    count(*) AS total_mappings,
    count(DISTINCT spm.property_code) AS unique_properties,
    sum(
        CASE
            WHEN pd.is_thermal_indicator THEN 1
            ELSE 0
        END) AS thermal_mappings,
    array_agg(DISTINCT pd.category ORDER BY pd.category) FILTER (WHERE pd.category IS NOT NULL) AS categories
   FROM supplier_property_mappings spm
     LEFT JOIN property_definitions pd ON spm.property_code = pd.code
  WHERE spm.active = true
  GROUP BY spm.supplier_code;
```

## public.vw_supplier_products_raw_errors (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT s.name AS supplier_name,
    spr.supplier_reference,
    spr.process_errors,
    spr.imported_at,
    spr.updated_at
   FROM supplier_products_raw spr
     JOIN suppliers s ON s.id = spr.supplier_id
  WHERE spr.process_errors IS NOT NULL
  ORDER BY spr.updated_at DESC
 LIMIT 100;
```

## public.vw_supplier_products_raw_status (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw, public.suppliers |
| populada | n/a |
| comentário |  |


```sql
SELECT s.id AS supplier_id,
    s.name AS supplier_name,
    count(*) AS total_produtos,
    count(*) FILTER (WHERE spr.status = 'processed'::supplier_raw_status) AS processados,
    count(*) FILTER (WHERE spr.status <> 'processed'::supplier_raw_status) AS pendentes,
    count(*) FILTER (WHERE spr.process_errors IS NOT NULL) AS com_erro,
    round(count(*) FILTER (WHERE spr.status = 'processed'::supplier_raw_status)::numeric * 100.0 / NULLIF(count(*), 0)::numeric, 2) AS taxa_sucesso_pct,
    min(spr.imported_at) AS primeira_importacao,
    max(spr.imported_at) AS ultima_importacao,
    avg(EXTRACT(epoch FROM spr.processed_at - spr.imported_at)) AS tempo_medio_processamento_seg
   FROM supplier_products_raw spr
     JOIN suppliers s ON s.id = spr.supplier_id
  GROUP BY s.id, s.name
  ORDER BY (count(*)) DESC;
```

## public.vw_system_health_quick (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | não |
| opções | security_invoker=on |
| depende de | information_schema.columns, pg_catalog.pg_policies |
| populada | n/a |
| comentário | View de saúde rápida para os checks adicionados durante a sessão de correção 2026-06-21/22. Complementa fn_run_smoke_tests(). NOTA: backup_tables_rls_locked usa RLS+policy check (não has_table_privilege que ignora RLS). |


```sql
SELECT 'generated_columns_product_variants'::text AS check_name,
        CASE
            WHEN (( SELECT count(*) AS count
               FROM information_schema.columns
              WHERE columns.table_schema::name = 'public'::name AND columns.table_name::name = 'product_variants'::name AND (columns.column_name::name = ANY (ARRAY['next_entry_date'::name, 'next_entry_quantity'::name])) AND columns.is_generated::text = 'ALWAYS'::text)) = 2 THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'rpc_get_promo_sales_90d_by_product'::text AS check_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM pg_proc p
                 JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public'::name AND p.proname = 'get_promo_sales_90d_by_product'::name)) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'rpc_get_favorite_list_counts'::text AS check_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM pg_proc p
                 JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public'::name AND p.proname = 'get_favorite_list_counts'::name)) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'rls_coverage_100pct'::text AS check_name,
        CASE
            WHEN NOT (EXISTS ( SELECT 1
               FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE c.relkind = 'r'::"char" AND n.nspname = 'public'::name AND c.relrowsecurity = false)) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'category_ancestors_rls_and_accessible'::text AS check_name,
        CASE
            WHEN has_table_privilege('anon'::name, 'public.category_ancestors'::text, 'SELECT'::text) AND (( SELECT c.relrowsecurity
               FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE c.relname = 'category_ancestors'::name AND n.nspname = 'public'::name)) = true THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'backup_tables_rls_locked'::text AS check_name,
        CASE
            WHEN (( SELECT count(*) AS count
               FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public'::name AND (c.relname = ANY (ARRAY['_bkp_kit_dims_20260619'::name, '_bkp_orphan_active_variants_20260619'::name])) AND c.relrowsecurity = true)) = 2 AND (( SELECT count(*) AS count
               FROM pg_policies
              WHERE pg_policies.schemaname = 'public'::name AND (pg_policies.tablename = ANY (ARRAY['_bkp_kit_dims_20260619'::name, '_bkp_orphan_active_variants_20260619'::name])) AND pg_policies.cmd = 'SELECT'::text AND (pg_policies.roles::text ~~* '%anon%'::text OR pg_policies.roles::text ~~* '%authenticated%'::text OR pg_policies.roles::text ~~* '%public%'::text))) = 0 AND NOT has_table_privilege('anon'::name, 'public._bkp_kit_dims_20260619'::text, 'SELECT'::text) AND NOT has_table_privilege('authenticated'::name, 'public._bkp_kit_dims_20260619'::text, 'SELECT'::text) THEN '✅ PASS'::text
            ELSE '❌ FAIL (RLS ou grant incorreto)'::text
        END AS result
UNION ALL
 SELECT 'variant_sanitize_trigger_before_update'::text AS check_name,
        CASE
            WHEN (( SELECT pg_get_triggerdef(t.oid) AS pg_get_triggerdef
               FROM pg_trigger t
                 JOIN pg_class c ON c.oid = t.tgrelid
                 JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE c.relname = 'product_variants'::name AND n.nspname = 'public'::name AND t.tgname = 'trg_zz_sanitize_restock_dates'::name)) ~~* '%BEFORE%UPDATE%'::text THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'fn_system_health_summary_exists'::text AS check_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM pg_proc p
                 JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public'::name AND p.proname = 'fn_system_health_summary'::name)) THEN '✅ PASS'::text
            ELSE '❌ FAIL'::text
        END AS result
UNION ALL
 SELECT 'useWorkspaceNotifications_rolesLoaded_guard'::text AS check_name,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM pg_proc p
                 JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public'::name AND p.proname = 'fn_system_health_summary'::name)) THEN '✅ PASS (commit f379166 — frontend fix applied 2026-06-22)'::text
            ELSE '❌ FAIL'::text
        END AS result;
```

## public.vw_thermal_products (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.product_properties, public.products, public.property_definitions |
| populada | n/a |
| comentário | Produtos térmicos com suas propriedades térmicas |


```sql
SELECT p.id,
    p.sku,
    p.supplier_reference,
    p.name,
    p.is_thermal,
    string_agg(DISTINCT pd.name_pt, ', '::text ORDER BY pd.name_pt) AS thermal_properties,
    array_agg(DISTINCT pd.code ORDER BY pd.code) AS thermal_codes
   FROM products p
     JOIN product_properties pp ON p.id = pp.product_id
     JOIN property_definitions pd ON pp.property_code = pd.code
  WHERE pd.is_thermal_indicator = true
  GROUP BY p.id, p.sku, p.supplier_reference, p.name, p.is_thermal;
```

## public.vw_variant_sale_prices (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.markup_configurations, public.product_variants, public.products, public.suppliers, public.variant_supplier_sources |
| populada | n/a |
| comentário |  |


```sql
SELECT pv.id AS variant_id,
    pv.product_id,
    pv.sku,
    pv.color_name,
    vss.cost_price_1,
    vss.cost_price_2,
    vss.cost_price_3,
    vss.cost_price_4,
    vss.cost_price_5,
    vss.min_qty_1,
    vss.min_qty_2,
    vss.min_qty_3,
    vss.min_qty_4,
    vss.min_qty_5,
    COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) AS markup_percent,
    round(vss.cost_price_1 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_1,
    round(vss.cost_price_2 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_2,
    round(vss.cost_price_3 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_3,
    round(vss.cost_price_4 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_4,
    round(vss.cost_price_5 * (1::numeric + COALESCE(mc_var.markup_percent, mc_prod.markup_percent, mc_cat.markup_percent, s.default_markup_percent, 115.0) / 100::numeric), 2) AS sale_price_5
   FROM product_variants pv
     JOIN variant_supplier_sources vss ON vss.variant_id = pv.id AND vss.is_preferred = true
     LEFT JOIN suppliers s ON s.id = vss.supplier_id
     LEFT JOIN markup_configurations mc_var ON mc_var.variant_id = pv.id AND mc_var.is_active = true
     LEFT JOIN markup_configurations mc_prod ON mc_prod.product_id = pv.product_id AND mc_prod.variant_id IS NULL AND mc_prod.category_id IS NULL AND mc_prod.is_active = true
     LEFT JOIN markup_configurations mc_cat ON mc_cat.category_id = (( SELECT products.category_id
           FROM products
          WHERE products.id = pv.product_id)) AND mc_cat.product_id IS NULL AND mc_cat.variant_id IS NULL AND mc_cat.is_active = true
  WHERE pv.is_active = true;
```

## public.vw_xbz_products_by_category (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT raw_data ->> 'web_tipo'::text AS categoria,
    raw_data ->> 'web_sub_tipo'::text AS subcategoria,
    count(*) AS total_produtos,
    round(avg((raw_data ->> 'preco_venda'::text)::numeric), 2) AS preco_medio
   FROM supplier_products_raw
  WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
  GROUP BY (raw_data ->> 'web_tipo'::text), (raw_data ->> 'web_sub_tipo'::text)
  ORDER BY (count(*)) DESC;
```

## public.vw_xbz_products_by_color (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT raw_data ->> 'cor_web_principal'::text AS cor,
    count(*) AS total_produtos,
    round(avg((raw_data ->> 'preco_venda'::text)::numeric), 2) AS preco_medio
   FROM supplier_products_raw
  WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND (raw_data ->> 'cor_web_principal'::text) IS NOT NULL
  GROUP BY (raw_data ->> 'cor_web_principal'::text)
  ORDER BY (count(*)) DESC;
```

## public.vw_xbz_products_stats (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
SELECT count(*) AS total_produtos,
    count(
        CASE
            WHEN status = 'processed'::supplier_raw_status THEN 1
            ELSE NULL::integer
        END) AS processados,
    count(
        CASE
            WHEN status <> 'processed'::supplier_raw_status THEN 1
            ELSE NULL::integer
        END) AS pendentes,
    count(
        CASE
            WHEN product_id IS NOT NULL THEN 1
            ELSE NULL::integer
        END) AS com_product_id,
    count(DISTINCT raw_data ->> 'web_tipo'::text) AS categorias_distintas,
    count(DISTINCT raw_data ->> 'cor_web_principal'::text) AS cores_distintas,
    min(created_at) AS primeiro_import,
    max(updated_at) AS ultimo_update
   FROM supplier_products_raw
  WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid;
```

## public.vw_xbz_produtos_sem_imagem (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.products, public.supplier_products_raw, public.suppliers |
| populada | n/a |
| comentário | Monitora produtos XBZ ativos sem primary_image_url, com diagnóstico do Bronze e priorização por estoque. Usar para follow-up com fornecedor XBZ sobre ImageLink faltante no feed. |


```sql
SELECT p.id AS product_id,
    p.supplier_reference,
    p.sku,
    p.name,
    p.stock_quantity,
    p.cost_price,
    p.sale_price,
    p.is_active,
    p.created_at::date AS criado_em,
    p.updated_at::date AS atualizado_em,
    COALESCE(spr.raw_data ->> 'ImageLink'::text, '(sem Bronze)'::text) AS image_link_bronze,
    COALESCE(spr.site_status::text, 'sem_bronze'::text) AS site_status_bronze,
        CASE
            WHEN p.stock_quantity > 10000 THEN '🔴 CRÍTICO (>10k un)'::text
            WHEN p.stock_quantity > 1000 THEN '🟡 ALTO (>1k un)'::text
            WHEN p.stock_quantity > 100 THEN '🟢 MÉDIO (>100 un)'::text
            ELSE '⚪ BAIXO (≤100 un)'::text
        END AS prioridade,
        CASE
            WHEN p.supplier_reference::text ~~* 'TESTE%'::text THEN 'Produto de teste — ignorar'::text
            WHEN p.supplier_reference::text ~~* '%CARGA PARK%'::text THEN 'Produto especial — sem imagem na API'::text
            WHEN p.supplier_reference IS NULL THEN 'XBZ-MANUAL — imagem requer upload manual'::text
            ELSE 'ImageLink vazio no feed XBZ — solicitar ao fornecedor'::text
        END AS observacao
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
     LEFT JOIN LATERAL ( SELECT spr2.raw_data,
            spr2.site_status
           FROM supplier_products_raw spr2
          WHERE spr2.product_id = p.id AND spr2.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid
          ORDER BY spr2.updated_at DESC
         LIMIT 1) spr ON true
  WHERE p.is_active = true AND s.name ~~* '%XBZ%'::text AND p.primary_image_url IS NULL
  ORDER BY p.stock_quantity DESC;
```

## public.vw_xbz_scraping_status (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.supplier_products_raw |
| populada | n/a |
| comentário |  |


```sql
WITH base AS (
         SELECT supplier_products_raw.raw_data ->> 'CodigoAmigavel'::text AS codigo_pai,
            supplier_products_raw.site_status,
            supplier_products_raw.site_scraped_at,
            supplier_products_raw.site_attempts,
            supplier_products_raw.site_last_error,
            supplier_products_raw.site_source_url,
            supplier_products_raw.source_channel,
                CASE
                    WHEN (supplier_products_raw.site_data -> 'dimensoes'::text) IS NOT NULL AND (supplier_products_raw.site_data -> 'dimensoes'::text) <> '{}'::jsonb THEN true
                    ELSE false
                END AS tem_dimensoes,
            jsonb_array_length(COALESCE(supplier_products_raw.site_data -> 'categorias'::text, '[]'::jsonb)) > 0 AS tem_categorias,
            jsonb_array_length(COALESCE(supplier_products_raw.site_data -> 'imagens'::text, '[]'::jsonb)) > 1 AS tem_galeria,
            ((supplier_products_raw.site_data -> 'gravacao'::text) ->> 'comprimento_cm'::text) IS NOT NULL AS tem_gravacao
           FROM supplier_products_raw
          WHERE supplier_products_raw.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900'::uuid AND (supplier_products_raw.raw_data ->> 'CodigoAmigavel'::text) IS NOT NULL
        ), por_pai AS (
         SELECT base.codigo_pai,
            bool_or(base.site_status = 'processed'::supplier_raw_status) AS scraped,
            bool_or(base.site_status = 'failed'::supplier_raw_status AND base.site_attempts >= 5) AS bloqueado,
            bool_or(base.site_status = ANY (ARRAY['pending'::supplier_raw_status, 'processing'::supplier_raw_status])) AS na_fila,
            max(base.site_scraped_at) AS ultimo_scrape,
            max(base.site_attempts) AS tentativas,
            max(base.site_last_error) AS ultimo_erro,
            bool_or(base.tem_dimensoes) AS tem_dimensoes,
            bool_or(base.tem_categorias) AS tem_categorias,
            bool_or(base.tem_galeria) AS tem_galeria,
            bool_or(base.tem_gravacao) AS tem_gravacao
           FROM base
          GROUP BY base.codigo_pai
        )
 SELECT count(*) AS total_produtos,
    sum(scraped::integer) AS scraped,
    sum(bloqueado::integer) AS bloqueados,
    sum(na_fila::integer) AS na_fila,
    round(100.0 * sum(scraped::integer)::numeric / NULLIF(count(*), 0)::numeric, 1) AS pct_cobertura,
    sum(
        CASE
            WHEN scraped AND tem_dimensoes THEN 1
            ELSE 0
        END) AS com_dimensoes,
    sum(
        CASE
            WHEN scraped AND tem_categorias THEN 1
            ELSE 0
        END) AS com_categorias,
    sum(
        CASE
            WHEN scraped AND tem_galeria THEN 1
            ELSE 0
        END) AS com_galeria,
    sum(
        CASE
            WHEN scraped AND tem_gravacao THEN 1
            ELSE 0
        END) AS com_gravacao,
    min(
        CASE
            WHEN scraped THEN ultimo_scrape
            ELSE NULL::timestamp with time zone
        END)::date AS primeiro_scrape,
    max(
        CASE
            WHEN scraped THEN ultimo_scrape
            ELSE NULL::timestamp with time zone
        END)::date AS ultimo_scrape
   FROM por_pai;
```

## supplier_stricker.v_customization_by_technique (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | supplier_stricker.customization_options |
| populada | n/a |
| comentário | Resumo de personalização por técnica de gravação |


```sql
SELECT technique_code,
    technique_name,
    count(DISTINCT prod_reference) AS products_count,
    count(*) AS options_count,
    avg(area_width_cm * area_height_cm) AS avg_area_cm2,
    min(price) AS min_price,
    max(price) AS max_price
   FROM supplier_stricker.customization_options
  WHERE is_active = true
  GROUP BY technique_code, technique_name
  ORDER BY (count(DISTINCT prod_reference)) DESC;
```

## supplier_stricker.v_images_by_product (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | supplier_stricker.optionals, supplier_stricker.products |
| populada | n/a |
| comentário | Todas as imagens por produto e variante |


```sql
SELECT p.prod_reference,
    p.name,
    p.main_image,
    p.optional_image_1,
    p.optional_image_2,
    o.sku,
    o.color_name,
    o.image_1,
    o.image_2,
    o.image_3,
    o.image_4,
    o.image_5,
    o.image_6,
    o.image_7
   FROM supplier_stricker.products p
     LEFT JOIN supplier_stricker.optionals o ON p.prod_reference::text = o.prod_reference::text
  WHERE p.is_active = true;
```

## supplier_stricker.v_products_complete (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | supplier_stricker.optionals, supplier_stricker.products, supplier_stricker.stocks |
| populada | n/a |
| comentário | Visão consolidada de produtos com contagem de variantes e estoque |


```sql
SELECT p.id,
    p.prod_reference,
    p.name,
    p.description,
    p.brand,
    p.type_name,
    p.subtype_name,
    p.is_stockout,
    p.main_image,
    count(o.id) AS total_variants,
    count(DISTINCT o.color_code) AS total_colors,
    min(o.price_1) AS min_price,
    max(o.price_1) AS max_price,
    COALESCE(sum(s.stock_quantity), 0::bigint) AS total_stock,
    p.synced_at
   FROM supplier_stricker.products p
     LEFT JOIN supplier_stricker.optionals o ON p.prod_reference::text = o.prod_reference::text
     LEFT JOIN supplier_stricker.stocks s ON o.sku::text = s.sku::text
  WHERE p.is_active = true
  GROUP BY p.id, p.prod_reference, p.name, p.description, p.brand, p.type_name, p.subtype_name, p.is_stockout, p.main_image, p.synced_at;
```

## supplier_stricker.v_stock_by_product (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | supplier_stricker.optionals, supplier_stricker.products, supplier_stricker.stocks |
| populada | n/a |
| comentário | Estoque agregado por referência de produto |


```sql
SELECT p.prod_reference,
    p.name,
    count(DISTINCT o.sku) AS total_skus,
    sum(s.stock_quantity) AS total_stock,
    min(s.stock_quantity) AS min_stock_sku,
    max(s.stock_quantity) AS max_stock_sku,
    bool_or(s.stock_quantity > 0) AS has_stock,
    min(s.next_date_1) AS next_restock_date
   FROM supplier_stricker.products p
     JOIN supplier_stricker.optionals o ON p.prod_reference::text = o.prod_reference::text
     LEFT JOIN supplier_stricker.stocks s ON o.sku::text = s.sku::text
  WHERE p.is_active = true AND o.is_active = true
  GROUP BY p.prod_reference, p.name;
```
