-- Atualizar CHECK constraint para incluir 'estimated_proportional'
ALTER TABLE public.product_kit_components
  DROP CONSTRAINT IF EXISTS product_kit_components_weight_source_check;

ALTER TABLE public.product_kit_components
  ADD CONSTRAINT product_kit_components_weight_source_check
  CHECK (weight_source IN ('measured_real','inherited_total','estimated_heuristic','estimated_proportional','supplier_api','manual'));

COMMENT ON COLUMN public.product_kit_components.weight_source IS
  'Procedência do peso por peça: measured_real=medido na ficha técnica; inherited_total=copiado do peso total do produto-pai (NÃO é o peso real da peça); estimated_heuristic=estimativa heurística por volume/proporção; estimated_proportional=peso total do kit dividido igualmente pelos componentes; supplier_api=dado estruturado do fornecedor; manual=revisado manualmente.';;
