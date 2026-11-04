-- A) Corrigir AZUL CLARO → Azul Piscina
UPDATE color_equivalences SET 
  promo_variation_id = '4152c812-a293-48c8-8bd0-d059d26fd123',
  verified = true, notes = 'Corrigido 12/03/2026: Joaquim confirmou visualmente = Azul Piscina'
WHERE id = 'de132298-7158-46df-930f-58b9dfed1b17';

-- A) Corrigir INOX → Prata Acetinado
UPDATE color_equivalences SET 
  promo_variation_id = '65f4ed80-89ae-4ec6-9e3a-8513f3d89dd6',
  verified = true, notes = 'Corrigido 12/03/2026: hex site #787878 = Prata Acetinado'
WHERE id = '1f6516c4-0681-4de6-9175-ad24b3572f26';

-- B) Criar equivalência PINK → Rosa Pink
INSERT INTO color_equivalences (organization_id, supplier_color_id, promo_variation_id, confidence_score, source, verified, is_active, notes)
VALUES ('5db5aee1-064b-4ef4-9193-345dcd8274ea', 'cc87efd2-cdf4-4424-9408-d405cc4db868', 'fb9b536a-bc9c-4089-89d8-d7e3d48a1eb3', 100, 'manual', true, true, 'Criado 12/03/2026: cor site XBZ #DC0256');

-- B) Criar equivalência VERDE ESCURO → Verde Floresta
INSERT INTO color_equivalences (organization_id, supplier_color_id, promo_variation_id, confidence_score, source, verified, is_active, notes)
VALUES ('5db5aee1-064b-4ef4-9193-345dcd8274ea', '81a3b714-df50-4000-b6a1-197b19d81a1d', 'a366339c-b41d-4c3d-80cb-d8baabdf8f32', 100, 'manual', true, true, 'Criado 12/03/2026: cor site XBZ #016934');

-- B) Criar equivalência FUMÊ → Fumê
INSERT INTO color_equivalences (organization_id, supplier_color_id, promo_variation_id, confidence_score, source, verified, is_active, notes)
VALUES ('5db5aee1-064b-4ef4-9193-345dcd8274ea', '80ea72d1-3bb9-421c-9913-96fad9fef0ec', '35995f65-4e96-42f6-9a05-1e725d3a88f3', 100, 'manual', true, true, 'Criado 12/03/2026: cor site XBZ #877B7B, variação nova');

-- C) Hex reais do site XBZ
UPDATE supplier_colors SET hex_code='#FFFF00' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='AMA';
UPDATE supplier_colors SET hex_code='#0066CB' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='AZU';
UPDATE supplier_colors SET hex_code='#0099FF' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='AZC';
UPDATE supplier_colors SET hex_code='#999967' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='BEG';
UPDATE supplier_colors SET hex_code='#F5B077' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='BRZ';
UPDATE supplier_colors SET hex_code='#A95D3B' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='CAR';
UPDATE supplier_colors SET hex_code='#464243' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='CHU';
UPDATE supplier_colors SET hex_code='#7E7F81' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='CIN';
UPDATE supplier_colors SET hex_code='#F5F3DA' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='CRE';
UPDATE supplier_colors SET hex_code='#E5C252' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='DOU';
UPDATE supplier_colors SET hex_code='#787878' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='INO';
UPDATE supplier_colors SET hex_code='#FD7F04' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='LAR';
UPDATE supplier_colors SET hex_code='#552B17' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='MAD';
UPDATE supplier_colors SET hex_code='#4C3525' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='MAR';
UPDATE supplier_colors SET hex_code='#FF33FF' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='ROS';
UPDATE supplier_colors SET hex_code='#01CC34' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='VD';
UPDATE supplier_colors SET hex_code='#FE0000' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='VM';
UPDATE supplier_colors SET hex_code='#EAEAEA' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='TRA';
UPDATE supplier_colors SET hex_code='#C3C3C7' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='PRA';
UPDATE supplier_colors SET hex_code='#DEA872' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='BAM';
UPDATE supplier_colors SET hex_code='#B0582F' WHERE supplier_id='d6718a29-e954-4c1b-bd84-03ea24884900' AND code='COB';

-- D) Verificar equivalências restantes não-verified
UPDATE color_equivalences SET verified = true
WHERE id IN (
  SELECT ce.id FROM color_equivalences ce
  JOIN supplier_colors sc ON ce.supplier_color_id = sc.id
  WHERE sc.supplier_id = 'd6718a29-e954-4c1b-bd84-03ea24884900' AND ce.is_active = true AND ce.verified = false
);
