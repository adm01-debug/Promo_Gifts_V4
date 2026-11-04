CREATE OR REPLACE FUNCTION public.submit_quote_response(_token text, _response text, _response_notes text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Validate response value
  IF _response NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid response value';
  END IF;

  -- Only update allowed fields on active, unexpired tokens
  UPDATE public.quote_approval_tokens
  SET 
    response = _response,
    response_notes = _response_notes,
    responded_at = now(),
    status = 'responded',
    updated_at = now()
  WHERE token = _token
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND responded_at IS NULL;

  RETURN FOUND;
END;
$function$
