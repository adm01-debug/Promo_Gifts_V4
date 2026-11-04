-- T33: Remove anon EXECUTE on all public security_definer functions
-- Service-role and authenticated roles are unaffected.
-- This prevents unauthenticated callers from invoking elevated-privilege functions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
