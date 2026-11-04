CREATE OR REPLACE FUNCTION public.register_ai_routing_decision(p_function_name text, p_user_id uuid, p_attempted_models uuid[], p_attempted_providers uuid[], p_attempted_outcomes jsonb, p_final_model_id uuid, p_final_provider_id uuid, p_total_attempts integer, p_total_duration_ms integer, p_outcome text, p_usage_log_id uuid DEFAULT NULL::uuid, p_request_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.ai_routing_decisions (
    function_name, user_id, attempted_models, attempted_providers, attempted_outcomes,
    final_model_id, final_provider_id, total_attempts, total_duration_ms, outcome,
    usage_log_id, request_id
  ) VALUES (
    p_function_name, p_user_id, p_attempted_models, p_attempted_providers, p_attempted_outcomes,
    p_final_model_id, p_final_provider_id, p_total_attempts, p_total_duration_ms, p_outcome,
    p_usage_log_id, p_request_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$
