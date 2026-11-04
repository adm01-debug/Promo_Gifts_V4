create index if not exists idx_user_organizations_user_org_covering
  on public.user_organizations (user_id, organization_id);
