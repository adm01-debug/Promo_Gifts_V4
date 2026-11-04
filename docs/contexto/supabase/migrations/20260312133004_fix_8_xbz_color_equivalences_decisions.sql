-- PASSO A: Atualizar 8 equivalências XBZ conforme decisões do Joaquim
-- + Marcar todas as 12 como verified

-- 1. ROSA → Rosa Bubbaloo (era Rosa Bebê)
UPDATE color_equivalences SET promo_variation_id = 'caa740e7-a292-4aff-b54f-36437eaba652', verified = true, notes = 'Aprovado Joaquim 12/03/2026: hex #E91E63 = Rosa Bubbaloo' WHERE id = 'a4826184-76da-4ee6-b327-71dbaa9f01ca';

-- 2. ROXO → Roxo Púrpura (era Roxo Lilás)
UPDATE color_equivalences SET promo_variation_id = '56dd484f-b17f-47d2-a8ae-f6612069227d', verified = true, notes = 'Aprovado Joaquim 12/03/2026: hex #9C27B0 → Roxo Púrpura' WHERE id = '92acab04-9f43-4709-aa3c-2189a3719023';

-- 3. VERMELHO → Vermelho Ferrari (era Vermelho Bordô)
UPDATE color_equivalences SET promo_variation_id = '7e4cc99c-e5d5-4dd6-a616-201dbb95f84f', verified = true, notes = 'Aprovado Joaquim 12/03/2026: hex #F44336 → Vermelho Ferrari' WHERE id = 'a531eac0-6708-486c-9927-9cf920321734';

-- 4. AZUL → Azul Royal (era Azul genérica)
UPDATE color_equivalences SET promo_variation_id = 'dd0e1acb-850a-4c0b-87a8-963595ee6508', verified = true, notes = 'Aprovado Joaquim 12/03/2026: hex #2196F3 → Azul Royal' WHERE id = 'd7eb4c91-181e-4a33-98c9-73bfe43478dc';

-- 5. AZUL CLARO → Azul Céu (era Azul genérica)
UPDATE color_equivalences SET promo_variation_id = 'ba14660b-1055-41da-9105-f8ac1e2b30ff', verified = true, notes = 'Aprovado Joaquim 12/03/2026: hex #03A9F4 → Azul Céu' WHERE id = 'de132298-7158-46df-930f-58b9dfed1b17';

-- 6. VERDE → Verde Bandeira (era Verde Neon)
UPDATE color_equivalences SET promo_variation_id = 'd69d8c49-6982-4b37-964e-928bd3eb22bb', verified = true, notes = 'Aprovado Joaquim 12/03/2026: hex #4CAF50 → Verde Bandeira' WHERE id = 'a9188c97-fc17-40a1-a801-5401daef49c5';

-- 7. CINZA → Cinza Claro (era Cinza genérica)
UPDATE color_equivalences SET promo_variation_id = '26255075-2383-45e3-b979-316c5e22d2f3', verified = true, notes = 'Aprovado Joaquim 12/03/2026: hex #9E9E9E → Cinza Claro' WHERE id = '0ec7daf9-e92c-43de-b3eb-1d960af21398';

-- 8. MARROM → Marrom Chocolate (era Marrom Café)
UPDATE color_equivalences SET promo_variation_id = '096c51ff-8dbd-402d-88c1-5ca83e856354', verified = true, notes = 'Aprovado Joaquim 12/03/2026: hex #795548 → Marrom Chocolate' WHERE id = 'bb157cd9-413e-450a-96b4-e1f5c1ce617f';
