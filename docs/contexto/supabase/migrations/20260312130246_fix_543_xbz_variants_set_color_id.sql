-- FASE 3: Corrigir 543 variantes XBZ sem color_id
-- Subquery approach para respeitar sintaxe PostgreSQL UPDATE...FROM
UPDATE product_variants
SET 
  color_id = mapping.variation_id,
  color_name = mapping.variation_name,
  color_hex = mapping.variation_hex,
  updated_at = NOW()
FROM (
  SELECT 
    pv.id as variant_id,
    cv.id as variation_id,
    cv.name as variation_name,
    cv.hex_code as variation_hex
  FROM product_variants pv
  JOIN products p ON pv.product_id = p.id
  JOIN suppliers s ON p.supplier_id = s.id
  JOIN supplier_colors sc ON UPPER(sc.name) = UPPER(pv.color_name) AND sc.supplier_id = s.id
  JOIN color_equivalences ce ON ce.supplier_color_id = sc.id AND ce.is_active = true
  JOIN color_variations cv ON ce.promo_variation_id = cv.id
  WHERE s.code = 'XBZ' AND pv.color_id IS NULL
) mapping
WHERE product_variants.id = mapping.variant_id;
