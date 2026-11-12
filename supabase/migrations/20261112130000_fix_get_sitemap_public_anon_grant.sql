-- Sitemap público fora do ar: /api/sitemap responde 503 "degraded" porque anon perdeu EXECUTE em
-- public.get_sitemap_public(integer, integer) (PostgREST 42501 "permission denied for function").
--
-- Causa raiz: 20261101160001_sec003_remove_pg_temp_security_definer.sql faz
-- `ALTER FUNCTION public.get_sitemap_public(...) SET search_path = public`. O event trigger
-- evt_auto_revoke_secdef_public_execute (fn_auto_revoke_secdef_public_execute) revoga EXECUTE de
-- PUBLIC/anon de toda função SECURITY DEFINER alterada que não esteja na whitelist interna dele, e
-- get_sitemap_public não está lá. O GRANT original (20260909201000:52) foi desfeito sem intenção.
--
-- Intenção pública documentada: .security/secdef-anon-allowlist.json e
-- docs/security/ALLOWLISTS_MEMORY.md (endpoint SEO read-only: só revistas publicadas, não apagadas,
-- com token; projeção fixa, paginação limitada a 1.000, search_path fixo).
-- Esta migration só devolve o grant de 20260909201000; corpo e search_path não mudam.
-- Um GRANT não reaciona o trigger (20260909201000 concedeu anon com o trigger já ativo desde
-- 20260619115656 e o acesso valeu até a SEC-003).
--
-- Rollback: supabase/rollbacks/20261112130000_rollback.sql

GRANT EXECUTE ON FUNCTION public.get_sitemap_public(integer, integer) TO anon;

DO $$
BEGIN
  IF NOT has_function_privilege('anon', 'public.get_sitemap_public(integer, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'get_sitemap_public: anon continua sem EXECUTE após o GRANT';
  END IF;
END
$$;
