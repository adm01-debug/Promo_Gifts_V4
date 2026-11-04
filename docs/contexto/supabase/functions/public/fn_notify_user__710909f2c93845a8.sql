CREATE OR REPLACE FUNCTION public.fn_notify_user(_target_user_id uuid, _title text, _message text, _type text DEFAULT 'info'::text, _category text DEFAULT 'system'::text, _action_url text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _notification_id uuid;
  _caller_id uuid;
BEGIN
  _caller_id := auth.uid();
  
  -- Deve ser chamada por usuário autenticado
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'fn_notify_user: authentication required'
      USING ERRCODE = '42501';
  END IF;
  
  -- Target user deve existir
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'fn_notify_user: target user does not exist'
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Validar type
  IF _type NOT IN ('info', 'success', 'warning', 'error') THEN
    RAISE EXCEPTION 'fn_notify_user: invalid type %', _type
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Inserir a notificação (bypassa RLS via SECURITY DEFINER)
  INSERT INTO public.workspace_notifications (
    user_id, title, message, type, category, action_url, metadata
  )
  VALUES (
    _target_user_id, _title, _message, _type, _category, _action_url, _metadata
  )
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$function$
