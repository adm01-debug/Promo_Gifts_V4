CREATE TABLE IF NOT EXISTS public._bkp_kit_packing_type_20260624 AS
WITH derive AS (
  SELECT DISTINCT ON (k.kit_product_id) k.kit_product_id,
    CASE
      WHEN k.component_type_code IN ('CAIXA','CAIXA_XADREZ') THEN 'Caixa'
      WHEN k.component_type_code LIKE 'ESTOJO%' THEN 'Estojo'
      WHEN k.component_type_code='NECESSAIRE' THEN 'Necessaire'
      WHEN k.component_type_code='MOCHILA' THEN 'Mochila'
      WHEN k.component_type_code='BOLSA_TERMICA' THEN 'Bolsa Térmica'
      WHEN k.component_type_code='ECOBAG' THEN 'Ecobag'
      WHEN k.component_type_code='SACOLA' THEN 'Sacola'
      WHEN k.component_type_code='BANDEJA' THEN 'Bandeja'
      ELSE initcap(replace(lower(k.component_type_code),'_',' '))
    END AS dp
  FROM product_kit_components k JOIN products p ON p.id=k.kit_product_id
  WHERE p.is_kit AND NULLIF(TRIM(p.packing_type),'') IS NULL
    AND k.is_packaging AND k.component_type_code IS NOT NULL
    AND NOT ('packing_type' = ANY(COALESCE(p.locked_fields,'{}')))
  ORDER BY k.kit_product_id,
    CASE WHEN k.component_type_code LIKE 'ESTOJO%' OR k.component_type_code IN ('CAIXA','CAIXA_XADREZ') THEN 0 ELSE 1 END,
    k.component_type_code
)
SELECT p.id, p.packing_type AS old_packing_type, d.dp AS new_packing_type, now() AS captured_at
FROM derive d JOIN products p ON p.id=d.kit_product_id;

COMMENT ON TABLE public._bkp_kit_packing_type_20260624 IS
  'Backup MELHORIA 8 (2026-06-24): packing_type antes/depois (derivado do componente-embalagem). Reversão: UPDATE products p SET packing_type=b.old_packing_type FROM _bkp_kit_packing_type_20260624 b WHERE p.id=b.id.';;
