-- v11: retorna SEMPRE uma linha por aplicação, mesmo quando inválida
-- regra_ativada agora pode ter valores: natural, ANTI_PARADOXO, FATMIN, ERRO_<motivo>

CREATE OR REPLACE FUNCTION public.fn_simular_combo_gravacao_v11(aplicacoes jsonb)
RETURNS TABLE(
  app_ordem integer, product_id uuid, tecnica_codigo text,
  arte text, cores text, qty integer, location_code text,
  custo_natural numeric, fatmin_aplicado numeric, custo_final numeric,
  regra_ativada text, venda_aplicacao numeric, motivo_erro text
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH input AS (
    SELECT 
      ord::int AS app_ord,
      ((app->>'product_id')::uuid) AS prod_id,
      (app->>'tecnica_codigo')::text AS tec_cod,
      COALESCE((app->>'largura')::numeric, 0) AS l,
      COALESCE((app->>'altura')::numeric, 0) AS a,
      COALESCE((app->>'cores')::int, 1) AS c,
      (app->>'qty')::int AS q,
      UPPER(COALESCE(app->>'lado', 'LADO-A')) AS lado
    FROM jsonb_array_elements(aplicacoes) WITH ORDINALITY arr(app, ord)
  ),
  -- Diagnóstico de cada aplicação ANTES de validar combo
  diag AS (
    SELECT 
      i.*,
      t.id AS tab_id, t.grupo_tecnica, t.ativo, t.max_cores,
      pat.id AS pat_id, pat.max_width, pat.max_height,
      CASE
        WHEN i.q IS NULL OR i.q <= 0 THEN 'ERRO_QTY_INVALIDA'
        WHEN i.c IS NULL OR i.c <= 0 THEN 'ERRO_CORES_INVALIDA'
        WHEN t.id IS NULL THEN 'ERRO_TECNICA_INEXISTENTE'
        WHEN NOT t.ativo THEN 'ERRO_TECNICA_INATIVA'
        WHEN i.c > t.max_cores THEN 'ERRO_CORES_EXCEDE_MAX'
        WHEN pat.id IS NULL THEN 'ERRO_PRODUTO_NAO_ACEITA_TECNICA'
        WHEN i.l > 0 AND i.l > pat.max_width THEN 'ERRO_LARGURA_EXCEDE_AREA'
        WHEN i.a > 0 AND i.a > pat.max_height THEN 'ERRO_ALTURA_EXCEDE_AREA'
        ELSE NULL
      END AS motivo
    FROM input i
    LEFT JOIN tabela_preco_gravacao_oficial t ON t.codigo_tabela = i.tec_cod
    LEFT JOIN print_area_techniques pat ON pat.product_id = i.prod_id 
      AND pat.tabela_preco_id = t.id AND pat.location_code = i.lado AND pat.is_active = true
  ),
  -- Combo validation (subl exclusiva)
  combo_check AS (
    SELECT 
      EXISTS(SELECT 1 FROM diag WHERE grupo_tecnica = 'SUBLIMACAO' AND motivo IS NULL) AS tem_subl,
      EXISTS(SELECT 1 FROM diag WHERE grupo_tecnica IN ('SERIGRAFIA','TRANSFER_DIGITAL','TAMPOGRAFIA','LASER','LASER_CO2','UV_DIGITAL','BORDADO') AND motivo IS NULL) AS tem_outro
  ),
  diag_final AS (
    SELECT d.*,
      CASE
        WHEN d.motivo IS NOT NULL THEN d.motivo
        WHEN d.grupo_tecnica = 'SUBLIMACAO' AND cc.tem_outro THEN 'ERRO_SUBL_NAO_COMBINA_OUTRAS'
        ELSE NULL
      END AS motivo_final
    FROM diag d CROSS JOIN combo_check cc
  ),
  -- Para aplicações VÁLIDAS, calcular usando lógica da v10
  resolved AS (
    SELECT 
      d.app_ord, d.tec_cod, d.l, d.a, d.c, d.q, d.lado, d.prod_id, d.grupo_tecnica,
      t.custo_setup, t.custo_setup_por_cor, t.custo_aplicacao, t.markup_percent,
      f.preco_unitario, f.ordem AS faixa_ordem, t.id AS tab_id,
      COALESCE((t.opcoes_modificadores->'multiplicador_cor'->>d.c::text)::numeric, 1.0) AS mult_cor,
      COALESCE(
        (t.opcoes_modificadores->>'faturamento_minimo_custo')::numeric,
        (t.opcoes_modificadores->>'faturamento_minimo_base')::numeric, 0
      ) AS fatmin,
      CASE WHEN t.custo_setup_por_cor THEN t.custo_setup * d.c ELSE t.custo_setup END AS setup_total,
      COALESCE((t.opcoes_modificadores->>'adicional_fotolito_por_cor')::numeric, 0) AS foto_a3
    FROM diag_final d
    JOIN tabela_preco_gravacao_oficial t ON t.id = d.tab_id
    JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
      AND d.q BETWEEN f.quantidade_minima AND COALESCE(f.quantidade_maxima, 2147483647)
      AND (
        t.usa_faixa_dimensional = false 
        OR (
          (f.largura_min IS NULL OR d.l = 0 OR d.l BETWEEN f.largura_min AND f.largura_max)
          AND (f.altura_min IS NULL OR d.a = 0 OR d.a BETWEEN f.altura_min AND f.altura_max)
        )
      )
    WHERE d.motivo_final IS NULL
  ),
  pico_anterior AS (
    SELECT r.app_ord, MAX(
      CASE 
        WHEN r.grupo_tecnica = 'SERIGRAFIA' THEN r.setup_total + fa.quantidade_maxima * fa.preco_unitario * r.mult_cor + r.foto_a3 * r.c
        WHEN r.grupo_tecnica = 'TAMPOGRAFIA' THEN r.setup_total + fa.quantidade_maxima * fa.preco_unitario * r.mult_cor
        WHEN r.grupo_tecnica = 'SUBLIMACAO' THEN fa.quantidade_maxima * (fa.preco_unitario + r.custo_aplicacao)
        WHEN r.grupo_tecnica IN ('LASER','LASER_CO2','UV_DIGITAL') THEN r.setup_total + fa.quantidade_maxima * fa.preco_unitario
        WHEN r.grupo_tecnica = 'BORDADO' THEN fa.quantidade_maxima * fa.preco_unitario
        ELSE 0 END
    ) AS pico
    FROM resolved r
    JOIN tabela_preco_gravacao_oficial_faixa fa ON fa.tabela_preco_gravacao_id = r.tab_id
      AND fa.quantidade_maxima IS NOT NULL AND fa.quantidade_maxima < r.q
    GROUP BY r.app_ord
  ),
  -- Detectar app_ord que entrou em resolved mas não cobriu faixa (caso raríssimo)
  resolved_check AS (
    SELECT df.app_ord, df.motivo_final,
      EXISTS(SELECT 1 FROM resolved r WHERE r.app_ord = df.app_ord) AS tem_faixa
    FROM diag_final df
  ),
  calc AS (
    SELECT 
      r.app_ord, r.prod_id, r.tec_cod, r.l, r.a, r.c, r.q, r.lado,
      r.grupo_tecnica, r.markup_percent,
      COALESCE(pa.pico, 0) AS pico_anterior_v,
      r.fatmin,
      CASE 
        WHEN r.grupo_tecnica = 'SERIGRAFIA' THEN r.setup_total + r.q * r.preco_unitario * r.mult_cor + r.foto_a3 * r.c
        WHEN r.grupo_tecnica = 'TAMPOGRAFIA' THEN r.setup_total + r.q * r.preco_unitario * r.mult_cor
        WHEN r.grupo_tecnica = 'TRANSFER_DIGITAL' THEN r.q * ((r.l * r.a / 10000.0) * r.preco_unitario + r.custo_aplicacao)
        WHEN r.grupo_tecnica = 'SUBLIMACAO' THEN r.q * (r.preco_unitario + r.custo_aplicacao)
        WHEN r.grupo_tecnica IN ('LASER','LASER_CO2','UV_DIGITAL') THEN r.setup_total + r.q * r.preco_unitario
        WHEN r.grupo_tecnica = 'BORDADO' THEN r.q * r.preco_unitario
        ELSE 0 END AS nat
    FROM resolved r LEFT JOIN pico_anterior pa ON pa.app_ord = r.app_ord
  ),
  -- Output final: linha de erro OU linha calculada
  saida AS (
    SELECT df.app_ord AS app_ordem, df.prod_id AS product_id, df.tec_cod AS tecnica_codigo,
      CASE WHEN df.l > 0 AND df.a > 0 THEN df.l || 'x' || df.a || ' cm' ELSE '-' END AS arte,
      df.c::text || ' cor' AS cores, df.q AS qty, df.lado AS location_code,
      NULL::numeric AS custo_natural, NULL::numeric AS fatmin_aplicado, NULL::numeric AS custo_final,
      df.motivo_final AS regra_ativada, NULL::numeric AS venda_aplicacao,
      df.motivo_final AS motivo_erro
    FROM diag_final df 
    WHERE df.motivo_final IS NOT NULL
    
    UNION ALL
    
    SELECT app_ord, prod_id, tec_cod,
      CASE WHEN l > 0 AND a > 0 THEN l || 'x' || a || ' cm' ELSE '-' END,
      CASE WHEN grupo_tecnica IN ('SERIGRAFIA','TAMPOGRAFIA') THEN c::text || ' cor' ELSE 'full color' END,
      q, lado,
      ROUND(nat::numeric, 2),
      ROUND(fatmin::numeric, 2),
      ROUND(GREATEST(nat, pico_anterior_v, fatmin)::numeric, 2),
      CASE 
        WHEN GREATEST(nat, pico_anterior_v) < fatmin THEN 'FATMIN'
        WHEN pico_anterior_v > nat THEN 'ANTI_PARADOXO'
        ELSE 'natural' END,
      ROUND((GREATEST(nat, pico_anterior_v, fatmin) * (1 + markup_percent/100))::numeric, 2),
      NULL::text
    FROM calc
  )
  SELECT * FROM saida ORDER BY app_ordem;
$function$;

COMMENT ON FUNCTION public.fn_simular_combo_gravacao_v11 IS
'V11 (2026-04-25): retorna SEMPRE uma linha por aplicacao. Quando invalido, regra_ativada e motivo_erro indicam o motivo (ERRO_QTY_INVALIDA, ERRO_TECNICA_INATIVA, ERRO_CORES_EXCEDE_MAX, ERRO_PRODUTO_NAO_ACEITA_TECNICA, ERRO_LARGURA_EXCEDE_AREA, ERRO_SUBL_NAO_COMBINA_OUTRAS, etc). Substitui v10 quando o sistema chamador precisar de feedback explicito.';
