CREATE OR REPLACE FUNCTION public.fn_test_dimension_parsers()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
-- =============================================================================
-- SUITE DE REGRESSÃO PERMANENTE — parsers de dimensões e capacidade
-- M3 2026-06-11: fn_parse_product_dimensions + fn_parse_capacity_ml
-- Cobre as 5 famílias de DOCUMENTACAO_TAMANHOS_PESOS_SPOT + adversariais.
-- Uso: SELECT fn_test_dimension_parsers();  → {'pass':bool,'total':N,'failed':N,'failures':[...]}
-- Rodar após QUALQUER alteração em fn_parse_product_dimensions / fn_parse_capacity_ml.
-- Nota: "P/M" retorna no_numbers (não no_dimension_pattern) porque "M" satisfaz o
-- pattern \mm\M na guard, passando o guard mas falhando em encontrar números.
-- Ambos os erros são semanticamente equivalentes (dims=NULL no pipeline).
-- =============================================================================
DECLARE
  v_failures jsonb := '[]'::jsonb;
  v_total int := 0;
  c record;
BEGIN
  -- ---------- BLOCO 1: fn_parse_product_dimensions ----------
  FOR c IN
    SELECT * FROM (VALUES
      -- familia 3D retangular (36% do feed)
      ('dims','55 x 22 x 12 mm',          '{"width_cm":5.5,"height_cm":2.2,"length_cm":1.2,"shape_type":"rectangular"}'::jsonb),
      ('dims','450 x 320 x 150 mm',       '{"width_cm":45,"height_cm":32,"length_cm":15,"shape_type":"rectangular"}'),
      ('dims','5,5 x 2,2 x 1,2 cm',       '{"width_cm":5.5,"height_cm":2.2,"length_cm":1.2,"shape_type":"rectangular"}'),
      ('dims','30 x 89 x 2,5 mm',         '{"width_cm":3,"height_cm":8.9,"length_cm":0.25,"shape_type":"rectangular"}'),
      ('dims','45 x 32 x 15',             '{"width_cm":4.5,"height_cm":3.2,"length_cm":1.5,"shape_type":"rectangular"}'),
      -- familia cilíndrica ø (31,6%)
      ('dims','ø70 x 225 mm',             '{"diameter_cm":7,"height_cm":22.5,"shape_type":"cylindrical"}'),
      ('dims','Ø75 x 250 mm',             '{"diameter_cm":7.5,"height_cm":25,"shape_type":"cylindrical"}'),
      ('dims','ø1040 x 885 mm',           '{"diameter_cm":104,"height_cm":88.5,"shape_type":"cylindrical"}'),
      -- familia 2D (15,6%)
      ('dims','370 x 410 mm',             '{"width_cm":37,"height_cm":41,"shape_type":"rectangular"}'),
      ('dims','140 x 210 mm',             '{"width_cm":14,"height_cm":21,"shape_type":"rectangular"}'),
      ('dims','7 x 22,5 cm',              '{"width_cm":7,"height_cm":22.5,"shape_type":"rectangular"}'),
      -- familia pipe (9,6%)
      ('dims','148 x 210 mm | Bolsa: 205 x 250 mm', '{"width_cm":14.8,"height_cm":21}'),
      ('dims','85 x 85 x 45 mm | Área gravação: 30x30mm', '{"width_cm":8.5,"height_cm":8.5,"length_cm":4.5}'),
      ('dims','Estojo: 350 x 130 x 20 mm','{"width_cm":35,"height_cm":13,"length_cm":2}'),
      ('dims','32 x 13 x 1,5 mm | Aberto: 43 x 13 x 1,5 mm','{"width_cm":3.2,"height_cm":1.3,"length_cm":0.15}'),
      -- familia têxtil/numeração (2%) — guards do patch M3
      ('dims','Tamanhos: P, M, G, GG, XGG','{"error":"no_numbers"}'),
      ('dims','P/M',                       '{"error":"no_numbers"}'),  -- FIX: "M" satisfaz \mm\M, passa guard
      ('dims','Tamanho 5',                 '{"error":"no_dimension_pattern"}'),
      ('dims','Tamanho: 58',               '{"error":"no_dimension_pattern"}'),
      -- hostis
      ('dims',NULL,                       '{"error":"empty_input"}'),
      ('dims','',                         '{"error":"empty_input"}'),
      ('dims','abc def',                  '{"error":"no_dimension_pattern"}'),
      ('dims','0 x 0 x 0 mm',             '{"error":"no_valid_numbers"}'),
      ('dims','999999 x 2 mm',            '{"error":"out_of_range"}')
    ) AS t(grp, input, expected)
  LOOP
    v_total := v_total + 1;
    DECLARE v_got jsonb;
    BEGIN
      v_got := fn_parse_product_dimensions(c.input);
      IF NOT (v_got @> c.expected) THEN
        v_failures := v_failures || jsonb_build_object('grp',c.grp,'input',c.input,'expected',c.expected,'got',v_got - 'original');
      END IF;
    END;
  END LOOP;

  -- ---------- BLOCO 2: fn_parse_capacity_ml ----------
  FOR c IN
    SELECT * FROM (VALUES
      ('cap','500 mL', 500), ('cap','750ml', 750), ('cap','500ML', 500),
      ('cap','1L', 1000), ('cap','37 L', 37000), ('cap','2 litros', 2000),
      ('cap','1 galão', 3785), ('cap','500', 500),
      -- multivalor (regra MAIOR VALOR)
      ('cap','400 mL, 550mL', 550), ('cap','480 mL, 760mL', 760),
      ('cap','65 mL, 60mL, 80mL', 80), ('cap','20 L, 18L', 20000),
      -- vírgula decimal BR (patch M3)
      ('cap','1,5 L', 1500), ('cap','0,5L', 500), ('cap','2,25 L', 2250),
      ('cap','1,5 litros', 1500), ('cap','3,7 L', 3700),
      -- milhar 3 dígitos preservado como separador multivalor
      ('cap','2,250 mL', 250),
      -- nulos
      ('cap','', NULL), ('cap',NULL, NULL), ('cap','abc', NULL)
    ) AS t(grp, input, expected)
  LOOP
    v_total := v_total + 1;
    DECLARE v_got_i int;
    BEGIN
      v_got_i := fn_parse_capacity_ml(c.input);
      IF v_got_i IS DISTINCT FROM c.expected THEN
        v_failures := v_failures || jsonb_build_object('grp',c.grp,'input',c.input,'expected',c.expected,'got',v_got_i);
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'pass', jsonb_array_length(v_failures) = 0,
    'total', v_total,
    'failed', jsonb_array_length(v_failures),
    'failures', v_failures,
    'tested_at', now());
END;
$function$
