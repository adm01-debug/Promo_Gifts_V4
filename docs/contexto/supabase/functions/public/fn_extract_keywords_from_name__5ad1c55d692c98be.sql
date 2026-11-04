CREATE OR REPLACE FUNCTION public.fn_extract_keywords_from_name(p_name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_name_clean TEXT;
    v_words TEXT[];
    v_keywords TEXT[] := '{}';
    v_word TEXT;
    v_stopwords TEXT[] := ARRAY['em', 'de', 'da', 'do', 'para', 'com', 'por', 'a', 'o', 'e', 'ou', 'que', 'um', 'uma', 'os', 'as', 'na', 'no', 'ao', 'aos', 'pela', 'pelo'];
BEGIN
    v_name_clean := LOWER(unaccent(COALESCE(p_name, '')));
    v_name_clean := regexp_replace(v_name_clean, '[^a-z0-9\s]', ' ', 'g');
    v_name_clean := regexp_replace(v_name_clean, '\s+', ' ', 'g');
    
    v_words := string_to_array(TRIM(v_name_clean), ' ');
    
    FOREACH v_word IN ARRAY v_words LOOP
        IF LENGTH(v_word) >= 3 AND NOT v_word = ANY(v_stopwords) THEN
            v_keywords := array_append(v_keywords, v_word);
        END IF;
    END LOOP;
    
    SELECT array_agg(DISTINCT x) INTO v_keywords FROM unnest(v_keywords) x;
    
    RETURN COALESCE(v_keywords, '{}');
END;
$function$
