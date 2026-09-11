-- MELHORIA 1: rastreabilidade de procedência de peso e material
ALTER TABLE public.product_kit_components
  ADD COLUMN IF NOT EXISTS weight_source varchar(30)
    CHECK (weight_source IN ('measured_real','inherited_total','estimated_heuristic','supplier_api','manual')),
  ADD COLUMN IF NOT EXISTS material_source varchar(30)
    CHECK (material_source IN ('ficha','heuristic_type','heuristic_name','supplier_api','manual'));

COMMENT ON COLUMN public.product_kit_components.weight_source IS
  'Procedência do peso por peça: measured_real=medido na ficha técnica; inherited_total=copiado do peso total do produto-pai (NÃO é o peso real da peça); estimated_heuristic=estimativa heurística por volume/proporção; supplier_api=dado estruturado do fornecedor; manual=revisado/corrigido manualmente.';

COMMENT ON COLUMN public.product_kit_components.material_source IS
  'Procedência do material: ficha=ficha técnica verificada; heuristic_type=inferido do component_type_code via kit_component_types; heuristic_name=inferido por keywords do nome do componente; supplier_api=dado estruturado do fornecedor; manual=revisado manualmente.';;
