CREATE OR REPLACE FUNCTION public.magic_up_create_campaign(_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.magic_up_campaigns (
    user_id, client_id, client_name, title, objective, channel, audience, tone, cta, occasion, status, metadata
  )
  VALUES (
    auth.uid(),
    _data->>'client_id',
    _data->>'client_name',
    COALESCE(_data->>'title', 'Campaign'),
    _data->>'objective',
    _data->>'channel',
    _data->>'audience',
    _data->>'tone',
    _data->>'cta',
    _data->>'occasion',
    COALESCE(_data->>'status', 'draft'),
    COALESCE(_data->'metadata','{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$
