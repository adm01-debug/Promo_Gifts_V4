-- ============================================================
-- ETAPA 1+2: Backup completo + Matriz oficial mochila
-- Pré-requisito da faxina total Fase 5 (P1+P2+P3+P4+P5)
-- ============================================================

-- 1) BACKUP COMPLETO: 4 técnicas mochila + todos os 1.533 PATs
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'backup_pre_faxina_mochila_25_04_2026',
  jsonb_build_object(
    'data_backup', NOW()::text,
    'motivo', 'Snapshot ANTES da faxina total Fase 5 — corrigir P1+P2+P3+P4+P5',
    'tecnicas_mochila', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'header', to_jsonb(t.*),
          'faixas', (
            SELECT jsonb_agg(to_jsonb(f.*) ORDER BY f.ordem)
            FROM tabela_preco_gravacao_oficial_faixa f
            WHERE f.tabela_preco_gravacao_id = t.id
          )
        )
      )
      FROM tabela_preco_gravacao_oficial t
      WHERE t.codigo_tabela IN ('BORD-MOC-01','DTF-TEX-MOC-01','PLAQ-MOC-01','SERITEX-MOC-1C-01')
    ),
    'pats_mochila_count', (
      SELECT COUNT(*) FROM print_area_techniques pat
      JOIN tabela_preco_gravacao_oficial t ON pat.tabela_preco_id = t.id
      WHERE t.codigo_tabela IN ('BORD-MOC-01','DTF-TEX-MOC-01','PLAQ-MOC-01','SERITEX-MOC-1C-01')
    ),
    'pats_mochila', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'pat_id', pat.id,
          'product_id', pat.product_id,
          'tabela_preco_id', pat.tabela_preco_id,
          'codigo_tabela', t.codigo_tabela,
          'location_code', pat.location_code,
          'location_name', pat.location_name,
          'max_width', pat.max_width,
          'max_height', pat.max_height,
          'is_active', pat.is_active
        )
      )
      FROM print_area_techniques pat
      JOIN tabela_preco_gravacao_oficial t ON pat.tabela_preco_id = t.id
      WHERE t.codigo_tabela IN ('BORD-MOC-01','DTF-TEX-MOC-01','PLAQ-MOC-01','SERITEX-MOC-1C-01')
    )
  ),
  'Backup completo das 4 técnicas mochila + 1.533 PATs antes da faxina P1+P2+P3+P4+P5. Rollback: reinserir tudo a partir deste JSONB.'
)
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value, updated_at = NOW();

-- 2) MATRIZ OFICIAL — gravacao_combo_regras_mochila v1
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'gravacao_combo_regras_mochila',
  jsonb_build_object(
    'versao', 'v1',
    'data_criacao', '2026-04-25',
    'autor', 'Pink + Claude BPM',
    'fonte_de_verdade', 'briefing_pink_25_04_2026 + auditoria_fase5 + dicionario_grupos_materiais',
    'observacao_geral', 'Mochila estruturada costurada — combinação livre entre técnicas compatíveis no Lado FRENTE (Plaquinha em PLAQUINHA)',
    
    'tecnicas_oficiais', jsonb_build_array(
      'SERITEX-MOC-1C-01','DTF-TEX-MOC-01','BORD-MOC-01','PLAQ-MOC-01'
    ),
    
    'matriz_material_x_tecnica', jsonb_build_object(
      'TEXTIL_NATURAL', jsonb_build_object(
        'tecnicas', jsonb_build_array('SERITEX-MOC-1C-01','DTF-TEX-MOC-01','BORD-MOC-01','PLAQ-MOC-01'),
        'observacao', 'Algodão e fibras naturais aceitam todas as 4 técnicas mochila MVP'
      ),
      'TEXTIL_SINTETICO', jsonb_build_object(
        'tecnicas', jsonb_build_array('SERITEX-MOC-1C-01','DTF-TEX-MOC-01','BORD-MOC-01','PLAQ-MOC-01'),
        'observacao', 'Poliéster, nylon, oxford, ripstop, neoprene etc — todas as 4 técnicas'
      ),
      'TEXTIL_INDIGO', jsonb_build_object(
        'tecnicas', jsonb_build_array('SERITEX-MOC-1C-01','DTF-TEX-MOC-01','BORD-MOC-01','PLAQ-MOC-01'),
        'observacao', 'Jeans aceita todas as 4 técnicas'
      ),
      'TEXTIL_TNT', jsonb_build_object(
        'tecnicas', jsonb_build_array('SERITEX-MOC-1C-01','DTF-TEX-MOC-01','PLAQ-MOC-01'),
        'observacao', 'TNT é fino demais para bordado (decisão dicionário) — sem BORD-MOC-01'
      ),
      'COURO', jsonb_build_object(
        'slugs', jsonb_build_array('couro-legitimo', 'couro|sintetico|ecologico'),
        'tecnicas', jsonb_build_array('BORD-MOC-01','PLAQ-MOC-01'),
        'observacao', 'Couro reage mal a tinta plastisol (Silk) e cura térmica (DTF) — apenas Bordado e Plaquinha'
      ),
      'NAO_TEXTIL_RIGIDO', jsonb_build_object(
        'slugs_exemplo', jsonb_build_array('aluminio','aco-inox','metal|generico','cobre','abs-acrilonitrila-butadieno-estireno','pvc-rigido','pvc-flexivel','pvc-policloreto-de-vinila','pvc|flocado|veludo','plastico-pet','plastico-rpet','polipropileno-pp','polipropileno-homopolimero-pp-homo','eva-acetato-de-vinila','espuma','ceramica','cartao','cortica','bambu','mdf','borracha'),
        'tecnicas', jsonb_build_array(),
        'observacao', 'Mochilas com material principal não-têxtil ficam ÓRFÃS no MVP. Aguardam técnicas específicas (FIBER-CIL para metálico, TAMPO para plástico, HOT-STAMP para couro/cartão, laser CO2 para madeira). Vão para débito técnico.'
      ),
      'SEM_MATERIAL', jsonb_build_object(
        'tecnicas', jsonb_build_array(),
        'observacao', 'Produto sem material cadastrado em product_materials → órfão até cadastrar material principal'
      )
    ),
    
    'regras_combinacao', jsonb_build_object(
      'modelo_fatmin', 'independente',
      'desconto_combinacao', 'soma_pura',
      'limite_tecnicas_simultaneas', 'sem limite arquitetural',
      'lados_logicos', jsonb_build_array('FRENTE','PLAQUINHA'),
      'lado_FRENTE_aceita', jsonb_build_array('SERITEX-MOC-1C-01','DTF-TEX-MOC-01','BORD-MOC-01'),
      'lado_PLAQUINHA_aceita', jsonb_build_array('PLAQ-MOC-01')
    ),
    
    'metadados', jsonb_build_object(
      'sessao', 'Auditoria Fase 5 — 25/04/2026',
      'total_grupos', 7,
      'tecnicas_validadas_no_briefing', 4,
      'pendencias_pos_v1', 'Definir técnicas para grupo NAO_TEXTIL_RIGIDO (FIBER-CIL, TAMPO-MOCHILA, HOT-STAMP-MOCHILA)'
    )
  ),
  'Matriz oficial de compatibilidade material × técnica para Mochila MVP. Define quais técnicas cada grupo de material aceita. Referência permanente para validações arquiteturais e detecção de débito técnico.'
)
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
