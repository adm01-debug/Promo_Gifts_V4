-- ============================================================================
-- LOTE A · MIGRATION 6/6 · funções de step-up auth
-- Já existem step_up_challenges, step_up_tokens, request_step_up_challenge no oficial
-- start_step_up_challenge e verify_step_up_password complementam o fluxo
-- ============================================================================

-- 1) start_step_up_challenge: cria challenge com action+target_ref (atalho mais simples
--    que request_step_up_challenge)
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
$function$;

REVOKE EXECUTE ON FUNCTION public.start_step_up_challenge(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_step_up_challenge(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.start_step_up_challenge(text, text) TO authenticated;

COMMENT ON FUNCTION public.start_step_up_challenge(text, text) IS
  'Cria step-up challenge. Atalho alternativo a request_step_up_challenge.';

-- 2) verify_step_up_password: marca challenge como password-verified
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
$function$;

REVOKE EXECUTE ON FUNCTION public.verify_step_up_password(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_step_up_password(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_step_up_password(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.verify_step_up_password(uuid, text) IS
  'Marca step_up_challenges.password_verified=true após senha validada pela edge function.';
