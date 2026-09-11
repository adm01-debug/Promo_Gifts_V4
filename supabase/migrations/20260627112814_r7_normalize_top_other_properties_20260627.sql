-- ═══════════════════════════════════════════════════════════════════
-- R7 · Normalizar top OTHER_* property codes
-- fix_version: property_normalize_20260627
-- ═══════════════════════════════════════════════════════════════════

-- 1. Criar definições formais para as 3 properties legítimas
INSERT INTO property_definitions (
  code, name_pt, name_en, category, is_thermal_indicator, is_premium_indicator, active
)
VALUES
  ('PAGE_MARKER',      'Marcador de Página', 'Page Marker/Bookmark',
   'NOTEBOOK',  false, false, true),
  ('MATTE_FINISH',     'Acabamento Fosco',   'Matte Finish',
   'FEATURE',   false, false, true),
  ('VACUUM_INSULATED', 'Isolado a Vácuo',    'Vacuum Insulated',
   'THERMAL',   true,  false, true)
ON CONFLICT (code) DO UPDATE SET
  name_pt              = EXCLUDED.name_pt,
  name_en              = EXCLUDED.name_en,
  is_thermal_indicator = EXCLUDED.is_thermal_indicator,
  active               = true;

-- 2. Adicionar supplier_property_mappings para prevenir futuros OTHER_*
INSERT INTO supplier_property_mappings (supplier_code, raw_pattern, property_code, priority, notes)
VALUES
  ('spot',     '%marcador de p_gina%', 'PAGE_MARKER',      85, 'fix_version:property_normalize_20260627'),
  ('somarcas', '%marcador de p_gina%', 'PAGE_MARKER',      85, 'fix_version:property_normalize_20260627'),
  ('xbz',      '%marcador%p_gina%',    'PAGE_MARKER',      80, 'fix_version:property_normalize_20260627'),
  ('asia',     '%marcador%p%gina%',    'PAGE_MARKER',      80, 'fix_version:property_normalize_20260627'),
  ('spot',     '%acabamento fosco%',   'MATTE_FINISH',     80, 'fix_version:property_normalize_20260627'),
  ('somarcas', '%acabamento fosco%',   'MATTE_FINISH',     80, 'fix_version:property_normalize_20260627'),
  ('xbz',      '%acabamento fosco%',   'MATTE_FINISH',     80, 'fix_version:property_normalize_20260627'),
  ('asia',     '%fosco%',              'MATTE_FINISH',     75, 'fix_version:property_normalize_20260627'),
  ('spot',     '%isolad_ a v_cuo%',    'VACUUM_INSULATED', 90, 'fix_version:property_normalize_20260627'),
  ('somarcas', '%isolad_ a v_cuo%',    'VACUUM_INSULATED', 90, 'fix_version:property_normalize_20260627'),
  ('xbz',      '%v_cuo%',              'VACUUM_INSULATED', 85, 'fix_version:property_normalize_20260627'),
  ('asia',     '%v_cuo%',              'VACUUM_INSULATED', 85, 'fix_version:property_normalize_20260627')
ON CONFLICT (supplier_code, raw_pattern) DO UPDATE SET
  property_code = EXCLUDED.property_code,
  priority      = EXCLUDED.priority;

-- 3. Migrar product_properties: OTHER_* legítimos → códigos formais
UPDATE product_properties
SET
  property_code          = CASE property_code
    WHEN 'OTHER_MARCADOR_DE_P_GINA' THEN 'PAGE_MARKER'
    WHEN 'OTHER_ACABAMENTO_FOSCO'   THEN 'MATTE_FINISH'
    WHEN 'OTHER_ISOLADA_A_V_CUO_'   THEN 'VACUUM_INSULATED'
  END,
  property_definition_id = (
    SELECT pd.id FROM property_definitions pd
    WHERE pd.code = CASE property_code
      WHEN 'OTHER_MARCADOR_DE_P_GINA' THEN 'PAGE_MARKER'
      WHEN 'OTHER_ACABAMENTO_FOSCO'   THEN 'MATTE_FINISH'
      WHEN 'OTHER_ISOLADA_A_V_CUO_'   THEN 'VACUUM_INSULATED'
    END
    LIMIT 1
  ),
  updated_at = now()
WHERE property_code IN (
  'OTHER_MARCADOR_DE_P_GINA',
  'OTHER_ACABAMENTO_FOSCO',
  'OTHER_ISOLADA_A_V_CUO_'
);

-- 4. Deletar registros-lixo (product names e description fragments)
DELETE FROM product_properties
WHERE property_code IN (
  'OTHER_CANETA_PL_STICA','OTHER_CANETA_MET_LICA','OTHER_GARRAFA_T_RMICA',
  'OTHER_CHAVEIRO','OTHER_PORTA_JOIAS','OTHER_KIT_ESCRIT_RIO',
  'OTHER_CARRO_MINIATURA','OTHER_BRINQUEDO_APERT_VEL_ANTIESTRES',
  'OTHER_PARA_DAR_MAIOR_DURABILIDADE_E_','OTHER_PORTA_CANETA_E_EL_STICO_PARA_F',
  'OTHER_NA_FACA_7__FAZEMOS_UMA_GRAVA__','OTHER_NA_FACA_8__FAZEMOS_UMA_GRAVA__',
  'OTHER_UM_DOS_MAIS_RESISTENTES___FERR','OTHER_GARFO_E_ESP_TULA_EM_MADEIRA_IN',
  'OTHER_CADERNO_PARA_ANOTA__ES_COM_CAP','OTHER_MOCHILA_PARA_NOTEBOOK_EM_POLI_',
  'OTHER_MOCHILA_PREMIUM_PARA_NOTEBOOK_','OTHER_KIT_PARA_CHURRASCO__COMPOSTO_P',
  'OTHER_UMA_ESP_TULA_E_UM_GARFO_PARA_Q','OTHER_CONJUNTO_PARA_CHURRASCO__COMPO',
  'OTHER_SENDO','OTHER_UMA_COM_PONTA_E_OUTRA_RETA',
  'OTHER_CONJUNTO_COMPOSTO_POR_UMA_T_BU','OTHER_CADERNETA_PARA_ANOTA__ES_COM_C',
  'OTHER_COMPOSTO_POR_GARRAFA_EM_ALUM_N','OTHER_CARGA_ESFEROGR_FICA_AZUL_E_PON',
  'OTHER_CANETA_ESFEROGR_FICA_EM_ALUM_N','OTHER_PACOTE_C__50_P_S_CANETA_PL_STI',
  'OTHER_SUPORTE_PARA_CANETA_E_EL_STICO','OTHER_IDEAL_PARA_TRANSPORTE_',
  'OTHER_6_','OTHER_350ML'
);;
