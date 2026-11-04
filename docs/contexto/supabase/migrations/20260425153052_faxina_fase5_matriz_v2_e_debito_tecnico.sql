-- ============================================================
-- FAXINA FASE 5 (3 AÇÕES, ZERO DELETE)
-- 1) Matriz v1 → v2 com decisões reais do Pink (25/04/2026)
-- 2) Ajustes BORD-MOC-01 (max_cores 10→1, custo_aplicacao NULL→0)
-- 3) Débito técnico abrangente
-- ============================================================

-- ============================================================
-- AÇÃO 1: Atualizar matriz oficial v1 → v2
-- ============================================================
UPDATE system_settings SET 
  setting_value = jsonb_build_object(
    'versao', 'v2',
    'data_criacao', '2026-04-25',
    'data_atualizacao', NOW()::text,
    'autor', 'Pink + Claude BPM',
    'fonte_de_verdade', 'briefing_pink_25_04_2026 + auditoria_fase5 + dicionario_grupos_materiais + decisoes_pink_25_04_2026',
    'observacao_geral', 'Mochila estruturada costurada — combinação livre entre técnicas compatíveis no Lado FRENTE (Plaquinha em PLAQUINHA)',
    
    'changelog_v2', jsonb_build_array(
      'COURO: aceita as 4 técnicas (revisão da v1 — Pink decidiu não mexer)',
      'NAO_TEXTIL_RIGIDO: aceita PLAQ provisoriamente (revisão caso a caso pendente)',
      'SEM_MATERIAL: aceita PLAQ provisoriamente (alguns produtos não são mochila — débito técnico)'
    ),
    
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
        'tecnicas', jsonb_build_array('SERITEX-MOC-1C-01','DTF-TEX-MOC-01','BORD-MOC-01','PLAQ-MOC-01'),
        'observacao', 'v2: COURO mantém todas as 4 técnicas (decisão Pink 25/04 — preservar 78 PATs Silk+DTF existentes). RECOMENDACAO_BPM_ORIGINAL era "Bord+PLAQ apenas" mas Pink optou por não mexer. Pendência: validar com produção se Silk/DTF realmente funcionam em couro legítimo.',
        'risco_qualidade', 'MEDIO — Silk/DTF em couro pode causar manchas/falhas',
        'status_decisao', 'ACEITO_TEMPORARIAMENTE_25_04_2026'
      ),
      'NAO_TEXTIL_RIGIDO', jsonb_build_object(
        'slugs_exemplo', jsonb_build_array('aluminio','aco-inox','metal|generico','cobre','abs-acrilonitrila-butadieno-estireno','pvc-rigido','pvc-flexivel','pvc-policloreto-de-vinila','pvc|flocado|veludo','plastico-pet','plastico-rpet','polipropileno-pp','polipropileno-homopolimero-pp-homo','eva-acetato-de-vinila','espuma','ceramica','cartao','cortica','bambu','mdf','borracha'),
        'tecnicas', jsonb_build_array('PLAQ-MOC-01'),
        'observacao', 'v2: NAO_TEXTIL_RIGIDO aceita PLAQ provisoriamente (decisão Pink 25/04 — manter PLAQ + revisão caso a caso). Silk/DTF/Bordado em material rígido são incompatíveis tecnicamente (5 PATs detectados aguardam decisão).',
        'pendencia_revisao', 'Verificar produto-a-produto se realmente possui plaquinha integrada de fábrica',
        'status_decisao', 'ACEITO_TEMPORARIAMENTE_25_04_2026'
      ),
      'SEM_MATERIAL', jsonb_build_object(
        'tecnicas', jsonb_build_array('PLAQ-MOC-01'),
        'observacao', 'v2: aceita PLAQ provisoriamente. Pendência crítica: cadastrar material em product_materials. Atenção: vários produtos sem material NÃO são mochila (cadernos, cadernetas, kits) e estão na categoria errada.',
        'status_decisao', 'ACEITO_TEMPORARIAMENTE_25_04_2026'
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
      'pendencias_pos_v2', 'Ver debito_tecnico_fase5_mochila_25_04_2026'
    )
  ),
  description = 'Matriz oficial v2 de compatibilidade material × técnica para Mochila MVP. Atualizada em 25/04 com decisões conservadoras de Pink (não mexer no couro, manter PLAQ provisório).',
  updated_at = NOW()
WHERE setting_key = 'gravacao_combo_regras_mochila';

-- ============================================================
-- AÇÃO 2: Ajustes em BORD-MOC-01
-- ============================================================
UPDATE tabela_preco_gravacao_oficial
SET 
  max_cores = 1,
  custo_aplicacao = 0,
  updated_at = NOW()
WHERE codigo_tabela = 'BORD-MOC-01';

-- ============================================================
-- AÇÃO 3: Débito técnico abrangente Fase 5
-- ============================================================
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'debito_tecnico_fase5_mochila_25_04_2026',
  jsonb_build_object(
    'versao', 'v1',
    'data_criacao', '2026-04-25',
    'autor', 'Pink + Claude BPM',
    'contexto', 'Auditoria completa da Fase 5 Mochila MVP. Decisão Pink: zero DELETE nesta sessão, tudo vira débito técnico estruturado para revisão futura.',
    
    'P1_sacochilas_com_tecnicas_mochila', jsonb_build_object(
      'titulo', 'Sacochilas vinculadas a técnicas MOC (categoria semântica errada)',
      'severidade', 'MEDIA',
      'qtd_produtos', 14,
      'qtd_pats_envolvidos', 53,
      'criterio_revisao', 'Decidir: (a) reclassificar como Mochila e manter MOC, ou (b) remover MOC e adicionar SAC',
      'produtos', jsonb_build_array(
        jsonb_build_object('id','7c67065d-c70b-4652-898f-6b4051e9301b','name','Mochila Saco','tecnicas_aplicadas','4 MOC, sem SAC'),
        jsonb_build_object('id','1a2544e6-4f45-4da8-9787-3960040de2c3','name','Mochila Saco Poliéster','tecnicas_aplicadas','4 MOC, sem SAC'),
        jsonb_build_object('id','0c43f95f-e2c9-4770-82c5-8f047ae142e3','name','MOCHILA SACOLA EM NYLON 190D - BRANCA','tecnicas_aplicadas','4 MOC, sem SAC'),
        jsonb_build_object('id','c55768af-7cfe-4b76-94c3-325f555e1611','name','MOCHILA SACOLA EM NYLON 190D - PRETA','tecnicas_aplicadas','4 MOC, sem SAC'),
        jsonb_build_object('id','ca40302e-7c14-4e5a-bfe6-d776a6911bea','name','MOCHILA SACOLA PRETA EM NYLON - 20L','tecnicas_aplicadas','4 MOC, sem SAC'),
        jsonb_build_object('id','40b5a525-ee66-4d11-ae2f-07f8a762e1f2','name','Saco tipo mochila 100% algodão','tecnicas_aplicadas','4 MOC, sem SAC'),
        jsonb_build_object('id','4f04d602-3953-44c3-ab00-28c6f13fcaba','name','Saco tipo mochila em 210D com bolso frontal','tecnicas_aplicadas','4 MOC, sem SAC'),
        jsonb_build_object('id','ac05252d-c997-4543-a394-51a9bd7c511c','name','Saco tipo mochila em 210D com elementos refletores','tecnicas_aplicadas','4 MOC, sem SAC'),
        jsonb_build_object('id','48838f64-ae57-453c-9162-674f4900dc12','name','Sacochila em PVC','tecnicas_aplicadas','4 MOC; ATENCAO: PVC em categoria Sacochila Nylon — duplo erro de classificação'),
        jsonb_build_object('id','0bc78070-f93c-4972-9323-a469925b4d7c','name','Saco tipo mochila em poliéster reciclado 190T','tecnicas_aplicadas','só PLAQ-MOC; sem SAC'),
        jsonb_build_object('id','2a437e9d-d717-4630-8d04-ab95421d08b1','name','Sacochila Algodão','tecnicas_aplicadas','SAC + MOC duplicado (7 técnicas)'),
        jsonb_build_object('id','61103458-bd6b-47ee-b01e-07003934ef9b','name','Sacochila Algodão','tecnicas_aplicadas','SAC + MOC duplicado (7 técnicas)'),
        jsonb_build_object('id','ef20bcd6-267c-474c-bc6f-c9c1e464e6dc','name','Sacochila Algodão G','tecnicas_aplicadas','SAC + MOC duplicado (7 técnicas)'),
        jsonb_build_object('id','09f54fed-097a-482e-829e-c45808c3620d','name','Sacochila Sublimática Microfibra','tecnicas_aplicadas','SAC + SUBL + MOC duplicado (9 técnicas)')
      )
    ),
    
    'P2_malas_abs_em_categoria_mochila', jsonb_build_object(
      'titulo', 'Malas de viagem ABS rígido em categoria Mochila com Silk/DTF têxtil',
      'severidade', 'ALTA',
      'qtd_produtos', 2,
      'qtd_pats_envolvidos', 6,
      'criterio_revisao', 'Categoria errada (mala não é mochila) + Silk/DTF têxtil em ABS rígido (incompatível). Decidir: criar categoria Bagagem/Mala Rígida ou aceitar como mochila e remover Silk+DTF',
      'produtos', jsonb_build_array(
        jsonb_build_object('id','cc4a2daf-0611-4769-95d3-fe301cd0f3a0','name','MALA DE VIAGEM EM ABS RÍGIDO COM RODINHAS 360º - 37L','tecnicas','Silk+DTF+PLAQ'),
        jsonb_build_object('id','8ffcd8b3-bb61-471b-9dc4-cecc68b33fa3','name','MALA DE VIAGEM EM ABS RÍGIDO COM RODINHAS 360º - 40L','tecnicas','Silk+DTF+PLAQ')
      )
    ),
    
    'P3_1_couro_com_4_tecnicas', jsonb_build_object(
      'titulo', 'Couro (legítimo + sintético) com Silk/DTF aplicados',
      'severidade', 'MEDIA',
      'qtd_produtos', 39,
      'qtd_pats_silk', 39,
      'qtd_pats_dtf', 39,
      'status_decisao', 'ACEITO_TEMPORARIAMENTE',
      'decisao_pink_25_04_2026', 'Não mexer — manter as 4 técnicas',
      'criterio_revisao_futura', 'Validar com produção se Silk/DTF realmente funcionam em couro legítimo. Recomendação BPM original (não aceita): manter apenas Bordado + PLAQ.',
      'risco', 'Cliente pode reclamar de qualidade da gravação Silk/DTF em couro'
    ),
    
    'P3_2_nao_textil_com_silk_dtf_bordado', jsonb_build_object(
      'titulo', 'Mochilas não-têxteis (5 produtos) com Silk/DTF/Bordado aplicado',
      'severidade', 'ALTA',
      'qtd_produtos_estimado', 5,
      'qtd_pats_envolvidos_estimado', 15,
      'criterio_revisao', 'Tecnicamente incompatível — material rígido não recebe tinta plastisol nem cura térmica nem bordado. Pendente decisão Pink: deletar PATs ou manter?',
      'pendencia_critica', true
    ),
    
    'P3_3_nao_textil_com_plaq', jsonb_build_object(
      'titulo', 'Mochilas não-têxteis (54 produtos) com PLAQ aplicado',
      'severidade', 'BAIXA',
      'qtd_produtos', 54,
      'qtd_pats_envolvidos', 54,
      'status_decisao', 'ACEITO_TEMPORARIAMENTE',
      'decisao_pink_25_04_2026', 'Manter PLAQ por enquanto, revisão caso a caso',
      'criterio_revisao_futura', 'Verificar produto-a-produto se realmente possui plaquinha integrada de fábrica'
    ),
    
    'P3_4_sem_material_e_categoria_errada', jsonb_build_object(
      'titulo', 'Produtos sem material cadastrado + produtos em categoria Mochila que não são mochila',
      'severidade', 'ALTA',
      'qtd_produtos', 29,
      'subgrupos', jsonb_build_object(
        'mochilas_reais_sem_material', jsonb_build_array(
          'aa01c9c1-7b60-449a-a9a5-36aa57561031 (Mochila para notebook)',
          '02f0c9ff-d55c-4c7c-9323-ea80149db421 (MOCHILA EM POLYESTER/PU EXECUTIVE 20L)',
          '015e9f0a-dd0f-444e-9a76-8404c2576ee6 (MOCHILA EM POLYESTER/PU EXECUTIVE 22L)',
          'd622bc93-b24e-4171-9bdc-7095de8ba3d6 (MOCHILA EM POLYESTER/PU EXECUTIVE 20L duplicado)',
          'c31e3eae-b923-4f4e-9815-88c043454fc0 (Mochila com Compartimento a Vácuo e Expansor)'
        ),
        'NAO_MOCHILAS_em_categoria_mochila', jsonb_build_array(
          '~24 produtos: cadernos, cadernetas, blocos, kits caderno, kit whisky',
          'Severidade altíssima — categorização totalmente errada',
          'Lista completa em backup_pre_faxina_mochila_25_04_2026'
        )
      ),
      'criterio_revisao', 'Mochilas reais: cadastrar material em product_materials. Não-mochilas: mover para categoria correta (cadernos/blocos/kits)'
    ),
    
    'P4_bord_moc_01_corrigida', jsonb_build_object(
      'titulo', 'BORD-MOC-01 — max_cores 10→1 e custo_aplicacao NULL→0',
      'severidade', 'BAIXA',
      'status', 'RESOLVIDO_25_04_2026',
      'descricao', 'Aplicado nesta migration'
    ),
    
    'P5_cosmeticas', jsonb_build_object(
      'titulo', 'Inconsistências cosméticas',
      'severidade', 'BAIXISSIMA',
      'pendencias', jsonb_build_array(
        'PLAQ-MOC-01 usa location_code=PLAQUINHA, demais técnicas usam FRENTE — inconsistência tolerável',
        'Faixas BORD-MOC-01 têm dimensão (10×4 cm) e demais técnicas têm dimensão só no PAT — inconsistência arquitetural'
      )
    ),
    
    'resumo_executivo', jsonb_build_object(
      'pats_inalterados', 1533,
      'pats_deletados', 0,
      'pats_inseridos', 0,
      'tecnicas_alteradas', jsonb_build_array('BORD-MOC-01 (max_cores + custo_aplicacao)'),
      'matriz_atualizada', 'gravacao_combo_regras_mochila v1 → v2',
      'rollback_disponivel', 'backup_pre_faxina_mochila_25_04_2026'
    )
  ),
  'Débito técnico estruturado da Fase 5 Mochila — 25/04/2026. Decisão Pink: zero DELETE, tudo registrado para revisão futura.'
)
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value, updated_at = NOW();
