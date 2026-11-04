CREATE OR REPLACE FUNCTION public.send_digest_notification(p_user_id uuid, p_notification_ids uuid[], p_unread_count integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title   text;
  v_message text;
BEGIN
  -- Valida parâmetros básicos
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'send_digest_notification: p_user_id não pode ser NULL';
  END IF;

  IF p_unread_count IS NULL OR p_unread_count <= 0 THEN
    RETURN; -- Nada a fazer
  END IF;

  -- Remove digests anteriores não lidos do mesmo usuário (evita flood)
  DELETE FROM public.workspace_notifications
  WHERE user_id = p_user_id
    AND type     = 'digest'
    AND is_read  = false;

  -- Monta mensagem adaptada ao volume
  IF p_unread_count = 1 THEN
    v_title   := 'Você tem 1 notificação pendente';
    v_message := 'Há 1 notificação aguardando sua leitura. Acesse o painel para ver os detalhes.';
  ELSE
    v_title   := format('Você tem %s notificações pendentes', p_unread_count);
    v_message := format(
      'Há %s notificações aguardando sua leitura. Acesse o painel para ver todos os detalhes.',
      p_unread_count
    );
  END IF;

  -- Insere o digest como notificação in-app consolidada
  INSERT INTO public.workspace_notifications (
    id,
    user_id,
    title,
    message,
    type,
    category,
    is_read,
    action_url,
    metadata,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    v_title,
    v_message,
    'digest',
    'system',
    false,
    '/notifications',
    jsonb_build_object(
      'digest', true,
      'unread_count', p_unread_count,
      'notification_ids', to_jsonb(p_notification_ids),
      'generated_at', now()
    ),
    now()
  );
END;
$function$
