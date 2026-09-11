
CREATE OR REPLACE FUNCTION fn_sm_populate_colors()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total  int;
  org_id   CONSTANT uuid := '5db5aee1-064b-4ef4-9193-345dcd8274ea';
  sup_id   CONSTANT uuid := '841cd690-210a-422a-908c-7676828db272';
BEGIN
  WITH similares AS (
    SELECT
      unnest(string_to_array(
        trim(both ';' from raw_data->>'produtos_similares'), ';'
      )) AS bloco
    FROM supplier_products_raw
    WHERE supplier_id = sup_id
      AND source_channel = 'api_rest'
      AND raw_data->>'produtos_similares' IS NOT NULL
  ),
  parsed AS (
    SELECT
      upper(trim(split_part(bloco,'|',2))) AS hex,
      trim(split_part(bloco,'|',5))        AS titulo
    FROM similares
    WHERE bloco LIKE '%|%' AND split_part(bloco,'|',2) LIKE '#%'
  ),
  repr AS (
    SELECT DISTINCT ON (hex) hex, titulo
    FROM (SELECT hex, titulo, COUNT(*) AS n FROM parsed GROUP BY hex, titulo) t
    ORDER BY hex, n DESC
  ),
  cores AS (
    SELECT hex, titulo,
      COALESCE(
        -- 1) Padrão "- COR -" ou "- COR" no final
        upper(trim((regexp_match(titulo,
          E'- ([A-ZÁÂÃÀÉÊÍÓÔÕÚÜ][A-ZÁÂÃÀÉÊÍÓÔÕÚÜ/]{1,25})(?:\\s*-\\s*(?:\\d|\\d+\\s*PÇS|\\d+\\s*ML)|$)',
          'i'))[1])),
        -- 2) Lista de cores conhecidas no título (busca a ÚLTIMA ocorrência)
        upper(trim((regexp_match(titulo,
          E'\\b(PRETO|PRETA|BRANCO|BRANCA|AZUL|VERDE|VERMELHO|VERMELHA|AMARELO|AMARELA|LARANJA|ROSA|CINZA|BEGE|MARROM|DOURADO|DOURADA|PRATA|PRATEADO|TRANSPARENTE|CARAMELO|VINHO|TURQUESA|TERRACOTA|GRAFITE|NUDE|AREIA|AMADEIRADO|AMADEIRADA|NATURAL|OURO|BORDO|LILÁS|ROXO|ROXA|CREME)(?:\\s*[/\\\\]\\s*[A-ZÁÂÃÀÉÊÍÓÔÕÚÜ]+)?',
          'i'))[1])),
        -- 3) Fallback: usa o HEX
        hex
      ) AS cor_nome
    FROM repr
  )
  INSERT INTO supplier_colors (
    organization_id, supplier_id,
    name, code, hex_code, api_color_id, api_description,
    api_raw_data, source, is_active, is_available
  )
  SELECT
    org_id, sup_id,
    hex, hex, hex, hex,
    trim(left(cor_nome, 40)),
    jsonb_build_object('hex', hex, 'titulo_origem', titulo, 'cor_extraida', trim(left(cor_nome,40))),
    'api_rest', true, true
  FROM cores
  ON CONFLICT (organization_id, supplier_id, name)
  DO UPDATE SET
    hex_code        = EXCLUDED.hex_code,
    api_description = EXCLUDED.api_description,
    api_raw_data    = EXCLUDED.api_raw_data,
    updated_at      = NOW();

  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN jsonb_build_object('status','ok','colors_upserted',v_total,'supplier','SO_MARCAS');
END;
$$;

-- Re-executar com regex melhorado
SELECT fn_sm_populate_colors();
;
