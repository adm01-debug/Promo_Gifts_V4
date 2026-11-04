CREATE OR REPLACE FUNCTION public.acquire_ai_quota(_user_id uuid, _function_name text, _model text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check jsonb;
  v_log_id uuid;
BEGIN
  v_check := public.check_ai_quota(_user_id);

  IF NOT (v_check->>'allowed')::boolean THEN
    RETURN v_check;
  END IF;

  INSERT INTO public.ai_usage_logs (user_id, function_name, model, status)
  VALUES (_user_id, _function_name, _model, 'pending')
  RETURNING id INTO v_log_id;

  RETURN v_check || jsonb_build_object('log_id', v_log_id);
END;
$function$
