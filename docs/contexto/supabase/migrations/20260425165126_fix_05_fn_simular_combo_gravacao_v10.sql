CREATE OR REPLACE FUNCTION public.fn_simular_combo_gravacao_v10(aplicacoes jsonb)
RETURNS TABLE(
  app_ordem integer, product_id uuid, tecnica_codigo text,
  arte text, cores text, qty integer, location_code text,
  custo_natural numeric, fatmin_aplicado numeric, custo_final numeric,
  regra_ativada text, venda_aplicacao numeric
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
  apps_enriched AS (
    SELECT 
      i.app_ord, i.lado, i.tec_cod, i.l, i.a, i.c, i.q, i.prod_id,
      t.id AS tab_id, t.grupo_tecnica,
      (pat.id IS NOT NULL) AS produto_aceita_tecnica,
      pat.max_width, pat.max_height,
      CASE 
        WHEN pat.id IS NULL THEN false
        WHEN i.l = 0 OR i.a = 0 THEN true
        ELSE (i.l <= pat.max_width AND i.a <= pat.max_height)
      END AS dimensao_valida,
      (pat.id IS NOT NULL) AS lado_valido,
      (
        SELECT COUNT(DISTINCT location_code) > 1
        FROM print_area_techniques pat2
        WHERE pat2.product_id = i.prod_id 
          AND pat2.tabela_preco_id = t.id
          AND pat2.is_active = true
      ) AS aceita_multi_lado
    FROM input i
    JOIN tabela_preco_gravacao_oficial t ON t.codigo_tabela = i.tec_cod
    LEFT JOIN print_area_techniques pat 
      ON pat.product_id = i.prod_id 
      AND pat.tabela_preco_id = t.id 
      AND pat.location_code = i.lado
      AND pat.is_active = true
  ),
  validacao AS (
    SELECT 
      EXISTS(SELECT 1 FROM apps_enriched WHERE grupo_tecnica = 'SUBLIMACAO') AS tem_subl,
      EXISTS(SELECT 1 FROM apps_enriched WHERE grupo_tecnica IN ('SERIGRAFIA','TRANSFER_DIGITAL')) AS tem_outro_grupo,
      (SELECT COUNT(*) FROM apps_enriched WHERE grupo_tecnica = 'SUBLIMACAO') AS n_apps_subl,
      EXISTS(SELECT 1 FROM apps_enriched WHERE grupo_tecnica = 'SUBLIMACAO' AND aceita_multi_lado = false) AS tem_subl_exclusiva_abs,
      (SELECT COUNT(DISTINCT lado) FROM apps_enriched 
         WHERE grupo_tecnica = 'SUBLIMACAO' AND aceita_multi_lado = true) AS n_lados_subl_multi,
      (SELECT COUNT(*) FROM apps_enriched 
         WHERE grupo_tecnica = 'SUBLIMACAO' AND aceita_multi_lado = true) AS n_apps_subl_multi,
      NOT EXISTS(SELECT 1 FROM apps_enriched WHERE produto_aceita_tecnica = false) AS todos_produtos_aceitam,
      NOT EXISTS(SELECT 1 FROM apps_enriched WHERE lado_valido = false) AS todos_lados_validos,
      NOT EXISTS(SELECT 1 FROM apps_enriched WHERE dimensao_valida = false) AS todas_dimensoes_validas
  ),
  combo_valido AS (
    SELECT CASE
      WHEN NOT v.todos_produtos_aceitam THEN false
      WHEN NOT v.todos_lados_validos THEN false
      WHEN NOT v.todas_dimensoes_validas THEN false
      WHEN v.tem_subl AND v.tem_outro_grupo THEN false
      WHEN v.tem_subl_exclusiva_abs AND v.n_apps_subl > 1 THEN false
      WHEN v.n_apps_subl_multi > 4 THEN false
      WHEN v.n_apps_subl_multi > v.n_lados_subl_multi THEN false
      ELSE true
    END AS ok
    FROM validacao v
  ),
  resolved AS (
    SELECT 
      i.app_ord, i.tec_cod, i.l, i.a, i.c, i.q, i.lado, i.prod_id,
      t.id AS tab_id, t.grupo_tecnica,
      t.custo_setup, t.custo_setup_por_cor,
      t.custo_aplicacao, t.markup_percent, t.max_cores,
      f.preco_unitario, f.ordem AS faixa_ordem,
      -- Multiplicador cor: prioriza JSONB, fallback para 1.0
      COALESCE(
        (t.opcoes_modificadores->'multiplicador_cor'->>i.c::text)::numeric,
        1.0
      ) AS mult_cor,
      -- Fatmin unificado (aceita qualquer um dos campos JSONB)
      COALESCE(
        (t.opcoes_modificadores->>'faturamento_minimo_custo')::numeric,
        (t.opcoes_modificadores->>'faturamento_minimo_base')::numeric,
        0
      ) AS fatmin,
      CASE WHEN t.custo_setup_por_cor THEN t.custo_setup * i.c
           ELSE t.custo_setup END AS setup_total,
      COALESCE((t.opcoes_modificadores->>'adicional_fotolito_por_cor')::numeric, 0) AS foto_a3
    FROM input i
    JOIN tabela_preco_gravacao_oficial t ON t.codigo_tabela = i.tec_cod
    JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
    JOIN combo_valido cv ON cv.ok = true
    WHERE t.ativo = true
      AND i.q BETWEEN f.quantidade_minima AND COALESCE(f.quantidade_maxima, 2147483647)
      AND i.c BETWEEN 1 AND t.max_cores
      AND (
        t.usa_faixa_dimensional = false 
        OR (
          (f.largura_min IS NULL OR i.l = 0 OR i.l BETWEEN f.largura_min AND f.largura_max)
          AND (f.altura_min IS NULL OR i.a = 0 OR i.a BETWEEN f.altura_min AND f.altura_max)
        )
      )
  ),
  -- Pico anterior universal (cobre TODOS os grupos)
  pico_anterior AS (
    SELECT r.app_ord,
      MAX(
        CASE 
          WHEN r.grupo_tecnica = 'SERIGRAFIA' THEN
            r.setup_total + fa.quantidade_maxima * fa.preco_unitario * r.mult_cor
            + r.foto_a3 * r.c
          WHEN r.grupo_tecnica = 'TAMPOGRAFIA' THEN
            r.setup_total + fa.quantidade_maxima * fa.preco_unitario * r.mult_cor
          WHEN r.grupo_tecnica = 'SUBLIMACAO' THEN
            fa.quantidade_maxima * (fa.preco_unitario + r.custo_aplicacao)
          WHEN r.grupo_tecnica IN ('LASER','LASER_CO2','UV_DIGITAL') THEN
            r.setup_total + fa.quantidade_maxima * fa.preco_unitario
          WHEN r.grupo_tecnica = 'BORDADO' THEN
            fa.quantidade_maxima * fa.preco_unitario
          ELSE 0
        END
      ) AS pico
    FROM resolved r
    JOIN tabela_preco_gravacao_oficial_faixa fa
      ON fa.tabela_preco_gravacao_id = r.tab_id
      AND fa.quantidade_maxima IS NOT NULL
      AND fa.quantidade_maxima < r.q
    GROUP BY r.app_ord
  ),
  calc AS (
    SELECT 
      r.*, COALESCE(pa.pico, 0) AS pico_anterior_v,
      CASE 
        WHEN r.grupo_tecnica = 'SERIGRAFIA' THEN
          r.setup_total + r.q * r.preco_unitario * r.mult_cor + r.foto_a3 * r.c
        WHEN r.grupo_tecnica = 'TAMPOGRAFIA' THEN
          r.setup_total + r.q * r.preco_unitario * r.mult_cor
        WHEN r.grupo_tecnica = 'TRANSFER_DIGITAL' THEN
          r.q * ((r.l * r.a / 10000.0) * r.preco_unitario + r.custo_aplicacao)
        WHEN r.grupo_tecnica = 'SUBLIMACAO' THEN
          r.q * (r.preco_unitario + r.custo_aplicacao)
        WHEN r.grupo_tecnica IN ('LASER','LASER_CO2','UV_DIGITAL') THEN
          r.setup_total + r.q * r.preco_unitario
        WHEN r.grupo_tecnica = 'BORDADO' THEN
          r.q * r.preco_unitario
        ELSE 0
      END AS nat
    FROM resolved r
    LEFT JOIN pico_anterior pa ON pa.app_ord = r.app_ord
  )
  SELECT 
    app_ord AS app_ordem,
    prod_id AS product_id,
    tec_cod AS tecnica_codigo,
    CASE WHEN l > 0 AND a > 0 THEN l || 'x' || a || ' cm' ELSE '-' END AS arte,
    CASE WHEN grupo_tecnica IN ('SERIGRAFIA','TAMPOGRAFIA') THEN c::text || ' cor'
         ELSE 'full color' END AS cores,
    q AS qty,
    lado AS location_code,
    ROUND(nat::numeric, 2) AS custo_natural,
    ROUND(fatmin::numeric, 2) AS fatmin_aplicado,
    ROUND(GREATEST(nat, pico_anterior_v, fatmin)::numeric, 2) AS custo_final,
    CASE 
      WHEN GREATEST(nat, pico_anterior_v) < fatmin THEN 'FATMIN'
      WHEN pico_anterior_v > nat THEN 'ANTI_PARADOXO'
      ELSE 'natural'
    END AS regra_ativada,
    ROUND(
      (GREATEST(nat, pico_anterior_v, fatmin) * (1 + markup_percent/100))::numeric, 2
    ) AS venda_aplicacao
  FROM calc
  ORDER BY app_ord;
$function$;

COMMENT ON FUNCTION public.fn_simular_combo_gravacao_v10 IS
'V10 (2026-04-25): cobre TODOS os 8 grupos técnicos com regra MAX_ENTRE_FAIXAS universal. Substitui v9 que só cobria 3 grupos. Manter v9 disponível para rollback.';
