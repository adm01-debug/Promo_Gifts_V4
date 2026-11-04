CREATE OR REPLACE FUNCTION public.verify_step_up_password(_challenge_id uuid, _password_attempt text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.step_up_challenges 
    SET password_verified = true
    WHERE id = _challenge_id 
      AND user_id = auth.uid() 
      AND consumed = false 
      AND expires_at > now();
      
    RETURN FOUND;
END;
$function$
