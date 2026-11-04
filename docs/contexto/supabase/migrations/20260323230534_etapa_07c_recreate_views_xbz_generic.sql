-- Recriar views XBZ (3 views) + genericas (3 views)
CREATE OR REPLACE VIEW public.vw_xbz_products_stats AS
SELECT count(*) AS total_produtos,
    count(CASE WHEN processed = true THEN 1 ELSE NULL::integer END) AS processados,
    count(CASE WHEN processed = false OR processed IS NULL THEN 1 ELSE NULL::integer END) AS pendentes,
    count(CASE WHEN product_id IS NOT NULL THEN 1 ELSE NULL::integer END) AS com_product_id,
    count(DISTINCT raw_data ->> 'web_tipo'::text) AS categorias_distintas,
    count(DISTINCT raw_data ->> 'cor_web_principal'::text) AS cores_distintas,
    min(created_at) AS primeiro_import,
    max(updated_at) AS ultimo_update
FROM supplier_products_raw
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid;

CREATE OR REPLACE VIEW public.vw_xbz_products_by_category AS
SELECT raw_data ->> 'web_tipo'::text AS categoria,
    raw_data ->> 'web_sub_tipo'::text AS subcategoria,
    count(*) AS total_produtos,
    round(avg((raw_data ->> 'preco_venda'::text)::numeric), 2) AS preco_medio
FROM supplier_products_raw
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
GROUP BY (raw_data ->> 'web_tipo'::text), (raw_data ->> 'web_sub_tipo'::text)
ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.vw_xbz_products_by_color AS
SELECT raw_data ->> 'cor_web_principal'::text AS cor,
    count(*) AS total_produtos,
    round(avg((raw_data ->> 'preco_venda'::text)::numeric), 2) AS preco_medio
FROM supplier_products_raw
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid AND (raw_data ->> 'cor_web_principal'::text) IS NOT NULL
GROUP BY (raw_data ->> 'cor_web_principal'::text)
ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.vw_supplier_products_raw_status AS
SELECT s.id AS supplier_id, s.name AS supplier_name,
    count(*) AS total_produtos,
    count(*) FILTER (WHERE spr.processed = true) AS processados,
    count(*) FILTER (WHERE spr.processed = false) AS pendentes,
    count(*) FILTER (WHERE spr.process_errors IS NOT NULL) AS com_erro,
    round(count(*) FILTER (WHERE spr.processed = true)::numeric * 100.0 / NULLIF(count(*), 0)::numeric, 2) AS taxa_sucesso_pct,
    min(spr.imported_at) AS primeira_importacao,
    max(spr.imported_at) AS ultima_importacao,
    avg(EXTRACT(epoch FROM spr.processed_at - spr.imported_at)) AS tempo_medio_processamento_seg
FROM supplier_products_raw spr JOIN suppliers s ON s.id = spr.supplier_id
GROUP BY s.id, s.name ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.vw_supplier_products_raw_errors AS
SELECT s.name AS supplier_name, spr.supplier_reference,
    spr.process_errors, spr.imported_at, spr.updated_at
FROM supplier_products_raw spr JOIN suppliers s ON s.id = spr.supplier_id
WHERE spr.process_errors IS NOT NULL ORDER BY spr.updated_at DESC LIMIT 100;

CREATE OR REPLACE VIEW public.vw_products_ai_status AS
SELECT p.id, p.sku, p.name, c.name AS category_name,
    p.ai_version, p.ai_generated_at, p.ai_model,
    CASE
        WHEN p.ai_generated_at IS NULL THEN 'PENDENTE'
        WHEN p.ai_version = 1 THEN 'GERADO_V1'
        WHEN p.ai_version > 1 THEN 'ATUALIZADO_V' || p.ai_version
    END AS ai_status,
    length(p.ai_title) AS title_length,
    length(p.ai_description) AS description_length,
    (EXISTS (SELECT 1 FROM supplier_products_raw spr WHERE spr.product_id = p.id)) AS has_raw_data
FROM products p LEFT JOIN categories c ON p.category_id = c.id;
