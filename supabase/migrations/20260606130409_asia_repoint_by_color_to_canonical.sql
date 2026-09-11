-- by_color estava 100% vazia (parse_asia_colors le um array 'cores' inexistente).
-- Repaginada para a COR canonica de produtos_padronizacao_variantes (color_name/code/hex, ~89% preenchida).
CREATE OR REPLACE VIEW public.vw_asia_products_by_color AS
 SELECT lower(regexp_replace(pv.color_name, '\s+', '-', 'g')) AS slug_cor,
    pv.color_name AS nome_cor,
    pv.color_hex AS hex_cor,
    count(DISTINCT pv.variant_reference) AS total_produtos,
    round(avg(pv.cost_price), 2) AS preco_medio,
    sum(pv.stock_quantity) AS estoque_total
   FROM produtos_padronizacao_variantes pv
  WHERE pv.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'::uuid
    AND pv.color_name IS NOT NULL
  GROUP BY lower(regexp_replace(pv.color_name, '\s+', '-', 'g')), pv.color_name, pv.color_hex
  ORDER BY (count(DISTINCT pv.variant_reference)) DESC;;
