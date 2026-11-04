-- Onda 18a hardening: revoke explicito do anon
REVOKE ALL ON FUNCTION public.can_access_quote(uuid) FROM anon;
