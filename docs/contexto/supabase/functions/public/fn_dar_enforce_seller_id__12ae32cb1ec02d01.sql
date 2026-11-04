CREATE OR REPLACE FUNCTION public.fn_dar_enforce_seller_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Sempre forçar seller_id = usuário atual (BEFORE INSERT / UPDATE de seller_id)
  -- Previne que um vendedor crie solicitações em nome de outro.
  NEW.seller_id := auth.uid();
  RETURN NEW;
END;
$function$
