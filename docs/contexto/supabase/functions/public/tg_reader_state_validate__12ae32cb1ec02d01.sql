CREATE OR REPLACE FUNCTION public.tg_reader_state_validate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF cardinality(NEW.bookmarks) > 500 THEN
    RAISE EXCEPTION 'reader_state: máximo de 500 bookmarks por dispositivo' USING ERRCODE = '23514';
  END IF;
  IF NEW.last_page_index < 0 OR NEW.last_page_index > 9999 THEN
    RAISE EXCEPTION 'reader_state: last_page_index fora do intervalo permitido (0-9999)' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$
