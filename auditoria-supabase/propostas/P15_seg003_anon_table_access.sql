-- ============================================================
-- PROPOSTA P15 — SEG-003: Revogar acesso de anon a tabelas não-catálogo
-- Severidade: ALTO
-- Achado: SEG-003
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   Tabelas que não fazem parte do catálogo público (produtos, fornecedores)
--   estão acessíveis para o role `anon` via policies RLS.
--   Isso permite acesso não autenticado a dados internos.
--
-- EVIDÊNCIA (somente leitura, confirmada 2026-10-22):
--   SELECT tablename, policyname, cmd, roles, qual
--   FROM pg_policies
--   WHERE schemaname='public'
--     AND 'anon' = ANY(roles::text[])
--     AND tablename NOT IN (
--       SELECT viewname FROM pg_views WHERE schemaname='public'
--       AND viewname ILIKE '%public%'
--     )
--   ORDER BY tablename;
--   → Tabelas internas com policy para anon identificadas
--
-- SOLUÇÃO:
--   Auditar cada policy que permite anon e verificar se o acesso
--   é necessário. Revogar GRANT/policy para anon em tabelas internas.
-- ============================================================

-- === IDENTIFICAR tabelas com acesso anon ===
/*
SELECT tablename,
  COUNT(*) FILTER (WHERE 'anon' = ANY(roles::text[])) AS anon_policies,
  array_agg(policyname ORDER BY policyname) FILTER (WHERE 'anon' = ANY(roles::text[])) AS policy_names
FROM pg_policies
WHERE schemaname='public'
GROUP BY tablename
HAVING COUNT(*) FILTER (WHERE 'anon' = ANY(roles::text[])) > 0
ORDER BY tablename;
*/

-- === APLICAÇÃO (EXEMPLO) ===
-- NÃO EXECUTAR DIRETAMENTE — usar db-apply-migration.yml
/*
-- Para cada tabela interna identificada — avaliar e revogar:
-- REVOKE SELECT ON public.<tabela_interna> FROM anon;

-- Ou, se o GRANT for necessário mas a policy for muito permissiva:
-- DROP POLICY IF EXISTS "<nome_policy>" ON public.<tabela_interna>;
-- CREATE POLICY "<nome_policy>" ON public.<tabela_interna>
--   FOR SELECT TO anon
--   USING (<condição_mais_restritiva>);
*/

-- === ROLLBACK ===
/*
-- Por tabela: restaurar GRANT e/ou política anterior
-- GRANT SELECT ON public.<tabela_interna> TO anon;
*/

-- === RISCO DE REGRESSÃO ===
-- ALTO: Revogar acesso anon pode quebrar features públicas do frontend.
-- Testar cada tabela em staging antes de aplicar em produção.
-- Documentar cada revogação no PR.

-- === ESFORÇO ===
-- Médio (auditoria + testes por tabela)
