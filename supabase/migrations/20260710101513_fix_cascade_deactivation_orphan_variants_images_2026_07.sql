
-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: fix_cascade_deactivation_orphan_variants_images_2026_07
--
-- Corrige dois gaps de consistência identificados na Auditoria v5 Battery Q:
--
-- BUG Q06: produto 19148 tem is_active=false mas 3 variantes com is_active=true
--   → O trigger fn_cascade_product_deactivation deveria ter cascateado,
--     mas não o fez (produto foi desativado via mecanismo alternativo)
--
-- BUG Q10: BAC005P e CJ405 (desativados em 2026-06-27) têm product_images
--   com is_active=true — trigger não existia ou não cascateou para images
--
-- FIX: Aplicar o cascade manualmente para os dois casos
-- ═══════════════════════════════════════════════════════════════════

-- FIX Q06: Desativar variantes órfãs de produtos inativos
-- Aplica a mesma lógica que fn_cascade_product_deactivation deveria ter aplicado
UPDATE product_variants pv
SET is_active  = false,
    updated_at = NOW()
FROM products p
WHERE pv.product_id = p.id
  AND p.is_active    = false
  AND pv.is_active   = true;

-- FIX Q10: Desativar product_images de produtos inativos
-- Se o produto está inativo, suas imagens devem estar inativas também
UPDATE product_images pi
SET is_active  = false,
    updated_at = NOW()
FROM products p
WHERE pi.product_id = p.id
  AND p.is_active   = false
  AND pi.is_active  = true;
;
