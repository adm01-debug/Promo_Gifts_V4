-- ASIA uuid: d2734e23-d633-4819-bb15-e51aa44e2118
-- Estoque/preco agora do canonico (produtos_padronizacao_variantes via raw_id, 1:1).
-- LEFT JOIN preserva linhas sem variante (status counts intactos). Taxonomia/midia seguem do raw.

CREATE OR REPLACE VIEW public.vw_asia_products_by_category AS
 SELECT cat.value ->> 'id_asia'::text AS id_categoria_asia,
    cat.value ->> 'nome'::text AS nome_categoria,
    count(*) AS total_produtos,
    round(avg(pv.cost_price), 2) AS preco_medio,
    round(min(pv.cost_price), 2) AS preco_minimo,
    round(max(pv.cost_price), 2) AS preco_maximo,
    sum(pv.stock_quantity) AS estoque_total,
    count(CASE WHEN pv.stock_quantity > 0 THEN 1 ELSE NULL::integer END) AS com_estoque,
    count(CASE WHEN spr.status = 'processed'::supplier_raw_status THEN 1 ELSE NULL::integer END) AS processados,
    count(CASE WHEN spr.status <> 'processed'::supplier_raw_status THEN 1 ELSE NULL::integer END) AS pendentes
   FROM supplier_products_raw spr
   LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
   CROSS JOIN LATERAL jsonb_array_elements(parse_asia_categories(spr.raw_data)) cat(value)
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
  GROUP BY (cat.value ->> 'id_asia'::text), (cat.value ->> 'nome'::text)
  ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.vw_asia_products_by_color AS
 SELECT cor.value ->> 'slug'::text AS slug_cor,
    cor.value ->> 'nome'::text AS nome_cor,
    cor.value ->> 'hex'::text AS hex_cor,
    count(DISTINCT spr.supplier_reference) AS total_produtos,
    round(avg(pv.cost_price), 2) AS preco_medio,
    sum(pv.stock_quantity) AS estoque_total
   FROM supplier_products_raw spr
   LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
   CROSS JOIN LATERAL jsonb_array_elements(parse_asia_colors(spr.raw_data)) cor(value)
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
  GROUP BY (cor.value ->> 'slug'::text), (cor.value ->> 'nome'::text), (cor.value ->> 'hex'::text)
  ORDER BY (count(DISTINCT spr.supplier_reference)) DESC;

CREATE OR REPLACE VIEW public.vw_asia_products_by_tag AS
 SELECT tag.value ->> 'id_asia'::text AS id_tag_asia,
    tag.value ->> 'nome'::text AS nome_tag,
    count(*) AS total_produtos,
    round(avg(pv.cost_price), 2) AS preco_medio,
    sum(pv.stock_quantity) AS estoque_total
   FROM supplier_products_raw spr
   LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
   CROSS JOIN LATERAL jsonb_array_elements(parse_asia_tags(spr.raw_data)) tag(value)
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
  GROUP BY (tag.value ->> 'id_asia'::text), (tag.value ->> 'nome'::text)
  ORDER BY (count(*)) DESC;

CREATE OR REPLACE VIEW public.vw_asia_products_low_stock AS
 SELECT spr.supplier_reference,
    spr.raw_data ->> 'nome'::text AS nome_produto,
    pv.cost_price AS preco,
    pv.stock_quantity AS estoque_atual,
    parse_asia_categories(spr.raw_data) AS categorias,
    spr.updated_at
   FROM supplier_products_raw spr
   LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
    AND pv.stock_quantity > 0 AND pv.stock_quantity < 100
  ORDER BY pv.stock_quantity;

CREATE OR REPLACE VIEW public.vw_asia_products_pending AS
 SELECT spr.supplier_reference,
    spr.raw_data ->> 'nome'::text AS nome_produto,
    pv.cost_price AS preco,
    pv.stock_quantity AS estoque,
    parse_asia_categories(spr.raw_data) AS categorias,
    spr.imported_at,
    spr.created_at,
    EXTRACT(epoch FROM now() - spr.imported_at) / 3600::numeric AS horas_desde_import
   FROM supplier_products_raw spr
   LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
    AND spr.status <> 'processed'::supplier_raw_status
  ORDER BY spr.imported_at DESC;

CREATE OR REPLACE VIEW public.vw_asia_products_promo AS
 SELECT spr.supplier_reference,
    spr.raw_data ->> 'nome'::text AS nome_produto,
    pv.cost_price AS preco,
    pv.stock_quantity AS estoque,
    parse_asia_categories(spr.raw_data) AS categorias,
    spr.updated_at
   FROM supplier_products_raw spr
   LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
    AND ((spr.raw_data ->> 'promocao'::text)::integer) = 1
  ORDER BY pv.cost_price;

CREATE OR REPLACE VIEW public.vw_asia_products_stats AS
 SELECT count(*) AS total_produtos,
    count(CASE WHEN spr.status = 'processed'::supplier_raw_status THEN 1 ELSE NULL::integer END) AS produtos_processados,
    count(CASE WHEN spr.status <> 'processed'::supplier_raw_status THEN 1 ELSE NULL::integer END) AS produtos_pendentes,
    round(count(CASE WHEN spr.status = 'processed'::supplier_raw_status THEN 1 ELSE NULL::integer END)::numeric
          / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS taxa_processamento_pct,
    min(spr.created_at) AS primeira_importacao,
    max(spr.updated_at) AS ultima_atualizacao,
    max(spr.imported_at) AS ultimo_import,
    round(avg(pv.cost_price), 2) AS preco_medio,
    round(min(pv.cost_price), 2) AS preco_minimo,
    round(max(pv.cost_price), 2) AS preco_maximo,
    sum(pv.stock_quantity) AS estoque_total,
    count(CASE WHEN pv.stock_quantity > 0 THEN 1 ELSE NULL::integer END) AS com_estoque,
    count(CASE WHEN pv.stock_quantity = 0 THEN 1 ELSE NULL::integer END) AS sem_estoque,
    count(CASE WHEN ((parse_asia_media(spr.raw_data) ->> 'tem_video'::text)::boolean) = true THEN 1 ELSE NULL::integer END) AS com_video,
    count(CASE WHEN (parse_asia_media(spr.raw_data) -> 'galeria'::text) IS NOT NULL THEN 1 ELSE NULL::integer END) AS com_galeria
   FROM supplier_products_raw spr
   LEFT JOIN produtos_padronizacao_variantes pv ON pv.raw_id = spr.id
  WHERE spr.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid;;
