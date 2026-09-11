-- ============================================================================
-- fix_version: 20260717_secure_tabela_gravacao_anon_definer_v1
-- MELHORIA 3/6: Protege custo/markup da tabela de gravação oficial.
-- tabela_preco_gravacao_oficial tinha anon SELECT com: custo_setup (56 rows, max R$325),
-- markup_percent (58 rows, max 115%), custo_aplicacao, custo_termo_transferencia, 
-- custo_queima_forno, faturamento_minimo — dados operacionais/financeiros internos.
-- SOLUÇÃO: View pública SECURITY DEFINER com apenas colunas seguras (nome, grupo,
-- flags de cobrança, faixas de preço de venda, flags técnicos). REVOKE tabela base.
-- tabela_preco_gravacao_oficial_faixa mantém acesso direto (só preco_unitario = venda).
-- ============================================================================

-- (A) View pública sem colunas de custo/markup
CREATE OR REPLACE VIEW public.v_tabela_preco_gravacao_oficial_public AS
SELECT
  id, codigo_tabela, codigo, codigo_curto, nome, nome_grupo, descricao,
  grupo_tecnica, cobra_por_cor, max_cores,
  desconto_segunda_cor, desconto_terceira_cor, desconto_quarta_cor_mais,
  preco_minimo_unitario, preco_maximo_unitario,
  cobra_por_area, area_maxima_cm2, area_maxima_texto,
  cobra_por_pontos, max_pontos,
  usa_faixa_dimensional, opcoes_modificadores, tom_options,
  cobra_aplicacao, cobra_queima_forno, cobra_termo_transferencia,
  custo_setup_por_cor,      -- boolean (se cobra setup por cor) — não é valor monetário
  custo_manuseio_por_peca,  -- boolean (se cobra manuseio por peça) — não é valor monetário
  quantidade_corte, tipo_setup,
  validade_inicio, validade_fim,
  ordem_exibicao, tecnica_variante_id, ativo,
  created_at, updated_at
  -- EXCLUÍDOS INTENCIONALMENTE (sensíveis):
  -- custo_setup, custo_manuseio, custo_aplicacao, custo_termo_transferencia,
  -- custo_queima_forno, markup_percent, faturamento_minimo
FROM public.tabela_preco_gravacao_oficial
WHERE ativo = true;

-- (B) SECURITY DEFINER — anon só precisa de SELECT na view, não na tabela base
ALTER VIEW public.v_tabela_preco_gravacao_oficial_public SET (security_invoker = false);

-- (C) Grants: view concedida, tabela base revogada
GRANT SELECT ON public.v_tabela_preco_gravacao_oficial_public TO anon;
REVOKE SELECT ON public.tabela_preco_gravacao_oficial FROM anon;

-- (D) Documentação
COMMENT ON VIEW public.v_tabela_preco_gravacao_oficial_public IS
  'PUBLIC ENGRAVING TABLE PROJECTION (SECURITY DEFINER / fix_version 20260717). '
  'Expõe apenas colunas de cobrança e preços de venda. '
  'EXCLUÍDOS: custo_setup (R$325 max), markup_percent (115% max), custo_aplicacao, '
  'custo_termo_transferencia, custo_queima_forno, faturamento_minimo. '
  'NAO reverter para security_invoker=true nem re-expor a tabela base ao anon.';

NOTIFY pgrst, 'reload schema';;
