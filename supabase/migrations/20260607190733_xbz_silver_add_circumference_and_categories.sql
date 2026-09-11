
-- circumference_cm: perímetro em cm (produtos cilíndricos — garrafas, copos, canecas)
ALTER TABLE produtos_padronizacao
    ADD COLUMN IF NOT EXISTS circumference_cm numeric;

-- supplier_categories: categorias hierárquicas do site do fornecedor (JSONB)
-- Estrutura: [{nome, path, nivel, url}, ...]
-- nivel=1 → categoria raiz; nivel=2 → subcategoria
ALTER TABLE produtos_padronizacao
    ADD COLUMN IF NOT EXISTS supplier_categories jsonb;

COMMENT ON COLUMN produtos_padronizacao.circumference_cm IS
'Circunferência em cm. Vem de site_data.dimensoes.circunferencia_cm via fn_xbz_enrich_from_site. Relevante para produtos cilíndricos (garrafas, copos, canecas térm.).';

COMMENT ON COLUMN produtos_padronizacao.supplier_categories IS
'Categorias hierárquicas do site do fornecedor XBZ.
Estrutura: [{nome, path, nivel (1=raiz, 2=sub), url}].
Alimentada por fn_xbz_enrich_from_site via site_data.categorias.
A resolução para category_id interno é feita via De→Para (supplier_category_mappings).';
;
