
-- ══════════════════════════════════════════════════════════════
-- M5: Função utilitária de qualidade de products.name
-- Retorna score 0-100 + issues detalhados em JSONB.
-- Uso: SELECT fn_product_name_quality_score(name) FROM products;
-- Deduções por problema:
--   -30 : name NULL ou vazia
--   -25 : espaços duplos ou tabs/\n
--   -20 : comprimento > 150 chars (SEO penaliza titles longos)
--   -15 : comprimento < 8 chars (muito curto para busca)
--   -15 : todo UPPERCASE (variant, não product)
--   -10 : sem letras/números (só símbolos)
--   -5  : caracteres de controle ou unicode suspeito além de ™/®/©
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_product_name_quality_score(
  p_name text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_score   integer := 100;
  v_issues  text[]  := '{}';
BEGIN
  -- Nome nulo ou vazio (erro grave)
  IF p_name IS NULL OR length(TRIM(p_name)) = 0 THEN
    RETURN jsonb_build_object(
      'score',  0,
      'issues', ARRAY['name_null_or_empty'],
      'grade',  'F'
    );
  END IF;

  -- Espaços duplos ou laterais
  IF p_name LIKE '%  %' THEN
    v_score  := v_score - 25;
    v_issues := array_append(v_issues, 'double_spaces');
  END IF;
  IF p_name <> TRIM(p_name) THEN
    v_score  := v_score - 15;
    v_issues := array_append(v_issues, 'leading_trailing_spaces');
  END IF;

  -- Tabs / newlines / carriage return
  IF p_name ~ E'[\\t\\n\\r]' THEN
    v_score  := v_score - 25;
    v_issues := array_append(v_issues, 'contains_tabs_newlines');
  END IF;

  -- Comprimento excessivo
  IF length(p_name) > 150 THEN
    v_score  := v_score - 20;
    v_issues := array_append(v_issues, 'too_long_over_150');
  ELSIF length(p_name) > 100 THEN
    v_score  := v_score - 10;
    v_issues := array_append(v_issues, 'long_100_to_150');
  END IF;

  -- Muito curto (< 8 chars — dificulta busca)
  IF length(TRIM(p_name)) < 8 THEN
    v_score  := v_score - 15;
    v_issues := array_append(v_issues, 'too_short_under_8');
  END IF;

  -- Todo UPPERCASE (é padrão de variants, não de products)
  IF p_name = UPPER(p_name) AND p_name ~ '[A-Za-z]{3,}' THEN
    v_score  := v_score - 15;
    v_issues := array_append(v_issues, 'all_uppercase_variant_style');
  END IF;

  -- Sem letras ou números
  IF p_name !~ '[A-Za-zÀ-ú0-9]' THEN
    v_score  := v_score - 10;
    v_issues := array_append(v_issues, 'no_alphanumeric');
  END IF;

  -- Unicode além de Latin Extended + ™®©
  IF p_name ~ '[^\x00-\xFF™®©]' THEN
    v_score  := v_score - 5;
    v_issues := array_append(v_issues, 'unusual_unicode');
  END IF;

  -- Curly quotes (U+2018/U+2019) — devem ser substituídas por apostrofe simples
  IF p_name ~ U&'\2018|\2019' THEN
    v_score  := v_score - 5;
    v_issues := array_append(v_issues, 'curly_quotes');
  END IF;

  -- Clamp 0-100
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN jsonb_build_object(
    'score',  v_score,
    'issues', v_issues,
    'length', length(p_name),
    'grade',  CASE
                WHEN v_score >= 90 THEN 'A'
                WHEN v_score >= 75 THEN 'B'
                WHEN v_score >= 60 THEN 'C'
                WHEN v_score >= 40 THEN 'D'
                ELSE 'F'
              END
  );
END;
$function$;

COMMENT ON FUNCTION public.fn_product_name_quality_score(text) IS
'Retorna score 0-100 de qualidade de products.name com issues detalhados.
NÃO usar para product_variants.name (que é UPPER por design).
Deduções: double_spaces(-25), tabs_newlines(-25), all_uppercase(-15),
too_short(-15), too_long(-10...-20), no_alphanumeric(-10), unusual_unicode(-5), curly_quotes(-5).';
;
