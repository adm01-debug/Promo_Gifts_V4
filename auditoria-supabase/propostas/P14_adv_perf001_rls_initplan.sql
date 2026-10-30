-- ============================================================
-- PROPOSTA P14 — ADV-PERF-001: Corrigir auth.uid() initplan em RLS policies
-- Severidade: ALTO
-- Achado: ADV-PERF-001
-- Status: NÃO APLICADA — somente para revisão e aprovação do PO
-- ============================================================
-- PROBLEMA:
--   590 políticas RLS usam auth.uid() diretamente no qualificador.
--   Sem o wrapper (SELECT auth.uid()), o PostgreSQL avalia a função
--   para cada linha (row-level), transformando um scan de 1000 linhas
--   em 1000 chamadas de função. Com (SELECT auth.uid()), o resultado
--   é avaliado uma vez (initplan) e reutilizado.
--
--   Nota: auditoria encontrou que MUITAS policies já usam
--   (SELECT auth.uid() AS uid), mas a dupla-envolvência
--   (( SELECT (SELECT auth.uid() AS uid) AS uid)) também existe.
--
-- EVIDÊNCIA (somente leitura, confirmada 2026-10-22):
--   SELECT count(*) FROM pg_policies
--   WHERE schemaname='public'
--     AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%');
--   → 590 policies com auth.uid() (inclui ambas as formas)
--
-- SOLUÇÃO:
--   Para policies que NÃO usam (SELECT auth.uid()), substituir por
--   ((SELECT auth.uid()) = user_id) — ou equivalente para a tabela.
-- ============================================================

-- === IDENTIFICAR policies que precisam de correção ===
/*
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND (
    qual ~ 'auth\.uid\(\)' AND qual NOT ~ '\(SELECT auth\.uid\(\)'
    OR
    with_check ~ 'auth\.uid\(\)' AND with_check NOT ~ '\(SELECT auth\.uid\(\)'
  )
ORDER BY tablename, policyname
LIMIT 20;
*/

-- === APLICAÇÃO (EXEMPLO para tabela user_organizations) ===
-- NÃO EXECUTAR DIRETAMENTE — usar db-apply-migration.yml
/*
-- Substituir o padrão auth.uid() por (SELECT auth.uid())
-- Exemplo genérico — adaptar para cada policy específica:
DROP POLICY IF EXISTS "users_see_own_org" ON public.user_organizations;
CREATE POLICY "users_see_own_org" ON public.user_organizations
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
*/

-- === ROLLBACK ===
-- Por policy (restaurar definição anterior)

-- === RISCO DE REGRESSÃO ===
-- BAIXO: O comportamento semântico é idêntico — só a performance muda.
-- ATENÇÃO: Verificar se alguma policy depende de re-avaliação por linha
-- (padrão incomum mas possível em multi-tenant com RLS em cascata).

-- === ESFORÇO ===
-- Médio (590 policies — priorizar tabelas com alto seq_scan)
