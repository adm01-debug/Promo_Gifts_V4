-- Reativar SUBL-CAM-A3 e SUBL-CAM-A4 (modelo já compatível com SUBL-SAC modernas)
UPDATE tabela_preco_gravacao_oficial
SET ativo = true,
    opcoes_modificadores = jsonb_set(
      opcoes_modificadores - 'status_classificacao',
      '{historico_fixes}',
      COALESCE(opcoes_modificadores->'historico_fixes', '[]'::jsonb) ||
      jsonb_build_array(jsonb_build_object(
        'data', '2026-04-25',
        'fix_id', 'EXP-03',
        'descricao', 'Reativada. Modelo de calculo, fatmin, faixas e materiais ja estavam alinhados com SUBL-SAC modernas. Status REVIVABLE removido.',
        'descoberto_em', 'Auditoria 2026-04-25 - gap categoria Camiseta sem sublimacao'
      ))
    ),
    updated_at = NOW()
WHERE codigo_tabela IN ('SUBL-CAM-A3-01','SUBL-CAM-A4-01');
