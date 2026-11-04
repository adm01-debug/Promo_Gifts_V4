create table if not exists public.user_2fa_settings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  is_enabled  boolean not null default false,
  totp_secret text,
  backup_codes text[],
  enabled_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint user_2fa_settings_user_id_key unique (user_id)
);
create index if not exists idx_user_2fa_settings_user_id on public.user_2fa_settings (user_id);
alter table public.user_2fa_settings enable row level security;
revoke all on table public.user_2fa_settings from anon;
grant select, insert, update, delete on table public.user_2fa_settings to authenticated;
drop policy if exists "user_2fa_select_own_or_admin" on public.user_2fa_settings;
create policy "user_2fa_select_own_or_admin" on public.user_2fa_settings for select to authenticated using (user_id = auth.uid() or public.is_admin_or_above(auth.uid()));
drop policy if exists "user_2fa_insert_own_or_admin" on public.user_2fa_settings;
create policy "user_2fa_insert_own_or_admin" on public.user_2fa_settings for insert to authenticated with check (user_id = auth.uid() or public.is_admin_or_above(auth.uid()));
drop policy if exists "user_2fa_update_own_or_admin" on public.user_2fa_settings;
create policy "user_2fa_update_own_or_admin" on public.user_2fa_settings for update to authenticated using (user_id = auth.uid() or public.is_admin_or_above(auth.uid())) with check (user_id = auth.uid() or public.is_admin_or_above(auth.uid()));
drop policy if exists "user_2fa_delete_own_or_admin" on public.user_2fa_settings;
create policy "user_2fa_delete_own_or_admin" on public.user_2fa_settings for delete to authenticated using (user_id = auth.uid() or public.is_admin_or_above(auth.uid()));
comment on table public.user_2fa_settings is 'Configuracoes de 2FA (TOTP) por usuario. Consumida por src/hooks/auth/use2FA.ts.';
