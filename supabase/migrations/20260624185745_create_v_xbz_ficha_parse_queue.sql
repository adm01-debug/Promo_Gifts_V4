CREATE OR REPLACE VIEW public.v_xbz_ficha_parse_queue AS
WITH ficha AS (
  SELECT spr.product_id,
         max(spr.site_data->>'ficha_tecnica_pdf') AS ficha_pdf_url,
         max(spr.site_scraped_at)                 AS last_scraped
  FROM supplier_products_raw spr
  WHERE spr.supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900'
    AND coalesce(spr.site_data->>'ficha_tecnica_pdf','')<>''
  GROUP BY spr.product_id
), comp AS (
  SELECT kit_product_id,
         count(*)                                   AS n_comp,
         count(*) FILTER (WHERE NOT is_packaging)   AS n_itens,
         count(*) FILTER (WHERE dim_source='heuristic') AS n_dim_heuristic,
         count(*) FILTER (WHERE dim_source='ficha')     AS n_dim_ficha
  FROM product_kit_components GROUP BY kit_product_id
)
SELECT
  p.sku  AS product_sku,
  p.id   AS product_id,
  p.name AS product_name,
  p.is_kit,
  (p.name ~* '[0-9]+\s*pe[çc]as') AS nome_indica_pecas,
  f.ficha_pdf_url,
  f.last_scraped,
  coalesce(c.n_comp,0)          AS n_componentes,
  coalesce(c.n_dim_heuristic,0) AS n_dim_heuristicas,
  coalesce(c.n_dim_ficha,0)     AS n_dim_ficha,
  CASE
    WHEN p.is_kit AND coalesce(c.n_dim_heuristic,0)>0 THEN 1
    WHEN p.is_kit AND coalesce(c.n_comp,0)=0          THEN 2
    WHEN (NOT p.is_kit) AND (p.name ~* '[0-9]+\s*pe[çc]as') THEN 3
    WHEN p.is_kit                                     THEN 4
    ELSE 5
  END AS prioridade,
  CASE
    WHEN p.is_kit AND coalesce(c.n_dim_heuristic,0)>0 THEN 'kit_decomposto_dims_heuristicas'
    WHEN p.is_kit AND coalesce(c.n_comp,0)=0          THEN 'kit_sem_componentes'
    WHEN (NOT p.is_kit) AND (p.name ~* '[0-9]+\s*pe[çc]as') THEN 'reclassificar_e_decompor'
    WHEN p.is_kit                                     THEN 'kit_completo_ficha'
    ELSE 'produto_comum_com_ficha'
  END AS motivo
FROM ficha f
JOIN products p ON p.id=f.product_id
LEFT JOIN comp c ON c.kit_product_id=p.id;

COMMENT ON VIEW public.v_xbz_ficha_parse_queue IS
  'Fila de trabalho do parse da ficha tecnica XBZ. prioridade 1=kit decomposto c/ dims heuristicas (parse grava real ja); 2=kit sem componentes; 3=parece kit mas is_kit=false (reclassificar+decompor); 4=kit ja ficha; 5=produto comum. O parser le esta fila, busca ficha_pdf_url, e alimenta kit_component_ficha_staging.';;
