-- Hardening: remove GRANT de SELECT de anon/authenticated na tabela interna de reconciliação.
-- RLS ja bloqueava linhas; isto a tira da superficie de API (PostgREST/GraphQL).
REVOKE ALL ON public.cf_recon_inflight FROM anon, authenticated;;
