CREATE OR REPLACE FUNCTION public.magazine_ensure_view_event_partitions(_months_ahead integer DEFAULT 3) ...

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.anon_catalog_grant_audit_log FROM PUBLIC

ALTER FUNCTION public.fn_purge_spr_history(integer) SET search_path = public, pg_temp

ALTER FUNCTION public.check_login_rate_limit(text, text) SET search_path = public, pg_temp

ALTER FUNCTION public.fn_check_login_allowed(text, text, text, text) SET search_path = public, pg_temp
