-- PASSO 3: Criar 5 color_equivalences (supplier_color XBZ → color_variation Promo)
-- INOX → Prata Inox JÁ EXISTE, não precisa criar
INSERT INTO color_equivalences (organization_id, supplier_color_id, promo_variation_id, match_quality, confidence_score, verified, source, notes)
VALUES
  -- MADEIRA → Madeira (Natural)
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea',
   '41f923b8-ab92-4280-9e90-d78c83fd13e8',  -- supplier_color MADEIRA (MAD)
   'fb0f72cb-e35d-45bb-9766-19fac825253b',  -- color_variation Madeira (Natural 18.1)
   'exact', 100, true, 'manual', 'XBZ MADEIRA → Promo Madeira (Natural)'),

  -- CHUMBO → Cinza Chumbo (Cinza)
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea',
   '274b4b2b-8f3a-43ef-8fdc-63bc7bc343e7',  -- supplier_color CHUMBO (CHU)
   '885cd2ff-9854-4382-beec-fc5a9e904c34',  -- color_variation Cinza Chumbo (Cinza)
   'exact', 100, true, 'manual', 'XBZ CHUMBO → Promo Cinza Chumbo'),

  -- KRAFT → Kraft (Natural)
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea',
   '9b3f89e7-e018-4f69-8b91-c6b3118c9df3',  -- supplier_color KRAFT (KRA)
   '27eeaf94-4493-4f0e-9878-50100df4ef56',  -- color_variation Kraft (Natural 18.2)
   'exact', 100, true, 'manual', 'XBZ KRAFT → Promo Kraft (Natural)'),

  -- BAMBU → Bambu (Natural)
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea',
   '99dcaede-2a1c-4bb4-b728-bdf9dd6b501b',  -- supplier_color BAMBU (BAM)
   '73c0af09-efb9-4fea-9cdb-cbaff0ee2626',  -- color_variation Bambu (Natural 18.3)
   'exact', 100, true, 'manual', 'XBZ BAMBU → Promo Bambu (Natural)'),

  -- BRONZE → Bronze (Cobre)
  ('5db5aee1-064b-4ef4-9193-345dcd8274ea',
   'c9037279-d87a-4a4d-8258-ba3e491d0199',  -- supplier_color BRONZE (BRZ)
   'ae59a886-d2b7-459c-a054-6c01c44a9f13',  -- color_variation Bronze (Cobre 17.2)
   'exact', 100, true, 'manual', 'XBZ BRONZE → Promo Bronze (Cobre)');
