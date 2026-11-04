-- Documentar decisão de Pink: 42 "paradoxos" do FIBER-CIL-01 são design intencional
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'design_intencional_fiber_cil_01',
  jsonb_build_object(
    'data_decisao', NOW()::text,
    'decisao', 'DESIGN_INTENCIONAL_NAO_MEXER',
    'autor_decisao', 'Pink (Joaquim Rosa)',
    'tecnica', 'FIBER-CIL-01',
    'descricao', 'Gravação a Laser Fiber em superfície CILÍNDRICA (canetas metálicas)',
    
    'achado_inicial', jsonb_build_object(
      'titulo', '42 inversões de preço por área em FIBER-CIL-01',
      'detalhe', 'Peças com área menor cobrando MAIS que peças com área maior dentro da mesma faixa de qty'
    ),
    
    'duas_modalidades_misturadas', jsonb_build_array(
      jsonb_build_object(
        'modalidade', 'RETANGULAR',
        'descricao', 'Gravação retangular num lado plano da caneta',
        'exemplos_dim', jsonb_build_array('4x6 cm', '5x6 cm', '6x8 cm', '7x10 cm'),
        'qtd_dimensoes', 16
      ),
      jsonb_build_object(
        'modalidade', 'EM_VOLTA',
        'descricao', 'Gravação dando a volta toda no cilindro (anel ou faixa contínua)',
        'exemplos_dim', jsonb_build_array('99x4 cm', '99x6 cm', '4x99 cm', '7x99 cm'),
        'observacao_99', 'O valor 99 representa "dar a volta toda" no cilindro',
        'qtd_dimensoes', 9
      )
    ),
    
    'paradoxos_identificados', jsonb_build_array(
      jsonb_build_object('caso', '4x6 vs 7x4', 'modalidade', 'RETANGULAR', 'inversao_pct', 15.26),
      jsonb_build_object('caso', '7x99 vs 99x8', 'modalidade', 'EM_VOLTA', 'inversao_pct', 18.18),
      jsonb_build_object('caso', '5x99 vs 99x6', 'modalidade', 'EM_VOLTA', 'inversao_pct', 14.74),
      jsonb_build_object('caso', '6x99 vs 99x8', 'modalidade', 'EM_VOLTA', 'inversao_pct', 7.68),
      jsonb_build_object('caso', '7x99 vs 99x10', 'modalidade', 'EM_VOLTA', 'inversao_pct', 3.36),
      jsonb_build_object('caso', '4x99 vs 99x6', 'modalidade', 'EM_VOLTA', 'inversao_pct', 2.01)
    ),
    
    'justificativa_tecnica', jsonb_build_object(
      'titulo', 'Gravação vertical custa mais que horizontal em laser cilíndrico',
      'razao', 'Em laser sobre cilindro (caneta metálica), a gravação na orientação VERTICAL exige rotação contínua do cilindro durante a gravação, o que aumenta o tempo de máquina. A gravação HORIZONTAL é mais simples mecanicamente — o laser percorre uma faixa sem rotação contínua.',
      'conclusao', 'Os preços refletem o tempo real de máquina, não a área geométrica. Não é erro de dados — é precificação técnica correta do fornecedor.'
    ),
    
    'acao', jsonb_build_object(
      'tipo', 'NENHUMA',
      'razao', 'Mexer nesses preços pode quebrar a precificação real do fornecedor. Os 42 casos refletem complexidade técnica diferente entre orientações.',
      'verificacao_futura', 'Caso uma futura auditoria detecte os mesmos 42 casos, esta decisão deve ser consultada antes de qualquer correção.'
    ),
    
    'impacto_score_qualidade', jsonb_build_object(
      'antes_da_decisao', 'Verificação 16 (preço por área não-monotônico) seria classificada como FALHA',
      'depois_da_decisao', 'Verificação 16 reclassificada como APROVADA com nota explicativa',
      'novo_score', '26/26 verificações aprovadas'
    )
  ),
  'Decisão registrada: 42 paradoxos do FIBER-CIL-01 são design intencional refletindo complexidade técnica de gravação vertical vs horizontal em cilindro. Não devem ser corrigidos.'
);
