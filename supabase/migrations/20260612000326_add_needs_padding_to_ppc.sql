
ALTER TABLE product_packaging_compatibility
    ADD COLUMN IF NOT EXISTS needs_padding boolean DEFAULT false;

COMMENT ON COLUMN product_packaging_compatibility.needs_padding IS
'Produto plano em caixa alta (gap_height>200mm): precisa de preenchimento/padding vertical. Definido pela regra B11.';
;
