-- Recriar views SoMarcas (4 views)
CREATE OR REPLACE VIEW public.vw_somarcas_stats AS
SELECT count(*) AS total_produtos,
    count(*) FILTER (WHERE ((raw_data ->> 'estoque'::text)::integer) > 0) AS com_estoque,
    count(*) FILTER (WHERE ((raw_data ->> 'estoque'::text)::integer) = 0) AS sem_estoque,
    count(*) FILTER (WHERE (raw_data ->> 'produto_ativo'::text) = 'sim'::text) AS ativos,
    count(*) FILTER (WHERE processed = true) AS processados,
    count(*) FILTER (WHERE processed = false) AS pendentes,
    round(avg((raw_data ->> 'preco_com_gravacao_com_impostos'::text)::numeric), 2) AS preco_medio,
    min((raw_data ->> 'preco_com_gravacao_com_impostos'::text)::numeric) AS preco_min,
    max((raw_data ->> 'preco_com_gravacao_com_impostos'::text)::numeric) AS preco_max,
    sum((raw_data ->> 'estoque'::text)::integer) AS estoque_total
FROM supplier_products_raw
WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid;

CREATE OR REPLACE VIEW public.vw_somarcas_pending AS
SELECT id, supplier_reference AS sku,
    raw_data ->> 'titulo'::text AS titulo,
    (raw_data ->> 'estoque'::text)::integer AS estoque,
    (raw_data ->> 'preco_com_gravacao_com_impostos'::text)::numeric AS preco,
    imported_at
FROM supplier_products_raw
WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND processed = false
ORDER BY imported_at DESC;

CREATE OR REPLACE VIEW public.vw_somarcas_materials AS
SELECT CASE
    WHEN upper(raw_data ->> 'titulo'::text) ~~ '%BAMBU%'::text THEN 'Bambu'
    WHEN upper(raw_data ->> 'titulo'::text) ~~ '%INOX%'::text THEN 'Aço Inox'
    WHEN upper(raw_data ->> 'titulo'::text) ~~ '%MADEIRA%'::text THEN 'Madeira'
    WHEN upper(raw_data ->> 'titulo'::text) ~~ '%ALUM%NIO%'::text THEN 'Alumínio'
    WHEN upper(raw_data ->> 'titulo'::text) ~~ '%PL%STICO%'::text THEN 'Plástico'
    WHEN upper(raw_data ->> 'titulo'::text) ~~ '%VIDRO%'::text THEN 'Vidro'
    WHEN upper(raw_data ->> 'titulo'::text) ~~ '%COURO%'::text THEN 'Couro'
    WHEN upper(raw_data ->> 'titulo'::text) ~~ '%CER%MICA%'::text THEN 'Cerâmica'
    ELSE 'Outros'
  END AS material,
  count(*) AS total,
  sum((raw_data ->> 'estoque'::text)::integer) AS estoque
FROM supplier_products_raw
WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid
GROUP BY 1 ORDER BY total DESC;

CREATE OR REPLACE VIEW public.vw_somarcas_sync_status AS
SELECT 
  (SELECT count(*) FROM supplier_products_raw WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid) AS total_raw,
  (SELECT count(*) FROM supplier_products_raw WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND processed = true) AS processados,
  (SELECT count(*) FROM supplier_products_raw WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND processed = false) AS pendentes,
  (SELECT count(*) FROM supplier_products_raw WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid AND process_errors IS NOT NULL) AS com_erro,
  (SELECT max(imported_at) FROM supplier_products_raw WHERE supplier_id = '841cd690-210a-422a-908c-7676828db272'::uuid) AS ultima_importacao;
