
-- T33 era falso negativo: "Lápis" e "Artigos para Vinhos" já existiam com subtype_code=NULL
-- Corrigir: popular o subtype_code nos registros existentes (que estavam NULL)
UPDATE supplier_subtype_category_map
SET subtype_code = '0160', updated_at = now()
WHERE supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
  AND subtype_desc = 'Lápis'
  AND subtype_code IS NULL;

UPDATE supplier_subtype_category_map
SET subtype_code = '102', updated_at = now()
WHERE supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
  AND subtype_desc = 'Artigos para Vinhos'
  AND subtype_code IS NULL;
;
