CREATE OR REPLACE FUNCTION public.get_quote_token_public (anon-safe PII-redacted)

REVOKE from PUBLIC/authenticated, GRANT TO anon on get_quote_token_public

ALTER FUNCTION enforce_password_reset_rate_limit SET search_path = public
