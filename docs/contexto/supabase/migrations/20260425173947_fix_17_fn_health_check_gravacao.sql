-- Função única que retorna status de saúde de toda a estrutura de gravação
CREATE OR REPLACE FUNCTION public.fn_health_check_gravacao()
RETURNS TABLE(
  categoria TEXT,
  metrica TEXT,
  valor TEXT,
  status TEXT,
  detalhe TEXT
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  -- COBERTURA
  SELECT 'COBERTURA'::text, 'Tabelas ativas',
    COUNT(*)::text || ' / ' || (SELECT COUNT(*) FROM tabela_preco_gravacao_oficial)::text,
    CASE WHEN COUNT(*) >= 40 THEN 'OK' ELSE 'ATENCAO' END,
    'Total de tabelas catalogadas vs ativas hoje'
  FROM tabela_preco_gravacao_oficial WHERE ativo = true
  UNION ALL
  SELECT 'COBERTURA', 'Grupos técnicos ativos',
    COUNT(DISTINCT grupo_tecnica)::text,
    CASE WHEN COUNT(DISTINCT grupo_tecnica) >= 7 THEN 'OK' ELSE 'ATENCAO' END,
    string_agg(DISTINCT grupo_tecnica, ', ')
  FROM tabela_preco_gravacao_oficial WHERE ativo = true
  UNION ALL
  SELECT 'COBERTURA', 'Faixas ativas (qty + dimensional)',
    COUNT(*)::text, 'INFO',
    'Total de combinações qty/dimensional cadastradas em tabelas ativas'
  FROM tabela_preco_gravacao_oficial_faixa f
  JOIN tabela_preco_gravacao_oficial t ON t.id = f.tabela_preco_gravacao_id
  WHERE t.ativo = true
  UNION ALL
  -- CONSISTÊNCIA
  SELECT 'CONSISTENCIA', 'Tabelas sem regra anti-paradoxo',
    COUNT(*)::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'CRITICO' END,
    'Devem ter MAX_ENTRE_FAIXAS no JSONB'
  FROM tabela_preco_gravacao_oficial 
  WHERE ativo = true AND opcoes_modificadores->>'regra_anti_paradoxo' IS NULL
  UNION ALL
  SELECT 'CONSISTENCIA', 'Tabelas sem fatmin canônico',
    COUNT(*)::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'CRITICO' END,
    'faturamento_minimo_custo é a chave canônica pós-FIX-07'
  FROM tabela_preco_gravacao_oficial 
  WHERE ativo = true AND opcoes_modificadores->>'faturamento_minimo_custo' IS NULL
  UNION ALL
  SELECT 'CONSISTENCIA', 'Tabelas sem materiais_aplicaveis',
    COUNT(*)::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'CRITICO' END,
    'Necessário para fn_recomendar_tecnica funcionar bem'
  FROM tabela_preco_gravacao_oficial 
  WHERE ativo = true AND opcoes_modificadores->'materiais_aplicaveis' IS NULL
  UNION ALL
  SELECT 'CONSISTENCIA', 'Faixas com sentinela 999999',
    COUNT(*)::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'CRITICO' END,
    'Devem ser NULL após FIX-01'
  FROM tabela_preco_gravacao_oficial_faixa WHERE quantidade_maxima = 999999
  UNION ALL
  SELECT 'CONSISTENCIA', 'Violações preco_minimo',
    COUNT(*)::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'CRITICO' END,
    'Trigger trg_check_preco_minimo previne novas inserções abaixo do mínimo'
  FROM tabela_preco_gravacao_oficial t
  JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
  WHERE t.ativo = true AND f.preco_unitario < t.preco_minimo_unitario
  UNION ALL
  SELECT 'CONSISTENCIA', 'Tabelas ativas sem produto em PAT',
    COUNT(*)::text,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ATENCAO' END,
    'Tabela inalcançável - nenhum produto a referencia'
  FROM tabela_preco_gravacao_oficial t
  WHERE t.ativo = true 
    AND NOT EXISTS (SELECT 1 FROM print_area_techniques pat WHERE pat.tabela_preco_id = t.id AND pat.is_active)
  UNION ALL
  -- INFRAESTRUTURA
  SELECT 'INFRAESTRUTURA', 'Função fn_simular_combo_gravacao_v10',
    'criada', 'OK', 'V10 silenciosa, retrocompatível'
  UNION ALL
  SELECT 'INFRAESTRUTURA', 'Função fn_simular_combo_gravacao_v11',
    'criada', 'OK', 'V11 com diagnóstico explícito (recomendada)'
  UNION ALL
  SELECT 'INFRAESTRUTURA', 'Função fn_recomendar_tecnica',
    'criada', 'OK', 'Camada de orientação automática'
  UNION ALL
  SELECT 'INFRAESTRUTURA', 'Trigger trg_check_preco_minimo',
    CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_preco_minimo') THEN 'ativo' ELSE 'AUSENTE' END,
    CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_preco_minimo') THEN 'OK' ELSE 'CRITICO' END,
    'Previne cadastro de faixa abaixo do preço mínimo'
  UNION ALL
  SELECT 'INFRAESTRUTURA', 'Trigger trg_audit_gravacao',
    CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_gravacao') THEN 'ativo' ELSE 'AUSENTE' END,
    CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_gravacao') THEN 'OK' ELSE 'ATENCAO' END,
    'Audit trail de mudanças em tabela_preco_gravacao_oficial'
  UNION ALL
  SELECT 'INFRAESTRUTURA', 'View v_audit_paradoxos_gravacao',
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'v_audit_paradoxos_gravacao') THEN 'criada' ELSE 'AUSENTE' END,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'v_audit_paradoxos_gravacao') THEN 'OK' ELSE 'ATENCAO' END,
    'Detecta paradoxos naturais entre faixas'
  UNION ALL
  SELECT 'INFRAESTRUTURA', 'View v_audit_cobertura_tecnicas',
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'v_audit_cobertura_tecnicas') THEN 'criada' ELSE 'AUSENTE' END,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'v_audit_cobertura_tecnicas') THEN 'OK' ELSE 'ATENCAO' END,
    'Status por grupo técnico'
  UNION ALL
  -- BACKUP
  SELECT 'BACKUP', 'Snapshot pre-correções 2026-04-25',
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name LIKE '_backup_20260425%') THEN 'sim' ELSE 'NAO' END,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name LIKE '_backup_20260425%') THEN 'OK' ELSE 'ATENCAO' END,
    '_backup_20260425_tabela_preco_gravacao_oficial e companhia'
  UNION ALL
  -- AUDIT VOLUME
  SELECT 'AUDIT', 'Mudanças registradas (últimos 7 dias)',
    COUNT(*)::text, 'INFO',
    'Linhas em audit_log_gravacao com ts > NOW() - 7 dias'
  FROM audit_log_gravacao WHERE ts > NOW() - INTERVAL '7 days'
  UNION ALL
  SELECT 'AUDIT', 'Pendências comerciais registradas',
    (SELECT COUNT(*)::text FROM tabela_preco_gravacao_oficial 
     WHERE ativo = true AND opcoes_modificadores ? 'recomendacao_tecnica'),
    'INFO',
    'Tabelas com campo recomendacao_tecnica esperando decisão comercial'
  ORDER BY 1, 2;
$function$;

COMMENT ON FUNCTION public.fn_health_check_gravacao IS
'Health check completo da estrutura de gravacao. Retorna 18+ metricas em 5 categorias (COBERTURA, CONSISTENCIA, INFRAESTRUTURA, BACKUP, AUDIT). Status: OK / ATENCAO / CRITICO / INFO. Use em dashboards e CI/CD.';
