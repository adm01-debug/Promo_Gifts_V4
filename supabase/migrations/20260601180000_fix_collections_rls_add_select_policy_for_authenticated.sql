-- CORRIGIDA (2026-09-16) — sintaxe original inválida no PostgreSQL:
-- `CREATE POLICY IF NOT EXISTS` não existe (SQLSTATE 42601, "syntax error at or
-- near NOT"). Nunca pôde ter sido aplicada com este SQL. Ver
-- docs/plans/PLANO_DBA_CORRECOES_MELHORIAS_50_ETAPAS_2026-09-16.md.
--
-- Confirmado ao vivo em 2026-09-16 (pg_catalog): a policy `collections_own_select`
-- em public.collections JÁ EXISTE no projeto canônico — foi criada em algum
-- momento por fora deste arquivo (mesmo padrão de DDL aplicada via MCP/dashboard
-- já documentado para outras migrations desta safra). Esta correção só faz o
-- `supabase db diff` (shadow database, sempre vazia) conseguir recriá-la sem
-- erro de sintaxe; não muda nada no banco vivo, que já tem a policy.
DO $$
BEGIN
  CREATE POLICY collections_own_select
    ON public.collections
    FOR SELECT
    TO authenticated
    USING (
      (user_id = (SELECT auth.uid()))
      OR is_supervisor_or_above((SELECT auth.uid()))
    );
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'collections_own_select já existe — nada a fazer';
END;
$$;
