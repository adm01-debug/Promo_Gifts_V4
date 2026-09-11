
-- Batch 3: Supply + Fiscal + Físico
COMMENT ON COLUMN public.products.lead_time_days IS 'Prazo de produção em dias úteis. 82% preenchido (NULL=herda fornecedor). Valores: 2 ou 3.';
COMMENT ON COLUMN public.products.supply_mode IS 'Modalidade de fornecimento. FLAG-MORTA: constante pronta_entrega_liso. Futuro uso: diferenciar modos.';
COMMENT ON COLUMN public.products.supplier_reference IS 'Código interno do fornecedor para este produto. Rastreabilidade.';
COMMENT ON COLUMN public.products.supplier_updated_at IS 'Última atualização recebida do fornecedor. Frescor de sync.';
COMMENT ON COLUMN public.products.origin_country IS 'País de origem ISO 3166-1 alpha-2 (ex: BR, CN). Usado em cálculos fiscais.';
COMMENT ON COLUMN public.products.weight_gr IS 'Gramatura têxtil em g/m² (texto, ex: "80 g/m²"). DIFERENTE de weight_g (peso em gramas). 114 registros (produtos têxteis).';
COMMENT ON COLUMN public.products.box_length_mm IS 'Comprimento da embalagem em mm (inteiro). Ver box_length_cm para valor em cm.';
COMMENT ON COLUMN public.products.box_quantity IS 'Quantidade de produtos por caixa master.';
COMMENT ON COLUMN public.products.box_inner_quantity IS 'Quantidade por caixa interna (inner box).';
COMMENT ON COLUMN public.products.box_volume_cm3 IS 'Volume da embalagem calculado (length×width×height cm³).';
COMMENT ON COLUMN public.products.packing_type IS 'Tipo de embalagem original. Ex: caixa_individual, polybag, granel.';
COMMENT ON COLUMN public.products.packing_classification IS 'Classificação semântica da embalagem. Derivada pelo pipeline.';
COMMENT ON COLUMN public.products.has_gift_box IS 'TRUE se tem caixa presente como padrão ou opção.';
COMMENT ON COLUMN public.products.has_commercial_packaging IS 'TRUE se tem embalagem comercial própria.';
COMMENT ON COLUMN public.products.packaging_material IS 'Material da embalagem. Ex: papel, plástico.';
;
