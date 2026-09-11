create table if not exists public.mcp_kv (
  k text primary key,
  v jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.mcp_kv enable row level security;
revoke all on public.mcp_kv from anon, authenticated;

create or replace function public.mcp_kv_get(p_secret text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
begin
  if p_secret is null or p_secret <> '9f2c7a1e6b40d83f5c1908a4e7d62b3f8c05a91e4d7b620c' then
    raise exception 'forbidden';
  end if;
  return (select v from public.mcp_kv where k = p_key);
end;
$func$;

create or replace function public.mcp_kv_set(p_secret text, p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  if p_secret is null or p_secret <> '9f2c7a1e6b40d83f5c1908a4e7d62b3f8c05a91e4d7b620c' then
    raise exception 'forbidden';
  end if;
  insert into public.mcp_kv(k, v, updated_at) values (p_key, p_value, now())
  on conflict (k) do update set v = excluded.v, updated_at = now();
end;
$func$;

revoke all on function public.mcp_kv_get(text, text) from public;
revoke all on function public.mcp_kv_set(text, text, jsonb) from public;
grant execute on function public.mcp_kv_get(text, text) to anon;
grant execute on function public.mcp_kv_set(text, text, jsonb) to anon;;
