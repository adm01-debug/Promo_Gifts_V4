-- MELHORIA 1 (satélites/drift) — correção de qualidade no Ouro.
-- Contexto: 7 produtos ativos tinham height/width/length = 0.00 (lixo = "desconhecido"),
-- exibidos como "0 cm" via v_products_public. product_physical (satélite) já mantinha NULL
-- corretamente (fn_sync aplica NULLIF(x,0)). Normalizamos 0 -> NULL no Ouro para:
--   (a) corrigir display "0 cm" ao cliente; (b) zerar a divergência products<->product_physical
--       no lado "products tem valor". O trigger trg_sync_product_physical propaga e mantém coerência.
-- Idempotente: re-execução afeta 0 linhas. NULLIF preserva quaisquer valores não-zero.
UPDATE public.products
SET height_cm   = NULLIF(height_cm, 0),
    width_cm    = NULLIF(width_cm, 0),
    length_cm   = NULLIF(length_cm, 0),
    weight_g    = NULLIF(weight_g, 0),
    diameter_cm = NULLIF(diameter_cm, 0)
WHERE is_active
  AND (height_cm = 0 OR width_cm = 0 OR length_cm = 0 OR weight_g = 0 OR diameter_cm = 0);;
