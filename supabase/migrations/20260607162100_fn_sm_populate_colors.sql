
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
  /*
    Extrai cores únicas do campo produtos_similares (Bronze SM).
    Formato de cada entrada: "codigo|#HEX|id|imagem|titulo"
    Estratégia:
      - name      = HEX normalizado (unique por supplier)
      - hex_code  = HEX
      - code      = HEX
      - api_color_id = HEX
      - api_description = nome de cor extraído do título (ex: AZUL, PRETO, VERDE)
  */
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
    WHERE bloco LIKE '%|%'
      AND split_part(bloco,'|',2) LIKE '#%'
  ),
  -- Para cada HEX único, escolhe o título mais frequente como representante
  repr AS (
    SELECT DISTINCT ON (hex) hex, titulo
    FROM (
      SELECT hex, titulo, COUNT(*) AS n
      FROM parsed
      GROUP BY hex, titulo
    ) t
    ORDER BY hex, n DESC
  ),
  -- Extrai nome de cor do título usando padrões conhecidos
  cores AS (
    SELECT
      hex, titulo,
      COALESCE(
        -- 1) Captura cor após " - " quando seguida de fim ou dimensão
        upper(
          (regexp_match(
            titulo,
            E'- ([A-ZÁÂÃÀÉÊÍÓÔÕÚÜ][A-ZÁÂÃÀÉÊÍÓÔÕÚÜ/ ]{1,30})(?:\\s*-\\s*\\d|$)',
            'i'
          ))[1]
        ),
        -- 2) Última palavra antes de dimensão (ex: "PRETA - 350ML")
        upper(
          (regexp_match(
            titulo,
            E'([A-ZÁÂÃÀÉÊÍÓÔÕÚÜ]+)\\s*-\\s*\\d',
            'i'
          ))[1]
        ),
        -- 3) Fallback: usa o próprio HEX como descrição
        hex
      ) AS cor_nome_raw
    FROM repr
  ),
  final AS (
    SELECT
      hex,
      titulo,
      -- Limpa espaços e limita a 40 chars
      trim(left(cor_nome_raw, 40)) AS cor_nome
    FROM cores
  )
  INSERT INTO supplier_colors (
    organization_id,
    supplier_id,
    name,           -- HEX como chave única
    code,           -- HEX
    hex_code,       -- HEX
    api_color_id,   -- HEX (identificador SM)
    api_description,-- nome de cor extraído do título
    api_raw_data,   -- payload completo para auditoria
    source,
    is_active,
    is_available
  )
  SELECT
    org_id,
    sup_id,
    f.hex,
    f.hex,
    f.hex,
    f.hex,
    f.cor_nome,
    jsonb_build_object(
      'hex',           f.hex,
      'titulo_origem', f.titulo,
      'cor_extraida',  f.cor_nome
    ),
    'api_rest',
    true,
    true
  FROM final f
  ON CONFLICT (organization_id, supplier_id, name)
  DO UPDATE SET
    hex_code        = EXCLUDED.hex_code,
    api_description = EXCLUDED.api_description,
    api_raw_data    = EXCLUDED.api_raw_data,
    updated_at      = NOW();

  GET DIAGNOSTICS v_total = ROW_COUNT;

  RETURN jsonb_build_object(
    'status',           'ok',
    'colors_upserted',  v_total,
    'supplier',         'SO_MARCAS',
    'supplier_id',      sup_id::text
  );
END;
$$;
;
