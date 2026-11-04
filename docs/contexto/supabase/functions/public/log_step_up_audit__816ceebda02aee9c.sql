CREATE OR REPLACE FUNCTION public.log_step_up_audit(_event_type text, _action step_up_action DEFAULT NULL::step_up_action, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.step_up_audit_log (user_id, event_type, action, metadata)
  VALUES (auth.uid(), _event_type, _action, _metadata) RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $function$
