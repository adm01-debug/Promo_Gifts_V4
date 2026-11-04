CREATE OR REPLACE FUNCTION public.expert_chat_get_messages(_conv_id uuid, _limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at) FROM public.expert_messages m
  WHERE conversation_id = _conv_id
    AND EXISTS (SELECT 1 FROM public.expert_conversations WHERE id = _conv_id AND seller_id = auth.uid())
  LIMIT _limit;
$function$
