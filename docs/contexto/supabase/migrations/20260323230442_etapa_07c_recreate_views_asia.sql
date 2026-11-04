-- Recriar views Asia (8 views)
CREATE OR REPLACE VIEW public.vw_asia_products_stats AS
SELECT count(*) AS total_produtos,
    count(CASE WHEN processed = true THEN 1 ELSE NULL::integer END) AS produtos_processados,
    count(CASE WHEN processed = false THEN 1 ELSE NULL::integer END) AS produtos_pendentes,
    round(count(CASE WHEN processed = true THEN 1 ELSE NULL::integer END)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS taxa_processamento_pct,
    min(created_at) AS primeira_importacao,
    max(updated_at) AS ultima_atualizacao,
    max(imported_at) AS ultimo_import,
    round(avg(parse_asia_price(raw_data)), 2) AS preco_medio,
    round(min(parse_asia_price(raw_data)), 2) AS preco_minimo,
    round(max(parse_asia_price(raw_data)), 2) AS preco_maximo,
    sum(parse_asia_stock(raw_data)) AS estoque_total,
    count(CASE WHEN parse_asia_stock(raw_data) > 0 THEN 1 ELSE NULL::integer END) AS com_estoque,
    count(CASE WHEN parse_asia_stock(raw_data) = 0 THEN 1 ELSE NULL::integer END) AS sem_estoque,
    count(CASE WHEN ((parse_asia_media(raw_data) ->> 'tem_video'::text)::boolean) = true THEN 1 ELSE NULL::integer END) AS com_video,
    count(CASE WHEN (parse_asia_media(raw_data) -> 'galeria'::text) IS NOT NULL THEN 1 ELSE NULL::integer END) AS com_galeria
FROM supplier_products_raw
WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid;

CREATE OR REPLACE VIEW public.vw_asia_products_by_category AS
SELECT cat.value ->> 'id_asia'::text AS id_categoria_asia,
    cat.value ->> 'nome'::text AS nome_categoria,
    count(*) AS total_produtos,
    round(avg(parse_asia_price(spr.raw_data)), 2) AS preco_medio,
    round(min(parse_asia_price(spr.raw_data)), 2) AS preco_minimo,
    round(max(parse_asia_price(spr.raw_data)), 2) AS preco_maximo,
    sum(parse_asia_stock(spr.raw_data)) AS estoque_total,
    count(CASE WHEN parse_asia_stock(spr.raw_data) > 0 THEN 1 ELSE NULL::integer END) AS com_estoque,
    count(CASE WHEN spr.processed = true THEN 1 ELSE NULL::integer END) AS processados,
    count(CASE WHEN spr.processed = false THEN 1 ELSE NULL::integer END) AS pendentes
FROM supplier_products_raw spr,
    LATERAL jsonb_array_elements(parse_asia_categories(spr.raw_data)) cat(value)
WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
GROUP BY (cat.value ->> 'id_asia'::text), (cat.value ->> 'nome'::text)
ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.vw_asia_products_by_color AS
SELECT cor.value ->> 'slug'::text AS slug_cor,
    cor.value ->> 'nome'::text AS nome_cor,
    cor.value ->> 'hex'::text AS hex_cor,
    count(DISTINCT spr.supplier_reference) AS total_produtos,
    round(avg(parse_asia_price(spr.raw_data)), 2) AS preco_medio,
    sum(parse_asia_stock(spr.raw_data)) AS estoque_total
FROM supplier_products_raw spr,
    LATERAL jsonb_array_elements(parse_asia_colors(spr.raw_data)) cor(value)
WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
GROUP BY (cor.value ->> 'slug'::text), (cor.value ->> 'nome'::text), (cor.value ->> 'hex'::text)
ORDER BY (count(DISTINCT spr.supplier_reference)) DESC;

CREATE OR REPLACE VIEW public.vw_asia_products_by_tag AS
SELECT tag.value ->> 'id_asia'::text AS id_tag_asia,
    tag.value ->> 'nome'::text AS nome_tag,
    count(*) AS total_produtos,
    round(avg(parse_asia_price(spr.raw_data)), 2) AS preco_medio,
    sum(parse_asia_stock(spr.raw_data)) AS estoque_total
FROM supplier_products_raw spr,
    LATERAL jsonb_array_elements(parse_asia_tags(spr.raw_data)) tag(value)
WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
GROUP BY (tag.value ->> 'id_asia'::text), (tag.value ->> 'nome'::text)
ORDER BY (count(*)) DESC;
