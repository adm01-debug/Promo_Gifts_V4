CREATE OR REPLACE FUNCTION public.fn_sync_ai_usage_logs_total_tokens()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.total_tokens := COALESCE(NEW.input_tokens, 0) + COALESCE(NEW.output_tokens, 0);
  RETURN NEW;
END;
$function$
