CREATE OR REPLACE FUNCTION public.fn_recomendar_tecnica(p_categoria text DEFAULT NULL::text, p_n_cores integer DEFAULT 1, p_complexidade_arte text DEFAULT 'simples'::text, p_material text DEFAULT NULL::text, p_qty integer DEFAULT 100)
 RETURNS TABLE(rank integer, codigo_tabela character varying, nome character varying, grupo_tecnica character varying, motivo text, alerta text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT 
      t.codigo_tabela,
      t.nome,
      t.grupo_tecnica,
      t.cobra_por_cor,
      t.max_cores,
      t.opcoes_modificadores->'materiais_aplicaveis' AS materiais,
      -- Score baseado em compatibilidade
      CASE 
        -- Se cliente quer arte complexa/fotorrealista, priorizar full-color
        WHEN p_complexidade_arte = 'complexa' AND t.grupo_tecnica IN ('TRANSFER_DIGITAL','UV_DIGITAL','SUBLIMACAO') THEN 100
        WHEN p_complexidade_arte = 'complexa' AND t.cobra_por_cor THEN 30  -- silk/tampo limitam cores
        -- Se cliente quer 1 cor simples, priorizar técnicas eficientes
        WHEN p_n_cores = 1 AND t.grupo_tecnica IN ('SERIGRAFIA','TAMPOGRAFIA','LASER','LASER_CO2') THEN 100
        WHEN p_n_cores = 1 AND t.grupo_tecnica IN ('TRANSFER_DIGITAL','UV_DIGITAL','SUBLIMACAO') THEN 40
        -- Se cliente quer 2-3 cores chapadas, silk/tampo dominam
        WHEN p_n_cores BETWEEN 2 AND 3 AND t.cobra_por_cor THEN 90
        WHEN p_n_cores BETWEEN 2 AND 3 AND NOT t.cobra_por_cor THEN 60
        -- Se cliente quer 4+ cores, full-color dominante
        WHEN p_n_cores >= 4 AND NOT t.cobra_por_cor THEN 100
        WHEN p_n_cores >= 4 AND t.cobra_por_cor AND p_n_cores <= t.max_cores THEN 50
        ELSE 50
      END AS score_cores,
      -- Compatibilidade categoria via codigo_tabela
      CASE
        WHEN p_categoria = 'caneta' AND t.codigo_tabela ~ '(-CN-|-MCN-)' THEN 100
        WHEN p_categoria = 'sacochila' AND t.codigo_tabela LIKE '%-SAC-%' THEN 100
        WHEN p_categoria = 'camiseta' AND t.codigo_tabela LIKE '%-CAM-%' THEN 100
        WHEN p_categoria = 'mochila' AND t.codigo_tabela LIKE '%-MOC-%' THEN 100
        WHEN p_categoria = 'sacola' AND t.codigo_tabela LIKE '%-SAE-%' THEN 100
        WHEN p_categoria = 'cilindrico' AND t.codigo_tabela LIKE '%-CIL-%' THEN 100
        WHEN p_categoria = 'plano' AND t.codigo_tabela LIKE '%-PL-%' THEN 100
        WHEN p_categoria IS NULL THEN 50  -- sem filtro
        ELSE 0
      END AS score_categoria,
      -- Compatibilidade de material
      CASE
        WHEN p_material IS NULL THEN 50
        WHEN t.opcoes_modificadores->'materiais_aplicaveis' ? p_material THEN 100
        WHEN p_material = 'sublimatica' AND t.grupo_tecnica = 'SUBLIMACAO' THEN 100
        WHEN p_material = 'metal' AND t.codigo_tabela ~ 'M(CN|T|OC)' THEN 100
        WHEN p_material = 'plastico' AND t.codigo_tabela ~ '(PL|CN-01)' THEN 100
        ELSE 30
      END AS score_material,
      -- Excluir sublimação se material não for sublimática
      CASE
        WHEN t.grupo_tecnica = 'SUBLIMACAO' AND p_material IS NOT NULL 
             AND p_material NOT IN ('sublimatica','poliester','microfibra','dryfit') THEN 0
        ELSE 1
      END AS aplicavel,
      -- Mensagem
      CASE
        WHEN t.grupo_tecnica = 'SERIGRAFIA' AND p_n_cores = 1 THEN 'Imbativel para 1 cor chapada em volume.'
        WHEN t.grupo_tecnica = 'TAMPOGRAFIA' AND p_n_cores BETWEEN 1 AND 3 THEN 'Ideal para superficies pequenas/curvas com poucas cores.'
        WHEN t.grupo_tecnica = 'TRANSFER_DIGITAL' AND p_complexidade_arte = 'complexa' THEN 'Full color CMYK - perfeito para artes complexas.'
        WHEN t.grupo_tecnica = 'TRANSFER_DIGITAL' AND p_n_cores = 1 THEN 'Cuidado: DTF em 1 cor pode ficar 3-4x mais caro que silk.'
        WHEN t.grupo_tecnica = 'SUBLIMACAO' THEN 'Exclusiva: nao combina com outras tecnicas na mesma peca.'
        WHEN t.grupo_tecnica = 'UV_DIGITAL' AND p_complexidade_arte = 'complexa' THEN 'Otima qualidade fotografica em superficies rigidas.'
        WHEN t.grupo_tecnica IN ('LASER','LASER_CO2') THEN 'Acabamento sofisticado, sem cor mas elegante.'
        WHEN t.grupo_tecnica = 'BORDADO' THEN 'Premium em texteis - alto valor percebido.'
        ELSE 'Tecnica disponivel para o cenario.'
      END AS mensagem,
      CASE
        WHEN t.grupo_tecnica = 'TRANSFER_DIGITAL' AND p_n_cores <= 2 THEN 'ATENCAO: silk/tampo geralmente mais economicos para poucas cores.'
        WHEN t.grupo_tecnica = 'SUBLIMACAO' THEN 'NAO COMBINA com outras tecnicas na mesma peca.'
        WHEN t.grupo_tecnica IN ('UV_DIGITAL') AND p_n_cores <= 2 THEN 'ATENCAO: tampografia normalmente mais economica para 1-2 cores.'
        ELSE NULL
      END AS alerta_msg
    FROM tabela_preco_gravacao_oficial t
    WHERE t.ativo = true
  ),
  ranked AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY (score_cores + score_categoria + score_material) DESC, codigo_tabela)::integer AS rk,
      codigo_tabela::varchar,
      nome::varchar,
      grupo_tecnica::varchar,
      mensagem::text AS motivo,
      alerta_msg::text AS alerta,
      (score_cores + score_categoria + score_material) AS total_score,
      aplicavel
    FROM base
    WHERE aplicavel = 1
  )
  SELECT rk AS rank, codigo_tabela, nome, grupo_tecnica, motivo, alerta
  FROM ranked
  WHERE total_score >= 150  -- só recomenda quando há boa aderência
  ORDER BY rk
  LIMIT 5;
$function$
