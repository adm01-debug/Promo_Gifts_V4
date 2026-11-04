CREATE OR REPLACE FUNCTION public.mcp_kv_set(p_secret text, p_key text, p_value jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_secret is null or p_secret <> '9f2c7a1e6b40d83f5c1908a4e7d62b3f8c05a91e4d7b620c' then
    raise exception 'forbidden';
  end if;
  insert into public.mcp_kv(k, v, updated_at) values (p_key, p_value, now())
  on conflict (k) do update set v = excluded.v, updated_at = now();
end;
$function$
