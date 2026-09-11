
-- MELHORIA-01: Remover policies SELECT duplicadas em tabela_preco_gravacao_oficial
-- e tabela_preco_gravacao_oficial_faixa — ambas têm 2 policies SELECT idênticas
-- (mesma expressão USING, mesmo conjunto de roles). PostgreSQL avalia com OR
-- entre elas — não há dano funcional, mas é ruído de governança e overhead de plan.
-- Mantemos a policy original (public_read) e removemos as novas (tpgo_authenticated_read)
-- que criamos redundantemente no fix de ontem.

DROP POLICY IF EXISTS tpgo_authenticated_read ON public.tabela_preco_gravacao_oficial;
DROP POLICY IF EXISTS tpgof_authenticated_read ON public.tabela_preco_gravacao_oficial_faixa;

-- Validação: deve restar exatamente 1 policy SELECT por tabela
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('tabela_preco_gravacao_oficial','tabela_preco_gravacao_oficial_faixa')
  AND cmd='SELECT';
;
