-- ============================================================================
-- HARDENING DE GRANTS (defense-in-depth) — subsistema de orçamentos (quotes)
-- ----------------------------------------------------------------------------
-- Contexto: 6 tabelas do subsistema quotes ainda carregavam os grants default
-- do Supabase (INSERT/SELECT/UPDATE/DELETE para anon; REFERENCES/TRIGGER para
-- authenticated), protegidas apenas por RLS. Nenhuma dessas tabelas possui
-- policy que conceda acesso ao papel anon (todas as policies sao authenticated/
-- service_role com predicados auth.uid()/can_access_quote()). O fluxo publico de
-- e-assinatura usa RPCs SECURITY DEFINER (get_quote_token_by_value,
-- submit_quote_response) que ignoram grants de tabela. Portanto remover o acesso
-- direto do anon e os privilegios REFERENCES/TRIGGER do authenticated e seguro e
-- fecha a porta de acesso direto (camada extra alem da RLS).
--
-- Mantido: SELECT/INSERT/UPDATE/DELETE do authenticated (RLS gateia as linhas).
-- Validado: dry-run com 22 asserções (anon negado/42501 funcional em quote_items,
-- authenticated mantem SELECT, RPCs publicas anon-EXECUTE intactas).
-- Alinhado ao padrao ja aplicado em quotes/quote_history/quote_approval_tokens.
-- fix_version: 20260626_quote_grants_hardening
-- ============================================================================
REVOKE ALL ON public.quote_items FROM anon;
REVOKE REFERENCES, TRIGGER ON public.quote_items FROM authenticated;

REVOKE ALL ON public.quote_versions FROM anon;
REVOKE REFERENCES, TRIGGER ON public.quote_versions FROM authenticated;

REVOKE ALL ON public.quote_drafts FROM anon;
REVOKE REFERENCES, TRIGGER ON public.quote_drafts FROM authenticated;

REVOKE ALL ON public.quote_item_personalizations FROM anon;
REVOKE REFERENCES, TRIGGER ON public.quote_item_personalizations FROM authenticated;

REVOKE ALL ON public.quote_comments FROM anon;
REVOKE REFERENCES, TRIGGER ON public.quote_comments FROM authenticated;

REVOKE ALL ON public.quote_templates FROM anon;
REVOKE REFERENCES, TRIGGER ON public.quote_templates FROM authenticated;

NOTIFY pgrst, 'reload schema';;
