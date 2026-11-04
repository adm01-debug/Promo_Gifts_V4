CREATE OR REPLACE FUNCTION public.step_up_challenge_verify(_challenge_id uuid, _otp text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_valid boolean;
BEGIN
  UPDATE public.step_up_challenges
  SET attempts = attempts + 1, otp_verified = (otp_hash = crypt(_otp, otp_hash))
  WHERE id = _challenge_id AND user_id = auth.uid() AND expires_at > now() AND consumed = false
  RETURNING otp_verified INTO v_valid;
  RETURN COALESCE(v_valid, false);
END $function$
