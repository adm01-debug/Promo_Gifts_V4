CREATE OR REPLACE FUNCTION public.start_step_up_challenge(_action text, _target_ref text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_challenge_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    INSERT INTO public.step_up_challenges (user_id, action, target_ref)
    VALUES (auth.uid(), _action, _target_ref)
    RETURNING id INTO v_challenge_id;

    RETURN v_challenge_id;
END;
$function$
