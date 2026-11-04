CREATE OR REPLACE FUNCTION public.expert_chat_log_event(_conv_id uuid, _event_type text, _role text, _content text DEFAULT NULL::text, _media_url text DEFAULT NULL::text, _tokens integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.conversation_event_history (
    conversation_id, role, event_type, content, media_url, tokens_estimated
  ) VALUES (
    _conv_id, _role, _event_type::public.conversation_event_type, _content, _media_url, _tokens
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $function$
