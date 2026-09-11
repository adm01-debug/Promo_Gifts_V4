
-- Melhoria 5: COMMENTs nas colunas 99%+ NULL (não podem ser dropadas por ter refs de código)
COMMENT ON COLUMN public.products.internal_height_cm IS
'Dimensão interna (altura) para kits/embalagens. null_frac=99.8% (9 valores distintos). Usado em 12 arquivos frontend (kit-builder). DROP requer refatoração coordenada.';
COMMENT ON COLUMN public.products.internal_width_cm IS
'Dimensão interna (largura). null_frac=99.8%. Usado em kit-builder. DROP requer refatoração coordenada.';
COMMENT ON COLUMN public.products.internal_length_cm IS
'Dimensão interna (comprimento). null_frac=99.8%. Usado em kit-builder. DROP requer refatoração coordenada.';
COMMENT ON COLUMN public.products.optional_packaging_ref IS
'Referência de embalagem opcional. null_frac=99%+. 1 ref frontend. Candidata a DROP após refatoração.';
;
