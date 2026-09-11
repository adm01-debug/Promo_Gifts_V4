
-- ================================================================
-- FIX-GAP-01: fn_get_product_customization_options
-- Adicionar min_width/min_height derivados das faixas dimensionais.
-- Frontend precisa desses valores para validar dimensões ANTES de cotar.
-- Sem isso, técnicas como SERITEX-CAM-A3-01 (min 19cm) aceitam 5cm
-- no frontend mas falham na cotação → UX quebrado.
-- ================================================================
CREATE OR REPLACE FUNCTION public.fn_get_product_customization_options(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'product_id', p_product_id,
    'locations', COALESCE(jsonb_agg(loc_data ORDER BY loc_order), '[]'::jsonb)
  )
  INTO v_result
  FROM (
    SELECT
      pat.location_code,
      pat.location_name,
      pat.location_order AS loc_order,
      jsonb_build_object(
        'location_code',  pat.location_code,
        'location_name',  pat.location_name,
        'location_order', pat.location_order,
        'options', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'technique_id',       p2.id,
              'grupo_tecnica',      t.grupo_tecnica,
              'tecnica_nome',       t.nome,
              'variacao_label',     t.nome,
              'codigo_tabela',      t.codigo_tabela,
              'cobra_por_cor',      t.cobra_por_cor,
              'max_cores',          COALESCE(t.max_cores, 1),
              'custo_setup',        COALESCE(t.custo_setup, 0),
              'max_width',          p2.max_width,
              'max_height',         p2.max_height,
              'gravacao_largura_max', p2.max_width,
              'gravacao_altura_max',  p2.max_height,
              'is_curved',          p2.is_curved,
              'shape',              p2.shape,
              'usa_dimensao',       COALESCE(t.usa_faixa_dimensional, false),
              'efetiva_largura_max', p2.max_width,
              'efetiva_altura_max',  p2.max_height,
              -- NOVO: dimensões mínimas das faixas (crítico para validação frontend)
              'min_width', (
                SELECT MIN(f.largura_min)
                FROM tabela_preco_gravacao_oficial_faixa f
                WHERE f.tabela_preco_gravacao_id = t.id
                  AND f.largura_min IS NOT NULL
              ),
              'min_height', (
                SELECT MIN(f.altura_min)
                FROM tabela_preco_gravacao_oficial_faixa f
                WHERE f.tabela_preco_gravacao_id = t.id
                  AND f.altura_min IS NOT NULL
              ),
              -- NOVO: markup e preço mínimo para estimativa frontend
              'markup_percent',        COALESCE(t.markup_percent, 115),
              'preco_minimo_unitario', COALESCE(t.preco_minimo_unitario, 0)
            )
          ORDER BY t.grupo_tecnica, t.codigo_tabela), '[]'::jsonb)
          FROM print_area_techniques p2
          JOIN tabela_preco_gravacao_oficial t ON t.id = p2.tabela_preco_id
          WHERE p2.product_id = p_product_id
            AND p2.location_code = pat.location_code
            AND p2.is_active = true
            AND t.ativo = true
        )
      ) AS loc_data
    FROM (
      SELECT DISTINCT location_code, location_name, location_order
      FROM print_area_techniques
      WHERE product_id = p_product_id AND is_active = true
    ) pat
    ORDER BY pat.location_order
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_product_customization_options(uuid)
  TO authenticated, anon;
;
