CREATE OR REPLACE FUNCTION public.expert_chat_create_conversation(_title text DEFAULT 'Nova Conversa'::text, _client_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.expert_conversations (seller_id, title, client_id)
  VALUES (auth.uid(), _title, _client_id) RETURNING id INTO v_id;
  RETURN v_id;
END $function$
