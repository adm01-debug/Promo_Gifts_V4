CREATE OR REPLACE FUNCTION public.fn_anon_insert_rate_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role  text;
  v_limit integer := COALESCE(NULLIF(TG_ARGV[0], '')::integer, 120);
  v_ip    text;
  v_key   text;
  v_n     integer;
BEGIN
  v_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), ''))::jsonb ->> 'role',
    ''
  );
  IF v_role <> 'anon' THEN
    RETURN NEW;
  END IF;

  v_ip := COALESCE(
    NULLIF(btrim(split_part((NULLIF(current_setting('request.headers', true), ''))::jsonb ->> 'x-forwarded-for', ',', 1)), ''),
    'unknown'
  );
  v_key := TG_TABLE_NAME || '|' || v_ip || '|' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MI');

  INSERT INTO public.anon_insert_rate (bucket_key, n, window_start)
  VALUES (v_key, 1, date_trunc('minute', now()))
  ON CONFLICT (bucket_key) DO UPDATE SET n = public.anon_insert_rate.n + 1
  RETURNING n INTO v_n;

  IF v_n > v_limit THEN
    RAISE EXCEPTION 'anon_insert_rate_limit_exceeded: % (limite %/min por IP)', TG_TABLE_NAME, v_limit
      USING ERRCODE = 'P0001', HINT = 'Reduza a frequência de envio ou autentique-se.';
  END IF;
  RETURN NEW;
END
$function$
