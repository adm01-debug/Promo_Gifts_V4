CREATE OR REPLACE FUNCTION public.mcp_kv_try_lock(p_secret text, p_key text, p_ttl_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_now timestamptz := now();
  v_rows int;
begin
  if p_secret <> '9f2c7a1e6b40d83f5c1908a4e7d62b3f8c05a91e4d7b620c' then
    raise exception 'unauthorized';
  end if;
  -- adquire se nao existe lock vigente (lock_until nulo ou expirado)
  update public.mcp_kv
     set lock_until = v_now + make_interval(secs => p_ttl_seconds)
   where k = p_key
     and (lock_until is null or lock_until < v_now);
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$function$
