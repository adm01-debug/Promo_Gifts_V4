CREATE OR REPLACE FUNCTION public.cron_invoke_edge(p_url_secret_name text, p_body jsonb DEFAULT '{}'::jsonb, p_timeout_ms integer DEFAULT 30000)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_url      text;
  v_anon     text;
  v_request  bigint;
BEGIN
  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = p_url_secret_name;
  SELECT decrypted_secret INTO v_anon
    FROM vault.decrypted_secrets WHERE name = 'edge_anon_key';

  IF v_url IS NULL THEN
    RAISE EXCEPTION 'Vault secret % not found', p_url_secret_name;
  END IF;
  IF v_anon IS NULL THEN
    RAISE EXCEPTION 'Vault secret edge_anon_key not found';
  END IF;

  SELECT extensions.net_http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_anon
    ),
    body    := p_body,
    timeout_milliseconds := p_timeout_ms
  ) INTO v_request;

  RETURN v_request;
END;
$function$
