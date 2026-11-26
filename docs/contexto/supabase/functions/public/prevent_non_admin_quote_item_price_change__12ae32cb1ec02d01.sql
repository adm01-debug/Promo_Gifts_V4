CREATE OR REPLACE FUNCTION public.prevent_non_admin_quote_item_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  -- INSERTs e mudanças sem auth context (service_role / jobs) passam direto.
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Se unit_price não mudou, nada a validar.
  IF NEW.unit_price IS NOT DISTINCT FROM OLD.unit_price THEN
    RETURN NEW;
  END IF;

  -- Verifica privilégio (admin OU supervisor OU can_view_all_sales).
  BEGIN
    v_is_admin := public.has_role(v_uid, 'admin'::app_role)
               OR public.has_role(v_uid, 'supervisor'::app_role)
               OR public.can_view_all_sales();
  EXCEPTION WHEN OTHERS THEN
    v_is_admin := false;
  END;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Preço unitário (unit_price) não pode ser alterado por este usuário. O preço vem do catálogo e é somente leitura.'
      USING ERRCODE = '42501', HINT = 'Solicite a um administrador para ajustar o preço, se necessário.';
  END IF;

  RETURN NEW;
END;
$function$
