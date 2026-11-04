-- INOX: 136 variantes Prata Inox → Prata Acetinado (Fosco)
UPDATE product_variants SET
  color_id = '65f4ed80-89ae-4ec6-9e3a-8513f3d89dd6',
  color_name = 'Prata Acetinado (Fosco)',
  color_hex = '#868686',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.attributes->>'cor' = 'INOX'
  AND product_variants.color_id = 'b0342859-437c-439b-a4bf-d323a2b6681e';
