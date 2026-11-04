-- Documentar artefatos no banco para descoberta via metadados

COMMENT ON TABLE tabela_preco_gravacao_oficial IS
'Tabela mestre de precos de gravacao/personalizacao. Cada linha = uma "tabela de precos" para uma combinacao tecnica+categoria+formato. Marcas/precos relacionados em tabela_preco_gravacao_oficial_faixa. Modelo evoluido v2 (pos correcoes 2026-04). Use fn_simular_combo_gravacao_v11 para cotar.';

COMMENT ON TABLE tabela_preco_gravacao_oficial_faixa IS
'Faixas de preco por (qty + dimensional). Cada faixa tem qty_min/qty_max e opcionalmente largura/altura min/max. Trigger trg_check_preco_minimo previne preco abaixo do minimo da tabela-mae. Indice idx_faixa_v11_dim otimizado para a funcao de cotacao.';

COMMENT ON COLUMN tabela_preco_gravacao_oficial.opcoes_modificadores IS
'JSONB com modificadores. Chaves canonicas: regra_anti_paradoxo (sempre MAX_ENTRE_FAIXAS), faturamento_minimo_custo (canonica desde FIX-07), multiplicador_cor (chaves "1","2",...), materiais_aplicaveis (array), versao_modelo, historico_fixes (array de objetos {data,fix_id,descricao}), documentacao (formula_*, exemplos), recomendacao_tecnica (pendencias comerciais).';

COMMENT ON COLUMN tabela_preco_gravacao_oficial.cobra_por_cor IS
'TRUE quando cada cor adicional cobra extra. Combinar com multiplicador_cor no JSONB. Substituiu campos legados desconto_segunda_cor/desconto_terceira_cor (DEPRECATED desde FIX-03).';

COMMENT ON COLUMN tabela_preco_gravacao_oficial.custo_setup_por_cor IS
'TRUE = setup eh multiplicado pelo numero de cores (1 cliche/tela por cor). FALSE = setup unico independente do numero de cores. Ver recomendacao_tecnica no JSONB para casos com decisao comercial pendente.';

-- Documentar relacao logica
COMMENT ON COLUMN tabela_preco_gravacao_oficial_faixa.tabela_preco_gravacao_id IS
'FK para tabela_preco_gravacao_oficial. Cada faixa pertence a exatamente 1 tabela. JOIN otimizado em idx_faixa_v11_dim.';

COMMENT ON COLUMN tabela_preco_gravacao_oficial_faixa.quantidade_maxima IS
'NULL = sem teto (faixa aberta). Padrao desde FIX-01 (substituiu sentinela 999999).';

-- Comentar tabelas de backup
COMMENT ON TABLE _backup_20260425_tabela_preco_gravacao_oficial IS
'Backup do estado pre-correcoes em 2026-04-25. Drop apos 30 dias se sistema estavel.';

COMMENT ON TABLE _backup_20260425_tabela_preco_gravacao_oficial_faixa IS
'Backup do estado pre-correcoes em 2026-04-25. Drop apos 30 dias se sistema estavel.';

COMMENT ON TABLE _backup_20260425_tecnicas_gravacao IS
'Backup do estado pre-correcoes em 2026-04-25. Drop apos 30 dias se sistema estavel.';
