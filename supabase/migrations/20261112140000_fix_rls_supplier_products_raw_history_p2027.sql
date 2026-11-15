-- RLS nas particoes p2027_03..p2027_12 de supplier_products_raw_history.
-- Causa: 20261104100000_partitions_supplier_products_raw_history_2027.sql:14-52 criou as particoes
-- com CREATE TABLE ... PARTITION OF sem ENABLE ROW LEVEL SECURITY e sem as policies que
-- fn_purge_spr_history aplica as particoes que ela mesma cria. Resultado: lint ERROR
-- rls_disabled_in_public (10x) e Supabase Linter Gate vermelho no main.
-- Correcao: mesmo modelo da tabela-mae e de p2027_02 (prod, pg_policies em 2026-11-12):
--   hist_all_service   ALL    service_role  USING true WITH CHECK true
--   hist_select_admin  SELECT authenticated USING is_admin_or_above((SELECT auth.uid()))
-- Particoes vazias (0 linhas >= 2027-03): sem efeito em dado.
-- Rollback: supabase/rollbacks/20261112140000_rollback.sql

ALTER TABLE public.supplier_products_raw_history_p2027_03 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_03;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_03 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_03;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_03 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_04 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_04;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_04 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_04;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_04 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_05 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_05;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_05 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_05;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_05 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_06 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_06;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_06 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_06;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_06 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_07 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_07;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_07 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_07;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_07 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_08 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_08;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_08 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_08;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_08 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_09 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_09;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_09 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_09;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_09 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_10 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_10;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_10 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_10;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_10 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_11 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_11;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_11 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_11;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_11 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

ALTER TABLE public.supplier_products_raw_history_p2027_12 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_12;
CREATE POLICY hist_all_service ON public.supplier_products_raw_history_p2027_12 FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_12;
CREATE POLICY hist_select_admin ON public.supplier_products_raw_history_p2027_12 FOR SELECT TO authenticated USING (public.is_admin_or_above((SELECT auth.uid())));

-- Assercao: as 10 particoes com RLS e 2 policies cada.
DO $$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(c.relname, ', ') INTO v_bad
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname ~ '^supplier_products_raw_history_p2027_(0[3-9]|1[0-2])$'
     AND (NOT c.relrowsecurity
          OR (SELECT count(*) FROM pg_catalog.pg_policies p
               WHERE p.schemaname = 'public' AND p.tablename = c.relname
                 AND p.policyname IN ('hist_all_service', 'hist_select_admin')) <> 2);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'rls-p2027: particoes sem RLS/policies: %', v_bad;
  END IF;
END;
$$;
