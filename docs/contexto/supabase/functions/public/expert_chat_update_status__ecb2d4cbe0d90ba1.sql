CREATE OR REPLACE FUNCTION public.expert_chat_update_status(_session_id text, _status text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversation_audit_logs SET status = _status,
    ended_at = CASE WHEN _status IN ('completed','failed') THEN now() ELSE ended_at END
  WHERE session_id = _session_id AND user_id = auth.uid();
END $function$
