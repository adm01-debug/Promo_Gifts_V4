-- transaction: none
-- (CREATE INDEX CONCURRENTLY não pode rodar dentro de transação — psql -1. O opt-out exige também
--  uma linha própria "-- approved-by: <dono>": é a aprovação humana e entra só no momento da
--  aplicação, nunca antes. Sem ela o preflight bloqueia, como deve.)
-- Rollback: supabase/rollbacks/20261113235000_rollback.sql
-- Índice parcial para a ordenação "mais novos" do catálogo (v_products_public ORDER BY created_at
-- DESC, id ASC). Em produção (2026-11-13) não há índice em products(created_at): a consulta do
-- PostgREST faz Sort de ~7.500 linhas (617 B cada) a cada chamada — 18.163 chamadas × 1.033 ms em
-- 12,8 h. O predicado parcial é o mesmo da view (WHERE p.is_deleted IS NOT TRUE AND p.is_active =
-- true; pg_get_viewdef) e o PostgREST só acrescenta active = true, então o planner pode usar o
-- índice com Index Scan + LIMIT em vez de Bitmap Heap Scan + Sort.
-- Aplicar pela porta 5432 (E078); o CONCURRENTLY não bloqueia escrita em products.
-- O db-apply-migration usa lock_timeout=1s: o CONCURRENTLY espera transações antigas, então esta
-- sessão usa lock_timeout generoso. Se uma tentativa anterior deixou o índice INVÁLIDO, o
-- IF NOT EXISTS o esconderia — por isso a guarda final falha alto; nesse caso rode o rollback
-- (DROP INDEX CONCURRENTLY) e reaplique.
SET lock_timeout = '5min';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_created_at_desc
  ON public.products (created_at DESC, id)
  WHERE is_active = true AND is_deleted IS NOT TRUE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = to_regclass('public.idx_products_active_created_at_desc') AND indisvalid) THEN
    RAISE EXCEPTION 'idx_products_active_created_at_desc ausente ou INVÁLIDO após CREATE INDEX CONCURRENTLY — rode o rollback (DROP INDEX CONCURRENTLY) e reaplique';
  END IF;
END $$;
