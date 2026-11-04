CREATE OR REPLACE FUNCTION public.magazine_ensure_view_event_partitions

DO $$ retroactive BUG-3 partition policy fix (existence-checked) $$

REVOKE DELETE,INSERT,UPDATE,TRIGGER,REFERENCES ON anon_catalog_grant_audit_log FROM anon

REVOKE DELETE,INSERT,UPDATE,TRIGGER,REFERENCES ON anon_catalog_grant_audit_log FROM authenticated
