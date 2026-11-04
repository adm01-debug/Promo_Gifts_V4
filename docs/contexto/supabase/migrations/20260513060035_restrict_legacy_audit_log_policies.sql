-- Restrict overly broad RLS policies on audit_log table.

DROP POLICY IF EXISTS "authenticated_view_audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "system_create_audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select_supervisor" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert_service" ON public.audit_log;

CREATE POLICY "audit_log_select_supervisor"
ON public.audit_log FOR SELECT
TO authenticated
USING (public.is_supervisor_or_above((SELECT auth.uid())));

CREATE POLICY "audit_log_insert_service"
ON public.audit_log FOR INSERT
TO service_role
WITH CHECK (true);
