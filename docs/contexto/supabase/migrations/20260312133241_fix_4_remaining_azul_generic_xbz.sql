-- 4 variantes XBZ com cor vazia que caíram em "Azul" genérica → Azul Royal
UPDATE product_variants SET
  color_id = 'dd0e1acb-850a-4c0b-87a8-963595ee6508',
  color_name = 'Azul Royal',
  color_hex = '#4169E1',
  updated_at = NOW()
FROM products p JOIN suppliers s ON p.supplier_id = s.id
WHERE product_variants.product_id = p.id AND s.code = 'XBZ'
  AND product_variants.color_id = '34b1361e-f965-4aea-b801-2001246c7d1e';
