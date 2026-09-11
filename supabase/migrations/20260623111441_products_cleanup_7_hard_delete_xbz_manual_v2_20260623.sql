
-- ══════════════════════════════════════════════════════════════════
-- Melhoria 7 v2: Hard-delete com limpeza prévia das FK NO ACTION
-- Ordem: NO ACTION deps primeiro, depois CASCADE via DELETE products
-- ══════════════════════════════════════════════════════════════════

-- 7A: Limpar print_area_techniques (4 registros, ON DELETE NO ACTION)
DELETE FROM public.print_area_techniques
WHERE product_id IN (
  SELECT id FROM products WHERE is_deleted = true AND sku LIKE 'XBZ-MANUAL-%'
);

-- 7B: Limpar variant_supplier_sources antes dos variants (FK para product_variants)
DELETE FROM public.variant_supplier_sources
WHERE variant_id IN (
  SELECT pv.id FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE p.is_deleted = true AND p.sku LIKE 'XBZ-MANUAL-%'
);

-- 7C: Hard-delete principal — CASCADE apaga 33 category_assignments + 19 variants + outros
DELETE FROM public.products
WHERE is_deleted = true
  AND sku LIKE 'XBZ-MANUAL-%';
;
