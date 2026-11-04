-- Resolver órfã: SUBL-CAM-A3 e A4 ativadas mas sem produtos cadastrados em PAT
-- Estratégia: clonar registros DTF-TEX-CAM (full color, todos os lados) com escopo dimensional adequado

WITH dtf_pat AS (
  SELECT pat.product_id, pat.location_code, pat.max_width, pat.max_height
  FROM print_area_techniques pat
  JOIN tabela_preco_gravacao_oficial t ON t.id = pat.tabela_preco_id
  WHERE pat.is_active = true 
    AND t.codigo_tabela = 'DTF-TEX-CAM-01'
),
subl_a3_id AS (SELECT id FROM tabela_preco_gravacao_oficial WHERE codigo_tabela = 'SUBL-CAM-A3-01'),
subl_a4_id AS (SELECT id FROM tabela_preco_gravacao_oficial WHERE codigo_tabela = 'SUBL-CAM-A4-01')

-- SUBL-CAM-A3 só cabe em locations com area >= 19x29 cm (na prática FRENTE e COSTAS)
INSERT INTO print_area_techniques (product_id, location_code, tabela_preco_id, max_width, max_height, is_active)
SELECT product_id, location_code, (SELECT id FROM subl_a3_id), max_width, max_height, true
FROM dtf_pat
WHERE max_width >= 19 AND max_height >= 29
ON CONFLICT (product_id, location_code, tabela_preco_id) DO NOTHING;

INSERT INTO print_area_techniques (product_id, location_code, tabela_preco_id, max_width, max_height, is_active)
SELECT product_id, location_code, (SELECT id FROM tabela_preco_gravacao_oficial WHERE codigo_tabela='SUBL-CAM-A4-01'), 
       LEAST(max_width, 18), LEAST(max_height, 28), true
FROM print_area_techniques pat2
JOIN tabela_preco_gravacao_oficial t2 ON t2.id = pat2.tabela_preco_id
WHERE pat2.is_active = true AND t2.codigo_tabela = 'DTF-TEX-CAM-01'
ON CONFLICT (product_id, location_code, tabela_preco_id) DO NOTHING;
