
-- Batch 5: Categorização + Personalização + Demais
COMMENT ON COLUMN public.products.has_colors IS 'TRUE se produto tem variações de cor. Cache de COUNT(product_variants WHERE color_id IS NOT NULL).';
COMMENT ON COLUMN public.products.has_sizes IS 'TRUE se produto tem variações de tamanho. Cache similar a has_colors.';
COMMENT ON COLUMN public.products.has_capacity IS 'TRUE se produto tem variações de capacidade (ml). Cache de variantes.';
COMMENT ON COLUMN public.products.allows_personalization IS 'TRUE se produto aceita personalização (gravação, bordado, etc.). Controla exibição de técnicas.';
COMMENT ON COLUMN public.products.combined_sizes IS 'String consolidada de tamanhos disponíveis (ex: "P/M/G/GG"). Cache para display rápido.';
COMMENT ON COLUMN public.products.capacities IS 'String de capacidades disponíveis (ex: "250ml/350ml/500ml"). Cache.';
COMMENT ON COLUMN public.products.gender IS 'Gênero do produto (M/F/U=unissex). Classificação para segmentação.';
COMMENT ON COLUMN public.products.pvc_free IS 'TRUE se produto é livre de PVC. Campo de compliance ambiental.';
COMMENT ON COLUMN public.products.colors IS 'Cache jsonb de cores disponíveis. Espelho de product_variants + canonical_colors.';
COMMENT ON COLUMN public.products.materials IS 'Cache jsonb de materiais. Espelho de product_materials. Prefer product_materials para queries completas.';
COMMENT ON COLUMN public.products.tags IS 'Cache jsonb de tags/categorias adicionais. Espelho de product_tags. GIN index dropado (não usado).';
COMMENT ON COLUMN public.products.engraving_type IS 'Técnica de gravação principal do produto. Ex: serigrafia, laser, bordado.';
COMMENT ON COLUMN public.products.locked_fields IS 'Array de nomes de colunas protegidas de sobrescrita pelo pipeline. Gerenciado por trg_aa_capture_manual_edits.';
COMMENT ON COLUMN public.products.search_vector IS 'Vetor tsvector para busca full-text. Mantido por trigger (Weight A=name, B=description, C=tags). Alimenta fn_global_search.';
COMMENT ON COLUMN public.products.color_swatches IS 'jsonb de swatches de cor para exibição em grid. Gerado por fn_generate_color_swatches.';
COMMENT ON COLUMN public.products.product_type IS 'Tipo de produto (livre). Ex: caneta, caneca, mochila. Diferente de category.';
COMMENT ON COLUMN public.products.target_audience IS 'Público-alvo do produto (array). Ex: ["corporativo","executivo"].';
COMMENT ON COLUMN public.products.is_seasonal IS 'Produto sazonal. Classificação de sazionalidade (Natal, Páscoa, etc).';
COMMENT ON COLUMN public.products.sub_brand IS 'Sub-marca ou linha do produto (ex: Linha Premium, Linha Eco). 15.8% preenchido.';
COMMENT ON COLUMN public.products.sub_brand_id IS 'FK para a sub-marca (uuid). Par com sub_brand. 15.8% preenchido.';
COMMENT ON COLUMN public.products.dimensions_source IS 'Origem/unidade das dimensões escalares. Valores: cm, mm, estimated, manual, supplier. Migrado de dimensions->unit_detected em 2026-06-23.';
;
