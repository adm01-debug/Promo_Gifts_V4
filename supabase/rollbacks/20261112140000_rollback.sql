-- Rollback: 20261112140000_fix_rls_supplier_products_raw_history_p2027
-- Volta ao estado anterior (particoes sem RLS e sem policies). Reabre o lint ERROR rls_disabled_in_public.

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_03;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_03;
ALTER TABLE public.supplier_products_raw_history_p2027_03 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_04;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_04;
ALTER TABLE public.supplier_products_raw_history_p2027_04 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_05;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_05;
ALTER TABLE public.supplier_products_raw_history_p2027_05 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_06;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_06;
ALTER TABLE public.supplier_products_raw_history_p2027_06 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_07;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_07;
ALTER TABLE public.supplier_products_raw_history_p2027_07 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_08;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_08;
ALTER TABLE public.supplier_products_raw_history_p2027_08 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_09;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_09;
ALTER TABLE public.supplier_products_raw_history_p2027_09 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_10;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_10;
ALTER TABLE public.supplier_products_raw_history_p2027_10 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_11;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_11;
ALTER TABLE public.supplier_products_raw_history_p2027_11 DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hist_select_admin ON public.supplier_products_raw_history_p2027_12;
DROP POLICY IF EXISTS hist_all_service ON public.supplier_products_raw_history_p2027_12;
ALTER TABLE public.supplier_products_raw_history_p2027_12 DISABLE ROW LEVEL SECURITY;
