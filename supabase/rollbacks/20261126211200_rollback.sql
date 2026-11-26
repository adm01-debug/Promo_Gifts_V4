-- Rollback da migration 20261126211200_admin_classification_audit_rpc.sql
-- approved-by: adm01-debug

BEGIN;

DROP FUNCTION IF EXISTS public.fn_admin_classification_apply(boolean, integer);
DROP FUNCTION IF EXISTS public.fn_admin_classification_suggestions(text, boolean, integer, integer);
DROP FUNCTION IF EXISTS public.fn_admin_classification_summary();

COMMIT;