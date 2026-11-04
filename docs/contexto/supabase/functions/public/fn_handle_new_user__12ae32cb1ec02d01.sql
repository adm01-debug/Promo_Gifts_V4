CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'vendedor'::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Mantemos o trigger não-bloqueante (signup nunca falha por causa da role),
  -- mas agora deixamos rastro em log em vez de engolir o erro em silêncio.
  RAISE NOTICE 'fn_handle_new_user falhou para user_id=%: %', NEW.id, SQLERRM;
  RETURN NEW;
END
$function$
