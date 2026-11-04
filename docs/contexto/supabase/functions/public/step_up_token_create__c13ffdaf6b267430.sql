CREATE OR REPLACE FUNCTION public.step_up_token_create(_challenge_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_token text; v_hash text; v_challenge record;
BEGIN
  SELECT * INTO v_challenge FROM public.step_up_challenges
  WHERE id = _challenge_id AND user_id = auth.uid() AND otp_verified = true AND consumed = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not verified'; END IF;
  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');
  INSERT INTO public.step_up_tokens (user_id, action, target_ref, token_hash, challenge_id)
  VALUES (auth.uid(), v_challenge.action, v_challenge.target_ref, v_hash, _challenge_id);
  UPDATE public.step_up_challenges SET consumed = true WHERE id = _challenge_id;
  RETURN v_token;
END $function$
