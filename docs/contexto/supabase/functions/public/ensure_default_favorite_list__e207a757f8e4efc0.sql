CREATE OR REPLACE FUNCTION public.ensure_default_favorite_list(_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_list_id uuid;
BEGIN
  SELECT id INTO v_list_id
  FROM public.favorite_lists
  WHERE user_id = _user_id AND is_default = true
  LIMIT 1;

  IF v_list_id IS NOT NULL THEN
    RETURN v_list_id;
  END IF;

  BEGIN
    INSERT INTO public.favorite_lists (
      user_id, name, description, color, icon, is_default, position
    ) VALUES (
      _user_id, 'Meus Favoritos', 'Lista padrão de favoritos', '#3B82F6', 'Heart', true, 0
    )
    RETURNING id INTO v_list_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_list_id
    FROM public.favorite_lists
    WHERE user_id = _user_id AND is_default = true
    LIMIT 1;
  END;

  RETURN v_list_id;
END;
$function$
