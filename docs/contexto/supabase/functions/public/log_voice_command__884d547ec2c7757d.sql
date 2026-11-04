CREATE OR REPLACE FUNCTION public.log_voice_command(_transcript text, _action text DEFAULT NULL::text, _success boolean DEFAULT true, _data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.voice_command_logs (user_id, transcript, action, success, data)
  VALUES (auth.uid(), _transcript, _action, _success, _data)
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$
