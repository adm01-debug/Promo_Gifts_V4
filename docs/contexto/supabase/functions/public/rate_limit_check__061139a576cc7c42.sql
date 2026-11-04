CREATE OR REPLACE FUNCTION public.rate_limit_check(_identifier text, _endpoint text, _max_requests integer DEFAULT 100, _window_seconds integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_record record; v_now timestamptz := now(); v_window_start timestamptz;
BEGIN
  v_window_start := v_now - (_window_seconds || ' seconds')::interval;
  
  -- Limpa janela expirada
  DELETE FROM public.request_rate_limits 
  WHERE identifier = _identifier AND endpoint = _endpoint AND window_start < v_window_start;
  
  SELECT * INTO v_record FROM public.request_rate_limits
  WHERE identifier = _identifier AND endpoint = _endpoint;
  
  IF NOT FOUND THEN
    INSERT INTO public.request_rate_limits (identifier, endpoint, request_count, window_start)
    VALUES (_identifier, _endpoint, 1, v_now);
    RETURN jsonb_build_object('allowed', true, 'remaining', _max_requests - 1, 'blocked', false);
  END IF;
  
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'blocked', true, 'retry_after', v_record.blocked_until);
  END IF;
  
  IF v_record.request_count >= _max_requests THEN
    UPDATE public.request_rate_limits 
    SET blocked_until = v_now + interval '15 minutes'
    WHERE id = v_record.id;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'blocked', true, 'retry_after', v_now + interval '15 minutes');
  END IF;
  
  UPDATE public.request_rate_limits 
  SET request_count = request_count + 1, updated_at = v_now
  WHERE id = v_record.id;
  
  RETURN jsonb_build_object('allowed', true, 'remaining', _max_requests - v_record.request_count - 1, 'blocked', false);
END $function$
