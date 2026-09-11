
-- ============================================================
-- CORREÇÃO: raw_data Asia — adicionar referencia (pai) correta
-- Todos os 1.245 registros: referencia == var_referencia (errado).
-- Fonte do mapeamento: silver (pad_id, 100% resolvido).
-- ============================================================

-- BACKUP primeiro
DROP TABLE IF EXISTS public._bkp_asia_raw_pre_fix_referencia;
CREATE TABLE public._bkp_asia_raw_pre_fix_referencia AS
  SELECT * FROM public.supplier_products_raw
  WHERE supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118';

-- Mapeamento pré-computado: raw_id → supplier_reference do pai
WITH mapa AS (
  SELECT
    pv.raw_id,
    pp.supplier_reference AS referencia_pai,
    br.supplier_reference  AS var_referencia_variante
  FROM produtos_padronizacao_variantes pv
  JOIN produtos_padronizacao pp ON pp.id = pv.pad_id
  JOIN supplier_products_raw br ON br.id = pv.raw_id
  WHERE pv.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
    AND pv.raw_id IS NOT NULL
    AND pv.pad_id IS NOT NULL
)
UPDATE public.supplier_products_raw br
SET raw_data = br.raw_data
  || jsonb_build_object('referencia',    mapa.referencia_pai)
  || jsonb_build_object('var_referencia', mapa.var_referencia_variante)
FROM mapa
WHERE br.id = mapa.raw_id
  AND br.supplier_id = 'd2734e23-d633-4819-bb15-e51aa44e2118'
  AND br.raw_data->>'referencia' = br.raw_data->>'var_referencia';
;
