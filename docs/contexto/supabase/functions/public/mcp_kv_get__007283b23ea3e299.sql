CREATE OR REPLACE FUNCTION public.mcp_kv_get(p_secret text, p_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_secret is null or p_secret <> '9f2c7a1e6b40d83f5c1908a4e7d62b3f8c05a91e4d7b620c' then
    raise exception 'forbidden';
  end if;
  return (select v from public.mcp_kv where k = p_key);
end;
$function$
