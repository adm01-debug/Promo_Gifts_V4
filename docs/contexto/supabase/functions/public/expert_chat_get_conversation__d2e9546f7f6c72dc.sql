CREATE OR REPLACE FUNCTION public.expert_chat_get_conversation(_conv_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT to_jsonb(c) FROM public.expert_conversations c
  WHERE id = _conv_id AND seller_id = auth.uid();
$function$
