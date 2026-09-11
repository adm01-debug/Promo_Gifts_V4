-- ============================================================================
-- MELHORIA 1 — OG canônico: exatamente 1 og_image por produto ATIVO (= a primária)
-- Idempotente e reversível (apenas flags booleanas).
-- Corrige: 1.660 produtos sem OG, 1 produto com 2 OG, 161 OG em não-primária, 140 OG em inativa.
-- Triggers de sync mantêm products.og_image_url (volume ~2,1k — sem risco de amplificação).
-- ============================================================================

-- 1) Remove o flag OG de qualquer linha que NÃO seja a primária ativa
UPDATE public.product_images
   SET is_og_image = false
 WHERE is_og_image IS TRUE
   AND (is_primary IS NOT TRUE OR is_active IS NOT TRUE);

-- 2) Garante o flag OG na primária ativa de todo produto que estava sem
UPDATE public.product_images
   SET is_og_image = true
 WHERE is_active IS TRUE
   AND is_primary IS TRUE
   AND is_og_image IS NOT TRUE;;
