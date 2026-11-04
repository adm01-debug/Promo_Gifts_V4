CREATE OR REPLACE FUNCTION classification_audit.has_type_conflict(p_product_name text, p_category_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_prod_type text;
  v_cat_base text;
  v_types text[] := ARRAY[
    'mochila', 'bolsa', 'necessaire', 'squeeze', 'garrafa', 'copo', 'copos',
    'taca', 'tacas', 'caneta', 'canetas', 'caderno', 'caderneta', 'bloco',
    'mouse', 'desk', 'chapeu', 'camiseta', 'camisa', 'boné', 'mesa',
    'carteira', 'porta', 'tabua', 'kit', 'conj', 'nécessaire', 'abridor',
    'saca', 'rolhas', 'garrafa', 'cuia', 'agenda', 'lapis', 'pasta',
    'mochila', 'chaveiro', 'relogio', 'luminária', 'caixa', 'suporte',
    'mesa', 'fone', 'leitor', 'camera', 'mochila', 'tapete'
  ];
  v_type text;
BEGIN
  -- Detectar tipo primário do produto (primeiro tipo que aparece no início do nome)
  FOREACH v_type IN ARRAY v_types LOOP
    IF lower(unaccent(p_product_name)) ~ ('^[^a-z]*' || v_type || '[^a-z]') THEN
      v_prod_type := v_type;
      EXIT;
    END IF;
  END LOOP;
  
  -- Se detectou tipo do produto, verificar se categoria menciona esse tipo
  IF v_prod_type IS NOT NULL THEN
    -- Permitir singular/plural
    RETURN NOT (
      lower(unaccent(p_category_name)) LIKE '%' || v_prod_type || '%'
      OR lower(unaccent(p_category_name)) LIKE '%' || v_prod_type || 's%'
      OR (v_prod_type LIKE '%s' AND lower(unaccent(p_category_name)) LIKE '%' || rtrim(v_prod_type,'s') || '%')
    );
  END IF;
  
  RETURN false;
END;
$function$
