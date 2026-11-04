CREATE OR REPLACE FUNCTION public.fn_trigger_schema_drift_fetch()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lovable_url text;
  v_lovable_key text;
  v_request_id  bigint;
BEGIN
  -- Le configuracao
  SELECT value #>> '{}' INTO v_lovable_url 
  FROM public.system_settings WHERE key = 'lovable_url';
  SELECT value #>> '{}' INTO v_lovable_key 
  FROM public.system_settings WHERE key = 'lovable_anon_key';

  IF v_lovable_url IS NULL OR v_lovable_url = 'null' THEN
    RAISE EXCEPTION 'lovable_url nao configurado em system_settings';
  END IF;
  IF v_lovable_key IS NULL OR v_lovable_key = 'null' THEN
    RAISE EXCEPTION 'lovable_anon_key nao configurado em system_settings. Preencher via UPDATE system_settings.';
  END IF;

  -- Dispara HTTP POST assincrono para o Lovable RPC
  SELECT net.http_post(
    url     := v_lovable_url || '/rest/v1/rpc/get_public_schema_signatures',
    headers := jsonb_build_object(
      'apikey',        v_lovable_key,
      'Authorization', 'Bearer ' || v_lovable_key,
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$
