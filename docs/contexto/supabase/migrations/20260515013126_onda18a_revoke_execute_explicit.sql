-- Onda 18a fixup #2: REVOKE EXECUTE explicito (era REVOKE ALL).
-- Semanticamente equivalente para functions (ALL = EXECUTE),
-- mas satisfaz regex do gate scripts/check-security-definer-hardening.mjs

REVOKE EXECUTE ON FUNCTION public.can_access_quote(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_quote(uuid) FROM anon;
