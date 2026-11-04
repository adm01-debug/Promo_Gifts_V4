CREATE OR REPLACE FUNCTION public.fn_cf_recon_dispatch(p_batch integer DEFAULT 150)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'vault'
AS $function$
DECLARE r record; n int := 0; rid bigint; _acct text; _tok text; _base text;
BEGIN
  SELECT decrypted_secret INTO _acct FROM vault.decrypted_secrets WHERE name='CF_ACCOUNT_ID' LIMIT 1;
  SELECT decrypted_secret INTO _tok  FROM vault.decrypted_secrets WHERE name='CF_API_TOKEN'  LIMIT 1;
  IF _acct IS NULL OR _tok IS NULL THEN
    RAISE EXCEPTION 'CF_ACCOUNT_ID/CF_API_TOKEN ausentes no vault';
  END IF;
  _base := 'https://api.cloudflare.com/client/v4/accounts/'||_acct||'/images/v1/';

  FOR r IN
    SELECT id, cloudflare_image_id
    FROM public.product_images
    WHERE cf_sync_status IN ('pending','failed')
      AND cf_check_attempts < 5
      AND NOT EXISTS (SELECT 1 FROM public.cf_recon_inflight q WHERE q.image_id = product_images.id)
    ORDER BY is_primary DESC NULLS LAST, is_active DESC NULLS LAST, created_at
    LIMIT p_batch
  LOOP
    rid := net.http_get(url := _base || r.cloudflare_image_id,
                        headers := jsonb_build_object('Authorization','Bearer '||_tok),
                        timeout_milliseconds := 8000);
    INSERT INTO public.cf_recon_inflight(request_id, image_id)
      VALUES (rid, r.id) ON CONFLICT (request_id) DO NOTHING;
    n := n + 1;
  END LOOP;
  RETURN n;
END $function$
