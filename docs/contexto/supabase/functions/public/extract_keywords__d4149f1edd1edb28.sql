CREATE OR REPLACE FUNCTION public.extract_keywords(input_text text, max_keywords integer DEFAULT 10)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  words TEXT[];
  stopwords TEXT[] := ARRAY[
    'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
    'para', 'por', 'com', 'sem', 'sob', 'sobre', 'entre', 'ate',
    'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as',
    'e', 'ou', 'mas', 'que', 'se', 'ao', 'aos',
    'seu', 'sua', 'seus', 'suas', 'este', 'esta', 'esse', 'essa',
    'isso', 'isto', 'aquilo', 'qual', 'quais', 'como', 'mais', 'menos',
    'the', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall'
  ];
  filtered_words TEXT[] := ARRAY[]::TEXT[];
  word TEXT;
  clean_text TEXT;
BEGIN
  IF input_text IS NULL OR LENGTH(TRIM(input_text)) = 0 THEN
    RETURN NULL;
  END IF;
  
  clean_text := LOWER(REGEXP_REPLACE(input_text, '[^a-zA-Z0-9\s]', ' ', 'gi'));
  words := STRING_TO_ARRAY(clean_text, ' ');
  
  FOREACH word IN ARRAY words LOOP
    word := TRIM(word);
    IF LENGTH(word) >= 3 AND NOT (word = ANY(stopwords)) THEN
      filtered_words := ARRAY_APPEND(filtered_words, word);
    END IF;
  END LOOP;
  
  SELECT ARRAY_AGG(DISTINCT w ORDER BY w) INTO filtered_words
  FROM UNNEST(filtered_words) AS w
  WHERE w IS NOT NULL AND w != '';
  
  IF filtered_words IS NOT NULL AND ARRAY_LENGTH(filtered_words, 1) > max_keywords THEN
    filtered_words := filtered_words[1:max_keywords];
  END IF;
  
  RETURN filtered_words;
END;
$function$
