-- ============================================================================
-- M12: concede SELECT a anon em discount_approval_requests (corrige smoke test
-- anon_grants_badge_tables e o HTTP 403 no HEAD/count do badge no frontend).
--
-- SEGURANCA: a tabela tem RLS ATIVA e NENHUMA policy para o role anon
-- (todas as policies sao 'authenticated' com escopo seller_id=auth.uid()/coord).
-- Logo, com RLS, anon ve 0 linhas: o GRANT apenas evita o 403 (permission denied)
-- fazendo o HEAD retornar 200/count-0, SEM expor nenhum dado sensivel.
-- Mesmo padrao ja vigente em workspace_notifications (anon SELECT + RLS nega linhas).
-- fix_version = anon_badge_grant_dar_v1
-- ============================================================================
GRANT SELECT ON public.discount_approval_requests TO anon;

-- PostgREST: recarrega cache de privilegios/esquema
NOTIFY pgrst, 'reload schema';
;
