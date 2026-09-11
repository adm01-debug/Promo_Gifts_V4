
-- ============================================================
-- ASIA IMPORT — supplier_property_mappings
-- Fonte: campo 'descricao' + 'nome' do raw_data Bronze ASIA
-- Cobertura-alvo: 65%+ dos 918 produtos Gold ativos
-- ============================================================

INSERT INTO supplier_property_mappings
  (supplier_code, raw_pattern, property_code, priority, notes)
VALUES

-- ── TÉRMICA ─────────────────────────────────────────────────
('asia', '%parede dupla%',                   'DOUBLE_WALL',              95, 'ASIA: parede dupla isolamento'),
('asia', '%a vacuo%',                        'DOUBLE_WALL',              93, 'ASIA: vácuo = parede dupla'),
('asia', '%a vácuo%',                        'DOUBLE_WALL',              93, 'ASIA: vácuo (acentuado)'),
('asia', '%isolamento vácuo%',               'DOUBLE_WALL',              92, 'ASIA: isolamento a vácuo'),
('asia', '%bebidas frias%',                  'THERMAL_COLD',             88, 'ASIA: mantém bebidas frias'),
('asia', '%bebidas quentes%',                'THERMAL_HOT',              88, 'ASIA: mantém bebidas quentes'),
('asia', '%frias e quentes%',                'THERMAL_COLD_HOT_HOURS',   92, 'ASIA: dupla função'),
('asia', '%quentes e frias%',                'THERMAL_COLD_HOT_HOURS',   92, 'ASIA: dupla função 2'),
('asia', '%horas de temperatura%',           'THERMAL_COLD_HOT_HOURS',   85, 'ASIA: X horas temperatura'),
('asia', '%proteção térmica%',               'THERMAL_PROTECTION',       85, 'ASIA: proteção térmica'),
('asia', '%bolsa térmica%',                  'THERMAL_PROTECTION',       82, 'ASIA: bolsa térmica'),
('asia', '%lancheira térmica%',              'THERMAL_PROTECTION',       82, 'ASIA: lancheira'),

-- ── MATERIAIS ────────────────────────────────────────────────
('asia', '%aço inox%',                       'STAINLESS_STEEL',          90, 'ASIA: aço inoxidável'),
('asia', '%inox%',                           'STAINLESS_STEEL',          88, 'ASIA: inox geral'),
('asia', '%bambu%',                          'BAMBOO',                   90, 'ASIA: bambu'),
('asia', '%bamboo%',                         'BAMBOO',                   90, 'ASIA: bamboo EN'),
('asia', '%cortiça%',                        'CORK',                     90, 'ASIA: cortiça'),
('asia', '%cork%',                           'CORK',                     90, 'ASIA: cork EN'),
('asia', '%algodão%',                        'RECYCLED_COTTON',          75, 'ASIA: algodão'),
('asia', '%algodao%',                        'RECYCLED_COTTON',          75, 'ASIA: algodão sem acento'),
('asia', '%plástico reciclado%',             'RPET',                     85, 'ASIA: plástico reciclado'),
('asia', '%material reciclado%',             'RPET',                     80, 'ASIA: material reciclado'),
('asia', '%rpet%',                           'RPET',                     90, 'ASIA: rPET direto'),
('asia', '%papel kraft%',                    'KRAFT_PAPER',              88, 'ASIA: papel kraft'),
('asia', '%kraft%',                          'KRAFT_PAPER',              82, 'ASIA: kraft geral'),

-- ── CERTIFICAÇÕES ────────────────────────────────────────────
('asia', '%bpa free%',                       'BPA_FREE',                 92, 'ASIA: BPA free EN'),
('asia', '%livre de bpa%',                   'BPA_FREE',                 92, 'ASIA: livre de BPA PT'),
('asia', '%sem bpa%',                        'BPA_FREE',                 90, 'ASIA: sem BPA'),
('asia', '%livre bpa%',                      'BPA_FREE',                 88, 'ASIA: livre BPA'),
('asia', '%aprovado para alimentos%',        'FOOD_SAFE',                85, 'ASIA: aprovado alimentos'),
('asia', '%contato alimentar%',              'FOOD_SAFE',                85, 'ASIA: contato alimentar'),
('asia', '%pode ir ao microondas%',          'MICROWAVE_SAFE',           88, 'ASIA: microondas'),
('asia', '%microondas%',                     'MICROWAVE_SAFE',           82, 'ASIA: microondas geral'),
('asia', '%máquina de lavar%',               'DISHWASHER_SAFE',          85, 'ASIA: lavadora'),
('asia', '%lava-louças%',                    'DISHWASHER_SAFE',          85, 'ASIA: lava-louças'),
('asia', '%impermeável%',                    'WATERPROOF',               85, 'ASIA: impermeável'),
('asia', '%resistente à água%',              'WATERPROOF',               82, 'ASIA: resistente água'),
('asia', '%a prova d%agua%',                 'WATERPROOF',               82, 'ASIA: à prova dagua'),

-- ── FEATURES ─────────────────────────────────────────────────
('asia', '%carregamento sem fio%',           'WIRELESS_CHARGER',         90, 'ASIA: wireless charger'),
('asia', '%carregamento por indução%',       'WIRELESS_CHARGER',         90, 'ASIA: indução'),
('asia', '%carregamento indutivo%',          'WIRELESS_CHARGER',         88, 'ASIA: indutivo'),
('asia', '%bluetooth%',                      'BLUETOOTH',                92, 'ASIA: bluetooth'),
('asia', '%led%',                            'LED',                      80, 'ASIA: LED'),
('asia', '%iluminação led%',                 'LED',                      85, 'ASIA: iluminação LED'),
('asia', '%touch%',                          'TOUCH_TIP',                80, 'ASIA: touch screen'),
('asia', '%stylus%',                         'TOUCH_TIP',                85, 'ASIA: stylus'),
('asia', '%ímã%',                            'MAGNET',                   82, 'ASIA: ímã'),
('asia', '%imã%',                            'MAGNET',                   80, 'ASIA: ímã alt'),
('asia', '%magnético%',                      'MAGNET',                   80, 'ASIA: magnético'),

-- ── EMBALAGEM ────────────────────────────────────────────────
('asia', '%caixa de oferta%',                'GIFT_BOX',                 90, 'ASIA: caixa presente'),
('asia', '%caixa presente%',                 'GIFT_BOX',                 90, 'ASIA: caixa presente 2'),
('asia', '%acompanha caixa%',                'GIFT_BOX',                 85, 'ASIA: acompanha caixa'),
('asia', '%inclui caixa%',                   'GIFT_BOX',                 85, 'ASIA: inclui caixa'),
('asia', '%em bolsa%',                       'IN_BAG',                   85, 'ASIA: em bolsa'),
('asia', '%bolsa de pano%',                  'IN_BAG',                   85, 'ASIA: bolsa pano'),

-- ── SUSTENTABILIDADE ─────────────────────────────────────────
('asia', '%sustentável%',                    'ECO_FRIENDLY',             85, 'ASIA: sustentável'),
('asia', '%ecológico%',                      'ECO_FRIENDLY',             85, 'ASIA: ecológico'),
('asia', '%ecologico%',                      'ECO_FRIENDLY',             83, 'ASIA: ecologico sem acento'),
('asia', '%eco%',                            'ECO_FRIENDLY',             75, 'ASIA: eco geral'),
('asia', '%fabricado no brasil%',            'MADE_IN_BRAZIL',           90, 'ASIA: made in brazil'),
('asia', '%produção nacional%',              'MADE_IN_BRAZIL',           88, 'ASIA: produção nacional'),

-- ── ESCRITA ──────────────────────────────────────────────────
('asia', '%tinta azul%',                     'BLUE_INK',                 88, 'ASIA: tinta azul'),
('asia', '%escrita azul%',                   'BLUE_INK',                 85, 'ASIA: escrita azul'),
('asia', '%tinta preta%',                    'BLACK_INK',                88, 'ASIA: tinta preta'),
('asia', '%escrita preta%',                  'BLACK_INK',                85, 'ASIA: escrita preta'),
('asia', '%mecanismo twist%',                'TWIST_MECHANISM',          88, 'ASIA: mecanismo twist'),
('asia', '%clique%',                         'TWIST_MECHANISM',          75, 'ASIA: clique = pressão')

ON CONFLICT DO NOTHING;

-- Confirmação
SELECT COUNT(*) as mapeamentos_asia 
FROM supplier_property_mappings 
WHERE supplier_code = 'asia';
;
