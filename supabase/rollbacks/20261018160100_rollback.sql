-- Rollback de 20261018160100: remove índice funcional lower(email) em login_attempts
DROP INDEX IF EXISTS public.idx_login_attempts_lower_email_ip_created;
