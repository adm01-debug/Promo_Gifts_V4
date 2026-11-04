-- Restrict INSERT with always-true to service_role where appropriate

-- analytics_events: keep INSERT for authenticated (tracking is expected)
-- audit_log: restrict to service_role (should only be written by system)
DROP POLICY IF EXISTS system_create_audit_log ON public.audit_log;
CREATE POLICY audit_log_insert_service ON public.audit_log
  FOR INSERT TO service_role WITH CHECK (true);

-- organizations: restrict to service_role (org creation should be controlled)
DROP POLICY IF EXISTS org_insert_admins ON public.organizations;
CREATE POLICY org_insert_service ON public.organizations
  FOR INSERT TO service_role WITH CHECK (true);

-- quote_versions: restrict to service_role (system creates versions)
DROP POLICY IF EXISTS system_create_quote_versions ON public.quote_versions;
CREATE POLICY qv_insert_service ON public.quote_versions
  FOR INSERT TO service_role WITH CHECK (true);
