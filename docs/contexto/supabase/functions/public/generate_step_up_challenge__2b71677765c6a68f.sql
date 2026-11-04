CREATE OR REPLACE FUNCTION public.generate_step_up_challenge(_action step_up_action, _target_ref text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_otp text;
BEGIN
  v_otp := lpad((floor(random()*1000000))::text, 6, '0');
  INSERT INTO public.step_up_challenges (user_id, action, target_ref, otp_hash)
  VALUES (auth.uid(), _action, _target_ref, crypt(v_otp, gen_salt('bf')))
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$
