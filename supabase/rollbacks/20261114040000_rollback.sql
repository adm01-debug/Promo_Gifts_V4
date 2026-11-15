-- Rollback de 20261114040000: volta o valor de 20260524211024 (10 min) para o papel do PostgREST.
ALTER ROLE authenticator SET idle_session_timeout = '600000';
