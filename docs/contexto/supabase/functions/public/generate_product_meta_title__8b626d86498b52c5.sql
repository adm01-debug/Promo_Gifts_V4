CREATE OR REPLACE FUNCTION public.generate_product_meta_title(p_name text, p_category_name text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title TEXT;
  v_suffix TEXT := ' | Promo Brindes';
  v_max_name_length INTEGER;
BEGIN
  IF p_name IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Calcular espaço disponível (ideal 55 chars total)
  v_max_name_length := 55 - LENGTH(v_suffix);
  
  -- Se tiver categoria e couber, incluir
  IF p_category_name IS NOT NULL AND LENGTH(p_category_name) <= 15 THEN
    v_max_name_length := v_max_name_length - LENGTH(p_category_name) - 3; -- " - "
    
    IF LENGTH(p_name) > v_max_name_length THEN
      v_title := truncate_text(p_name, v_max_name_length, '');
    ELSE
      v_title := p_name;
    END IF;
    
    v_title := v_title || ' - ' || p_category_name || v_suffix;
  ELSE
    IF LENGTH(p_name) > v_max_name_length THEN
      v_title := truncate_text(p_name, v_max_name_length, '');
    ELSE
      v_title := p_name;
    END IF;
    
    v_title := v_title || v_suffix;
  END IF;
  
  RETURN v_title;
END;
$function$
