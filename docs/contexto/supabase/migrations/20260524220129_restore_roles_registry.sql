create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);
alter table public.roles enable row level security;
revoke all on table public.roles from anon;
grant select, insert, update, delete on table public.roles to authenticated;
drop policy if exists "roles_admin_all" on public.roles;
create policy "roles_admin_all" on public.roles for all to authenticated using (public.is_admin_or_above(auth.uid())) with check (public.is_admin_or_above(auth.uid()));
insert into public.roles (name, description)
select e.enumlabel::text, 'Role do sistema: ' || e.enumlabel::text
from pg_enum e join pg_type t on t.oid = e.enumtypid
where t.typname = 'app_role'
on conflict (name) do nothing;
comment on table public.roles is 'Registro de roles para a tela admin (RolesPage). Semeado do enum app_role.';
