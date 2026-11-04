-- FASE 2: Corrigir 37 variantes SPOT code 154 "Azul aqua"
-- De: color_id = "Azul" genérica (34b1361e-f965-4aea-b801-2001246c7d1e)
-- Para: color_id = "Azul Piscina" (4152c812-a293-48c8-8bd0-d059d26fd123)
UPDATE product_variants pv
SET color_id = '4152c812-a293-48c8-8bd0-d059d26fd123',  -- Azul Piscina
    color_name = 'Azul Piscina',
    color_hex = '#00FFFF',
    updated_at = NOW()
FROM products p
JOIN suppliers s ON p.supplier_id = s.id
WHERE pv.product_id = p.id
  AND s.code = 'STRICKER'
  AND pv.color_code = '154'
  AND pv.color_id = '34b1361e-f965-4aea-b801-2001246c7d1e';  -- estava em Azul genérica
