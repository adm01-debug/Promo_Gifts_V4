-- Revisão DBA 2026-10-18: idx_login_attempts_email_ip_created
-- (20261005130000) indexa a coluna crua `email`, mas as duas consultas de
-- fn_check_login_allowed filtram `lower(email) = p_email` — o predicado
-- com lower() nunca usa o índice e todo check-login faz seq scan em
-- login_attempts (que só cresce). Índice funcional cobre ambas as
-- consultas (coluna líder lower(email); ip_address é OR-condicional, fica
-- como filtro; created_at DESC atende o ORDER/LIMIT do _last_success e o
-- range da janela no _failed_count).
-- O índice antigo é mantido: outros callers podem filtrar email exato
-- (a edge já grava email em minúsculas); dropar ficaria para uma revisão
-- futura com EXPLAIN em produção.
--
-- Rollback: DROP INDEX IF EXISTS public.idx_login_attempts_lower_email_ip_created;
CREATE INDEX IF NOT EXISTS idx_login_attempts_lower_email_ip_created
  ON public.login_attempts (lower(email), ip_address, created_at DESC);
