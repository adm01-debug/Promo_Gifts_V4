-- GAP #3: Wrapper pra v12 tratar kits
-- Aceita aplicações com kit_product_id + kit_component_id + location_code
-- Internamente: valida em kit_component_print_areas, monta payload "tipo produto unitário"
--   usando product_id = kit_product_id (necessário pra v12 não falhar) e chama v12.
-- v12 precisa de print_area_techniques pra validar produto x técnica. 
-- Solução: criar VIEW unificada e fazer v12 ler dela? NÃO toca v12 (handoff).
-- Solução real: o wrapper FAZ a validação ele mesmo (kit_component_print_areas)
--   e monta o resultado SEM chamar v12 (replicando a lógica de preço relevante).
-- Pra MANTER coerência com v12, vamos chamar v12 com tabela_preco_id direto via
--   workaround: criar print_area_techniques temporária? Não, suja banco.
-- Decisão: o wrapper faz cálculo PRÓPRIO mas IDENTICO ao da v12.

CREATE OR REPLACE FUNCTION fn_simular_combo_gravacao_kit_v1(aplicacoes jsonb)
RETURNS TABLE(
  app_ordem integer,
  kit_product_id uuid,
  kit_component_id uuid,
  componente_nome text,
  tecnica_codigo text,
  tabela_codigo text,
  arte text,
  cores text,
  qty integer,
  location_code text,
  largura_cm numeric,
  altura_cm numeric,
  preco_unit_faixa numeric,
  custo_natural numeric,
  piso_setup numeric,
  custo_final numeric,
  preco_unit_efetivo numeric,
  regra_ativada text,
  motivo_erro text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH input AS (
    SELECT 
      ord::int AS app_ord,
      ((app->>'kit_product_id')::uuid) AS kit_prod_id,
      ((app->>'kit_component_id')::uuid) AS kit_comp_id,
      UPPER(COALESCE(app->>'location_code', 'LADO-A')) AS lado,
      (app->>'tecnica_codigo')::text AS tec_cod,  -- codigo_tabela
      COALESCE((app->>'largura')::numeric, COALESCE((app->>'largura_cm')::numeric, 0)) AS l,
      COALESCE((app->>'altura')::numeric, COALESCE((app->>'altura_cm')::numeric, 0)) AS a,
      COALESCE((app->>'cores')::int, 1) AS c,
      (app->>'qty')::int AS q,
      COALESCE(app->>'arte', '-') AS arte_t
    FROM jsonb_array_elements(aplicacoes) WITH ORDINALITY arr(app, ord)
  ),
  diag AS (
    SELECT 
      i.*,
      pkc.component_name AS comp_nome,
      kcpa.id AS print_area_id, kcpa.max_width, kcpa.max_height,
      t.id AS tab_id, t.codigo_tabela AS tab_cod,
      t.custo_setup, t.custo_setup_por_cor, t.markup_percent,
      t.cobra_por_cor, t.max_cores, t.ativo,
      f.preco_unitario, f.id AS faixa_id,
      CASE
        WHEN i.q IS NULL OR i.q <= 0 THEN 'ERRO_QTY_INVALIDA'
        WHEN i.c IS NULL OR i.c <= 0 THEN 'ERRO_CORES_INVALIDA'
        WHEN pkc.id IS NULL THEN 'ERRO_KIT_COMPONENT_INEXISTENTE'
        WHEN t.id IS NULL THEN 'ERRO_TECNICA_INEXISTENTE'
        WHEN NOT t.ativo THEN 'ERRO_TECNICA_INATIVA'
        WHEN i.c > t.max_cores THEN 'ERRO_CORES_EXCEDE_MAX'
        WHEN kcpa.id IS NULL THEN 'ERRO_KIT_COMPONENT_NAO_ACEITA_TECNICA'
        WHEN i.l > 0 AND i.l > kcpa.max_width::numeric THEN 'ERRO_LARGURA_EXCEDE_AREA'
        WHEN i.a > 0 AND i.a > kcpa.max_height::numeric THEN 'ERRO_ALTURA_EXCEDE_AREA'
        WHEN f.id IS NULL THEN 'ERRO_FAIXA_NAO_ENCONTRADA'
        ELSE NULL
      END AS motivo
    FROM input i
    LEFT JOIN product_kit_components pkc ON pkc.id = i.kit_comp_id
    LEFT JOIN tabela_preco_gravacao_oficial t ON t.codigo_tabela = i.tec_cod
    LEFT JOIN kit_component_print_areas kcpa ON kcpa.kit_component_id = i.kit_comp_id
      AND kcpa.tabela_preco_id = t.id
      AND kcpa.location_code = i.lado
      AND kcpa.is_active = true
    LEFT JOIN tabela_preco_gravacao_oficial_faixa f ON f.tabela_preco_gravacao_id = t.id
      AND i.q BETWEEN f.quantidade_minima AND COALESCE(f.quantidade_maxima, 999999999)
      AND (
        t.usa_faixa_dimensional = false 
        OR (
          (f.largura_min IS NULL OR i.l = 0 OR i.l BETWEEN f.largura_min::numeric AND f.largura_max::numeric)
          AND (f.altura_min IS NULL OR i.a = 0 OR i.a BETWEEN f.altura_min::numeric AND f.altura_max::numeric)
        )
      )
  ),
  calc AS (
    SELECT 
      d.*,
      -- Setup como piso (UNIF-01)
      CASE WHEN d.custo_setup_por_cor THEN d.custo_setup * d.c ELSE d.custo_setup END AS piso_setup_v,
      -- Cálculo natural (sem somar setup): qty * preco
      (d.q * d.preco_unitario) AS natural_v
    FROM diag d
    WHERE d.motivo IS NULL
  ),
  resultado AS (
    SELECT 
      d.app_ord, d.kit_prod_id, d.kit_comp_id, d.comp_nome, d.tec_cod, d.tab_cod,
      d.arte_t, d.c::text || ' cor' AS cores_t, d.q, d.lado, d.l, d.a,
      d.preco_unitario,
      -- natural
      ROUND(c.natural_v::numeric, 2) AS custo_nat,
      -- piso
      d.custo_setup AS piso,
      -- final = MAX(piso, natural)
      ROUND(GREATEST(c.natural_v::numeric, c.piso_setup_v::numeric), 2) AS custo_fin,
      -- preço unit efetivo
      ROUND((GREATEST(c.natural_v::numeric, c.piso_setup_v::numeric) / d.q)::numeric, 4) AS preco_efet,
      -- regra
      CASE 
        WHEN d.motivo IS NOT NULL THEN d.motivo
        WHEN c.natural_v >= c.piso_setup_v THEN 'NATURAL_ACEITO'
        ELSE 'PISO_SETUP_APLICADO'
      END AS regra,
      d.motivo
    FROM diag d
    LEFT JOIN calc c ON c.app_ord = d.app_ord
  )
  SELECT 
    app_ord, kit_prod_id, kit_comp_id, comp_nome, tec_cod, tab_cod,
    arte_t, cores_t, q, lado, l, a,
    preco_unitario, custo_nat, piso, custo_fin, preco_efet, regra, motivo
  FROM resultado
  ORDER BY app_ord;
$$;

COMMENT ON FUNCTION fn_simular_combo_gravacao_kit_v1(jsonb) IS
  'GAP #3 (auditoria 2026-04-29): wrapper que estende fn_simular_combo_gravacao_v12 para tratar kits.
   Lê de kit_component_print_areas (não print_area_techniques).
   Aplica MESMA lógica da v12: setup como piso (UNIF-01), MAX(piso, natural).
   Input: jsonb array de aplicações { kit_product_id, kit_component_id, tecnica_codigo, location_code, qty, largura, altura, cores }.';
