-- ============================================================
-- Higiene de image_types: tipos zumbis (0 linhas ativas)
-- 1. product → is_active=false (0 usos, never emitted by classifier)
-- 2. mockup, thumbnail → is_internal_only=true (flags inconsistentes)
-- 3. other → nota no description (FALLBACK CRÍTICO do classificador)
-- ============================================================

-- 1. Desativar tipo 'product' (semanticamente redundante; classifier nunca o emite;
--    ADR-001 usa gallery+color_id como substituto; 0 linhas ativas na product_images FK)
UPDATE image_types
SET is_active = false
WHERE code = 'product';

-- 2. Corrigir flags is_internal_only incorretas
UPDATE image_types
SET is_internal_only = true
WHERE code IN ('mockup', 'thumbnail');

-- 3. Documentar 'other' como fallback crítico para evitar desativação acidental
UPDATE image_types
SET description = description || E'\n[27/06/2026] FALLBACK DO CLASSIFICADOR: fn_auto_classify_product_image retorna este tipo quando nenhum padrão de filename ou CF ID casa. NUNCA desativar.'
WHERE code = 'other';
;
