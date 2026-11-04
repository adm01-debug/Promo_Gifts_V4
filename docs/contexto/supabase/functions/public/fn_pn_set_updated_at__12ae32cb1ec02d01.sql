CREATE OR REPLACE FUNCTION public.fn_pn_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- clock_timestamp() retorna o tempo real do wall clock,
    -- avança mesmo dentro da mesma transação (diferente de now())
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$function$
