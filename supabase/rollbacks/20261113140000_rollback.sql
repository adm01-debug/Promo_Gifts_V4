-- Rollback: 20261113140000_marketing_tab_links_rls_and_endomarketing.sql
-- Volta ao estado anterior: vínculos de datas/público só com SELECT (aba Marketing não grava)
-- e sem endomarketing. ATENÇÃO: apaga os vínculos de endomarketing gravados depois da migration.
-- Vínculos manuais criados em product_commemorative_dates/product_target_audiences ficam (dados).

DROP POLICY IF EXISTS "pcd_oa_read_all" ON public.product_commemorative_dates;
DROP POLICY IF EXISTS "pcd_oa_ins" ON public.product_commemorative_dates;
DROP POLICY IF EXISTS "pcd_oa_upd" ON public.product_commemorative_dates;
DROP POLICY IF EXISTS "pcd_oa_del" ON public.product_commemorative_dates;
DROP POLICY IF EXISTS "pta_oa_ins" ON public.product_target_audiences;
DROP POLICY IF EXISTS "pta_oa_upd" ON public.product_target_audiences;
DROP POLICY IF EXISTS "pta_oa_del" ON public.product_target_audiences;

DROP TABLE IF EXISTS public.product_endomarketing;
DROP TABLE IF EXISTS public.endomarketing_themes;
