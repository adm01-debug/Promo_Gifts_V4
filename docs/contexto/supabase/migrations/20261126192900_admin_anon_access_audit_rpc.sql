-- Rollback: supabase/rollbacks/20261126192900_rollback.sql
-- approved-by: adm01-debug
--
-- Por que: `public.fn_anon_access_audit()` e o diagnostico estrutural do acesso
-- `anon` (RLS ativa sem policy, funcao usada em policy sem EXECUTE para anon,
-- view sensivel com SELECT para anon, tabela de badge sem grant para anon).
-- Ele existe em producao desde 20260623190039, mas o EXECUTE de `authenticated`
-- foi revogado em 20260716000029/20260716191641 — o baseline de 20261126130000
-- registra `REVOKE ALL ... FROM PUBLIC` + `GRANT ... TO service_role`
-- (:116258-116259), portanto o diagnostico nao tinha tela: nenhum usuario do
-- painel conseguia le-lo. Este wrapper expoe o resultado apenas para admin.
--
-- Idempotente: CREATE OR REPLACE + REVOKE/GRANT.

CREATE OR REPLACE FUNCTION public.fn_admin_anon_access_audit()
RETURNS TABLE (
  categoria text,
  objeto text,
  anon_grant boolean,
  auth_grant boolean,
  severidade text,
  descricao text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticacao obrigatoria.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_above(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  -- O diagnostico de base e VOLATILE (le catalogos e privilegios do momento),
  -- por isso o wrapper nao se declara STABLE.
  RETURN QUERY
  SELECT a.categoria, a.objeto, a.anon_grant, a.auth_grant, a.severidade, a.descricao
  FROM public.fn_anon_access_audit() AS a;
END;
$$

COMMENT ON FUNCTION public.fn_admin_anon_access_audit() IS
  'Wrapper admin (guard 42501) do diagnostico fn_anon_access_audit: RLS sem policy, funcao em policy sem EXECUTE para anon, view sensivel exposta a anon e tabela de badge sem grant. Alimenta a aba "Raio-x do acesso anon" em /admin/seguranca-acesso.'

REVOKE ALL ON FUNCTION public.fn_admin_anon_access_audit() FROM PUBLIC

REVOKE ALL ON FUNCTION public.fn_admin_anon_access_audit() FROM anon

GRANT EXECUTE ON FUNCTION public.fn_admin_anon_access_audit() TO authenticated

GRANT EXECUTE ON FUNCTION public.fn_admin_anon_access_audit() TO service_role
