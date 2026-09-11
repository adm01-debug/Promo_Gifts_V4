
-- ================================================================
-- MELHORIA-08: fn_get_customization_price — incorporar novos campos
-- Adicionados na MELHORIA-02:
--   - faturamento_minimo: valor mínimo de faturamento (em vez de só preco_minimo_unitario)
--   - custo_manuseio_por_peca: manuseio multiplicado pela quantidade
--   - cobra_aplicacao, cobra_queima_forno, cobra_termo_transferencia: flags de custo extra
-- NOTA: mantemos compatibilidade total com a assinatura atual
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_get_customization_price(
  p_area_id        uuid,
  p_quantidade     integer,
  p_num_cores      integer  DEFAULT 1,
  p_largura_cm     numeric  DEFAULT NULL,
  p_altura_cm      numeric  DEFAULT NULL,
  p_num_pontos     integer  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tabela_id          UUID;
  v_codigo_tabela      TEXT;
  v_nome_tabela        TEXT;
  v_grupo_tecnica      TEXT;
  v_cobra_por_cor      BOOLEAN;
  v_max_cores          INT;
  v_custo_setup        NUMERIC;
  v_custo_setup_por_cor BOOLEAN;
  v_custo_aplicacao    NUMERIC;
  v_desconto_2cor      NUMERIC;
  v_desconto_3cor      NUMERIC;
  v_desconto_4cor      NUMERIC;
  v_is_curved          BOOLEAN;
  v_usa_faixa_dimensional BOOLEAN;
  v_max_width          NUMERIC;
  v_max_height         NUMERIC;
  v_preco_base         NUMERIC;
  v_preco_venda        NUMERIC;
  v_setup_total        NUMERIC;
  v_setup_total_markup NUMERIC;
  v_valor_gravacao     NUMERIC;
  v_total_cobrado      NUMERIC;
  v_faixa_id           UUID;
  v_faixa_info         JSONB;
  v_markup_pct         NUMERIC;
  v_preco_min_unit     NUMERIC;
  v_faturamento_min    NUMERIC;
  v_custo_manuseio     NUMERIC;
  v_custo_manuseio_por_peca BOOLEAN;
  v_cobra_aplicacao    BOOLEAN;
  v_cobra_queima       BOOLEAN;
  v_cobra_termo        BOOLEAN;
  v_opcoes             JSONB;
  v_mult_cor           NUMERIC;
  v_regra_ativada      TEXT;
  v_pico_anterior      NUMERIC;
BEGIN
  -- Validação 1: Quantidade
  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RETURN jsonb_build_object('success',false,'error','Quantidade deve ser maior que zero','quantidade',p_quantidade);
  END IF;

  -- Validação 2: Dimensões
  IF (p_largura_cm IS NOT NULL AND p_largura_cm <= 0)
  OR (p_altura_cm  IS NOT NULL AND p_altura_cm  <= 0) THEN
    RETURN jsonb_build_object('success',false,'error','Dimensões devem ser maiores que zero','largura',p_largura_cm,'altura',p_altura_cm);
  END IF;

  -- Passo 1: Resolver área
  SELECT pat.tabela_preco_id, pat.is_curved, pat.max_width, pat.max_height
  INTO   v_tabela_id, v_is_curved, v_max_width, v_max_height
  FROM   print_area_techniques pat
  WHERE  pat.id = p_area_id AND pat.is_active = true;

  IF v_tabela_id IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Technique não encontrada','technique_id',p_area_id);
  END IF;

  -- Passo 2: Validar dimensões vs limites da área
  IF p_largura_cm IS NOT NULL AND v_max_width IS NOT NULL AND p_largura_cm > v_max_width THEN
    RETURN jsonb_build_object('success',false,'error',
      format('Largura %s cm excede limite máximo de %s cm', p_largura_cm, v_max_width));
  END IF;
  IF p_altura_cm IS NOT NULL AND v_max_height IS NOT NULL AND p_altura_cm > v_max_height THEN
    RETURN jsonb_build_object('success',false,'error',
      format('Altura %s cm excede limite máximo de %s cm', p_altura_cm, v_max_height));
  END IF;

  -- Passo 3: Carregar config da técnica
  SELECT
    t.codigo_tabela, t.nome, t.grupo_tecnica,
    t.cobra_por_cor, COALESCE(t.max_cores, 1),
    COALESCE(t.custo_setup, 0), COALESCE(t.custo_setup_por_cor, false),
    COALESCE(t.custo_aplicacao, 0),
    COALESCE(t.desconto_segunda_cor, 10),
    COALESCE(t.desconto_terceira_cor, 15),
    COALESCE(t.desconto_quarta_cor_mais, 20),  -- NOVO campo
    COALESCE(t.usa_faixa_dimensional, false),
    COALESCE(t.markup_percent, 0),
    COALESCE(t.preco_minimo_unitario, 0),
    t.faturamento_minimo,                       -- NOVO campo
    COALESCE(t.custo_manuseio, 0),
    COALESCE(t.custo_manuseio_por_peca, false), -- NOVO campo
    COALESCE(t.cobra_aplicacao, false),          -- NOVO campo
    COALESCE(t.cobra_queima_forno, false),       -- NOVO campo
    COALESCE(t.cobra_termo_transferencia, false),-- NOVO campo
    t.opcoes_modificadores
  INTO
    v_codigo_tabela, v_nome_tabela, v_grupo_tecnica,
    v_cobra_por_cor, v_max_cores,
    v_custo_setup, v_custo_setup_por_cor,
    v_custo_aplicacao,
    v_desconto_2cor, v_desconto_3cor, v_desconto_4cor,
    v_usa_faixa_dimensional,
    v_markup_pct, v_preco_min_unit,
    v_faturamento_min,
    v_custo_manuseio, v_custo_manuseio_por_peca,
    v_cobra_aplicacao, v_cobra_queima, v_cobra_termo,
    v_opcoes
  FROM tabela_preco_gravacao_oficial t
  WHERE t.id = v_tabela_id;

  -- Passo 4: Validar dimensões obrigatórias
  IF v_usa_faixa_dimensional AND (p_largura_cm IS NULL OR p_altura_cm IS NULL) THEN
    RETURN jsonb_build_object('success',false,'error',
      format('Dimensões obrigatórias para técnica %s (usa faixa dimensional)', v_codigo_tabela));
  END IF;

  -- Validar num_cores
  p_num_cores := GREATEST(1, LEAST(p_num_cores, v_max_cores));

  -- Passo 5: Buscar faixa de preço
  IF v_usa_faixa_dimensional THEN
    SELECT f.id, f.preco_unitario, f.prazo_dias,
           f.largura_min, f.largura_max, f.altura_min, f.altura_max,
           f.quantidade_minima, f.quantidade_maxima
    INTO   v_faixa_id, v_preco_base,
           v_faixa_info
    FROM tabela_preco_gravacao_oficial_faixa f
    WHERE f.tabela_preco_gravacao_id = v_tabela_id
      AND p_quantidade BETWEEN f.quantidade_minima AND COALESCE(f.quantidade_maxima, 999999)
      AND (f.largura_min IS NULL OR p_largura_cm >= f.largura_min)
      AND (f.largura_max IS NULL OR p_largura_cm <= f.largura_max)
      AND (f.altura_min  IS NULL OR p_altura_cm  >= f.altura_min)
      AND (f.altura_max  IS NULL OR p_altura_cm  <= f.altura_max)
    ORDER BY f.quantidade_minima DESC, f.largura_min DESC NULLS LAST
    LIMIT 1;

    SELECT INTO v_preco_base, v_faixa_info
      f2.preco_unitario,
      jsonb_build_object(
        'faixa_id', f2.id, 'preco', f2.preco_unitario, 'prazo_dias', f2.prazo_dias,
        'qtd_min', f2.quantidade_minima, 'qtd_max', f2.quantidade_maxima,
        'larg_min', f2.largura_min, 'larg_max', f2.largura_max,
        'alt_min', f2.altura_min, 'alt_max', f2.altura_max
      )
    FROM tabela_preco_gravacao_oficial_faixa f2
    WHERE f2.tabela_preco_gravacao_id = v_tabela_id
      AND p_quantidade BETWEEN f2.quantidade_minima AND COALESCE(f2.quantidade_maxima, 999999)
      AND (f2.largura_min IS NULL OR p_largura_cm >= f2.largura_min)
      AND (f2.largura_max IS NULL OR p_largura_cm <= f2.largura_max)
      AND (f2.altura_min  IS NULL OR p_altura_cm  >= f2.altura_min)
      AND (f2.altura_max  IS NULL OR p_altura_cm  <= f2.altura_max)
    ORDER BY f2.quantidade_minima DESC, f2.largura_min DESC NULLS LAST
    LIMIT 1;
  ELSE
    SELECT INTO v_preco_base, v_faixa_info
      f.preco_unitario,
      jsonb_build_object(
        'faixa_id', f.id, 'preco', f.preco_unitario, 'prazo_dias', f.prazo_dias,
        'qtd_min', f.quantidade_minima, 'qtd_max', f.quantidade_maxima
      )
    FROM tabela_preco_gravacao_oficial_faixa f
    WHERE f.tabela_preco_gravacao_id = v_tabela_id
      AND p_quantidade BETWEEN f.quantidade_minima AND COALESCE(f.quantidade_maxima, 999999)
      AND f.largura_min IS NULL
    ORDER BY f.quantidade_minima DESC
    LIMIT 1;

    -- Fallback: usar faixa máxima se quantidade excede todas
    IF v_preco_base IS NULL THEN
      SELECT INTO v_preco_base, v_faixa_info
        f.preco_unitario,
        jsonb_build_object(
          'faixa_id', f.id, 'preco', f.preco_unitario, 'prazo_dias', f.prazo_dias,
          'qtd_min', f.quantidade_minima, 'qtd_max', f.quantidade_maxima
        )
      FROM tabela_preco_gravacao_oficial_faixa f
      WHERE f.tabela_preco_gravacao_id = v_tabela_id AND f.largura_min IS NULL
      ORDER BY f.quantidade_minima DESC LIMIT 1;
    END IF;
  END IF;

  IF v_preco_base IS NULL THEN
    RETURN jsonb_build_object('success',false,'error',
      'Nenhuma faixa de preço encontrada para os parâmetros informados',
      'codigo_tabela', v_codigo_tabela, 'quantidade', p_quantidade);
  END IF;

  -- Passo 6: Multiplicador de cor
  v_mult_cor := 1.0;
  IF v_cobra_por_cor AND p_num_cores > 1 THEN
    IF    p_num_cores = 2 THEN v_mult_cor := 1.0 + (1.0 - v_desconto_2cor/100.0);
    ELSIF p_num_cores = 3 THEN v_mult_cor := 1.0 + (1.0 - v_desconto_2cor/100.0) + (1.0 - v_desconto_3cor/100.0);
    ELSE                        v_mult_cor := 1.0 + (p_num_cores-1) * (1.0 - v_desconto_4cor/100.0);
    END IF;
  END IF;

  -- Passo 7: Custo unitário com cor
  v_preco_base := v_preco_base * v_mult_cor;

  -- Passo 8: Setup
  v_setup_total := CASE
    WHEN v_custo_setup_por_cor THEN v_custo_setup * p_num_cores
    ELSE v_custo_setup
  END;

  -- Passo 9: Manuseio (NOVO: por peça ou fixo)
  DECLARE v_custo_manuseio_total NUMERIC;
  BEGIN
    v_custo_manuseio_total := CASE
      WHEN v_custo_manuseio_por_peca THEN v_custo_manuseio * p_quantidade
      ELSE v_custo_manuseio
    END;
  END;

  -- Passo 10: Markup
  v_markup_pct := COALESCE(v_markup_pct, 115);
  DECLARE v_mult_markup NUMERIC := 1.0 + v_markup_pct / 100.0;
  BEGIN
    v_setup_total_markup := v_setup_total * v_mult_markup;
    v_valor_gravacao      := v_preco_base * p_quantidade;
    v_preco_venda         := GREATEST(v_preco_base * v_mult_markup, v_preco_min_unit);
    v_total_cobrado       := v_preco_venda * p_quantidade;
  END;

  -- Passo 11: Aplicar faturamento mínimo (NOVO — usa faturamento_minimo se definido)
  DECLARE v_fat_min NUMERIC;
  BEGIN
    v_fat_min := COALESCE(v_faturamento_min, v_setup_total_markup, 0);
    v_regra_ativada := 'natural';

    IF v_total_cobrado < v_fat_min AND v_fat_min > 0 THEN
      -- Pico anterior para referência
      SELECT INTO v_pico_anterior
        GREATEST(
          (SELECT COALESCE(MAX((fn_get_customization_price(
            p_area_id, f.quantidade_maxima, p_num_cores,
            p_largura_cm, p_altura_cm, p_num_pontos
          ))->>'preco_unitario')::numeric, 0)
          FROM tabela_preco_gravacao_oficial_faixa f
          WHERE f.tabela_preco_gravacao_id = v_tabela_id
            AND f.quantidade_maxima < p_quantidade
            AND f.largura_min IS NULL
          LIMIT 1), 0);
      v_total_cobrado := v_fat_min;
      v_regra_ativada := 'faturamento_minimo';
    END IF;
  END;

  -- Retorno final
  RETURN jsonb_build_object(
    'success',          true,
    'tabela',           v_codigo_tabela,
    'nome_tabela',      v_nome_tabela,
    'grupo_tecnica',    v_grupo_tecnica,
    'quantidade',       p_quantidade,
    'num_cores',        p_num_cores,
    'preco_unitario',   ROUND(v_preco_venda, 4),
    'preco_por_unidade',ROUND(v_preco_venda, 4),
    'valor_gravacao',   ROUND(v_total_cobrado, 2),
    'setup_total',      ROUND(v_setup_total_markup, 2),
    'total_cobrado',    ROUND(v_total_cobrado, 2),
    'faixa',            v_faixa_info,
    'regra_ativada',    v_regra_ativada,
    'pico_anterior',    ROUND(COALESCE(v_pico_anterior, 0), 2),
    'bugfix_version',   '2026-06-23-v2',
    'detalhes', jsonb_build_object(
      'is_curved',          v_is_curved,
      'cobra_por_cor',      v_cobra_por_cor,
      'max_cores',          v_max_cores,
      'desconto_2cor',      v_desconto_2cor,
      'desconto_3cor',      v_desconto_3cor,
      'desconto_4cor',      v_desconto_4cor,
      'mult_cor',           v_mult_cor,
      'cobra_aplicacao',    v_cobra_aplicacao,
      'cobra_queima_forno', v_cobra_queima,
      'cobra_termo',        v_cobra_termo
    ),
    'markup', jsonb_build_object(
      'markup_pct',        v_markup_pct,
      'preco_min_unit',    v_preco_min_unit,
      'custo_unitario',    ROUND(v_preco_base, 4),
      'custo_setup_tabela',v_setup_total
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_customization_price(
  uuid, integer, integer, numeric, numeric, integer
) TO authenticated;
;
