CREATE OR REPLACE FUNCTION classification_audit.validate_match_phrase(p_product_name text, p_tokens text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_name text := lower(unaccent(p_product_name));
  v_tokens text[] := regexp_split_to_array(p_tokens, ',\s*');
  v_tk text;
  v_all_present boolean := true;
BEGIN
  -- TODOS os tokens devem aparecer como palavra inteira (não substring)
  FOREACH v_tk IN ARRAY v_tokens LOOP
    IF v_name !~ ('\m' || trim(v_tk) || '\M') THEN
      v_all_present := false;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_all_present;
END;
$function$
