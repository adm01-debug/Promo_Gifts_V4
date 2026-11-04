-- Cadastrar materiais_aplicaveis inferidos do nome de cada tabela
-- Critério: substring no nome → materiais correspondentes

-- Metal
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{materiais_aplicaveis}',
  '["metal", "aluminio"]'::jsonb, true)
WHERE codigo_tabela IN ('FIBER-MCN-01','FIBER-PL-01','TAMPO-MT-01','UVDIG-PL-01');

-- Metal estrito (caneta metal, cilíndrico metal)
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{materiais_aplicaveis}',
  '["metal"]'::jsonb, true)
WHERE codigo_tabela IN (
  'SERIUV-CIL-01','SERIUV-CIL-02','SERIUV-MCN-01',
  'TAMPO-MCN-01','UVDIG-CIL-01','UVDIG-CIL-02','UVDIG-MCN-01'
);

-- Plástico estrito (caneta plástica, cilíndrico plástico)
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{materiais_aplicaveis}',
  '["plastico"]'::jsonb, true)
WHERE codigo_tabela IN (
  'SERIUV-CIL-03','SERIUV-CIL-04','SERIUV-CN-01',
  'TAMPO-CN-01','TAMPO-PL-01',
  'UVDIG-CIL-03','UVDIG-CIL-04','UVDIG-CN-01'
);

-- Plástico amplo (plano, aceita acrílico)
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{materiais_aplicaveis}',
  '["plastico", "acrilico"]'::jsonb, true)
WHERE codigo_tabela = 'UVDIG-PL-02';

-- Bambu/Madeira/Cortiça (CO2 e canetas naturais)
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{materiais_aplicaveis}',
  '["bambu", "madeira", "cortica"]'::jsonb, true)
WHERE codigo_tabela IN ('CO2-CN-01','SERIUV-CN-02','TAMPO-CN-02','UVDIG-CN-02');

-- Fiber CIL (rotativo - aceita ampla gama)
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{materiais_aplicaveis}',
  '["metal", "aluminio", "acrilico"]'::jsonb, true)
WHERE codigo_tabela = 'FIBER-CIL-01';

-- Append historico_fixes em todas
UPDATE tabela_preco_gravacao_oficial
SET opcoes_modificadores = jsonb_set(
  opcoes_modificadores, '{historico_fixes}',
  COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
  jsonb_build_array(jsonb_build_object(
    'data', '2026-04-25',
    'fix_id', 'FIX-06',
    'descricao', 'Cadastrado materiais_aplicaveis (inferido pelo nome da tabela). Necessario para fn_recomendar_tecnica fazer matching.',
    'descoberto_em', 'Re-analise pos-correcoes 2026-04-25'
  ))
)
WHERE codigo_tabela IN (
  'FIBER-CIL-01','FIBER-MCN-01','FIBER-PL-01','CO2-CN-01',
  'SERIUV-CIL-01','SERIUV-CIL-02','SERIUV-CIL-03','SERIUV-CIL-04',
  'SERIUV-CN-01','SERIUV-CN-02','SERIUV-MCN-01',
  'TAMPO-CN-01','TAMPO-CN-02','TAMPO-MCN-01','TAMPO-MT-01','TAMPO-PL-01',
  'UVDIG-CIL-01','UVDIG-CIL-02','UVDIG-CIL-03','UVDIG-CIL-04',
  'UVDIG-CN-01','UVDIG-CN-02','UVDIG-MCN-01','UVDIG-PL-01','UVDIG-PL-02'
);
