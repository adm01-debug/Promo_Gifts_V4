CREATE OR REPLACE FUNCTION public.expert_chat_send_message(_conv_id uuid, _role text, _content text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.expert_conversations WHERE id = _conv_id AND seller_id = auth.uid()) THEN
    RAISE EXCEPTION 'Conversation not found or access denied';
  END IF;
  INSERT INTO public.expert_messages (conversation_id, role, content)
  VALUES (_conv_id, _role, _content) RETURNING id INTO v_id;
  UPDATE public.expert_conversations SET updated_at = now() WHERE id = _conv_id;
  RETURN v_id;
END $function$
