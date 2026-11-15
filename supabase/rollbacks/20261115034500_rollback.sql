-- Rollback: 20261115034500_rpc_sales_assistant_candidates
--
-- A migration cria uma função NOVA: `public.rpc_sales_assistant_candidates` não existia em
-- produção antes dela (verificado em `pg_proc` do canônico doufsxqlfjyuvxuezpln em
-- 2026-11-15: nenhuma função com esse nome). Portanto o estado anterior é "a função não
-- existe", e desfazer é removê-la.
--
-- Nada mais é tocado: a migration não cria tabela, não altera dado, não mexe em RLS e não
-- concede privilégio em objeto algum além da própria função. Os GRANTs de EXECUTE somem
-- junto com ela.
--
-- Efeito no app: o card de encaixe da ficha do cliente volta a não ter de onde buscar
-- candidatos e cai no estado vazio. Nenhum dado de produto é perdido.

DROP FUNCTION IF EXISTS public.rpc_sales_assistant_candidates(uuid, uuid[], numeric, numeric, int, int, int);
