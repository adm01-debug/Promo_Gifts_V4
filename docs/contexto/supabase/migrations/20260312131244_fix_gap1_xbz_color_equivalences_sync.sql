-- GAP 1: Sincronizar xbz_color_equivalences com o trabalho feito hoje

-- MADEIRA → Madeira (Natural)
UPDATE xbz_color_equivalences SET 
  color_variation_id = 'fb0f72cb-e35d-45bb-9766-19fac825253b',
  variation_pending_review = false,
  reviewed_at = NOW(),
  updated_at = NOW()
WHERE id = '354ff08a-316b-405d-813d-da3345fe4a85';

-- CHUMBO → Cinza Chumbo (Cinza)
UPDATE xbz_color_equivalences SET 
  color_variation_id = '885cd2ff-9854-4382-beec-fc5a9e904c34',
  variation_pending_review = false,
  reviewed_at = NOW(),
  updated_at = NOW()
WHERE id = 'b10b6ce6-4f09-4f51-adf3-8288a98612f0';

-- KRAFT → Kraft (Natural)
UPDATE xbz_color_equivalences SET 
  color_variation_id = '27eeaf94-4493-4f0e-9878-50100df4ef56',
  variation_pending_review = false,
  reviewed_at = NOW(),
  updated_at = NOW()
WHERE id = 'cae97928-79da-4de1-8875-cebcc8536d91';

-- BAMBU → Bambu (Natural)
UPDATE xbz_color_equivalences SET 
  color_variation_id = '73c0af09-efb9-4fea-9cdb-cbaff0ee2626',
  variation_pending_review = false,
  reviewed_at = NOW(),
  updated_at = NOW()
WHERE id = '4e94c6c7-3be1-422a-a82b-0270ca3129f3';

-- BRONZE → Bronze (Cobre) — CORRIGE TAMBÉM color_group_id de Dourado para Cobre
UPDATE xbz_color_equivalences SET 
  color_variation_id = 'ae59a886-d2b7-459c-a054-6c01c44a9f13',
  color_group_id = '12e929ba-87ab-4e02-8598-059558fb1dc8',  -- Cobre (era Dourado)
  variation_pending_review = false,
  reviewed_at = NOW(),
  updated_at = NOW()
WHERE id = '75d58397-702b-458a-bab8-1f36d031c227';

-- INOX → Prata Inox (Prata)
UPDATE xbz_color_equivalences SET 
  color_variation_id = 'b0342859-437c-439b-a4bf-d323a2b6681e',
  variation_pending_review = false,
  reviewed_at = NOW(),
  updated_at = NOW()
WHERE id = 'e8200db4-8599-449c-967f-d0157ee6a885';
