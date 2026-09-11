-- Getter restrito da AccessKey SPOT (lido do Vault). Sem valor de segredo no texto.
create or replace function public.fn_get_spot_access_key()
returns text
language sql
security definer
set search_path to 'vault','public'
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'SPOT_ACCESS_KEY' limit 1;
$$;
revoke all on function public.fn_get_spot_access_key() from public, anon, authenticated;
grant execute on function public.fn_get_spot_access_key() to service_role;;
