ALTER TABLE public.cnpj_backfill_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_internal_only ON public.cnpj_backfill_audit AS RESTRICTIVE FOR ALL TO PUBLIC USING (FALSE);
ALTER TABLE public.ops_grant_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_internal_only ON public.ops_grant_audit AS RESTRICTIVE FOR ALL TO PUBLIC USING (FALSE);
