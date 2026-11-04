CREATE OR REPLACE FUNCTION public.step_up_user_settings_set(_settings jsonb, _user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_target uuid := COALESCE(_user_id, auth.uid());
BEGIN
  IF v_target <> auth.uid() AND NOT public.is_supervisor_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  INSERT INTO public.system_settings (key, value, updated_by)
  VALUES ('step_up_settings_' || v_target::text, _settings, auth.uid())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = auth.uid();
END $function$
