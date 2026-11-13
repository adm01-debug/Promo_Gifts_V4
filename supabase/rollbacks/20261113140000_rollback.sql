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

-- Opções semeadas por esta migration: remove só se nenhum produto/categoria usa.
DELETE FROM public.commemorative_dates c
WHERE c.slug IN ('dia-do-homem', 'setembro-amarelo', 'outubro-rosa', 'novembro-azul')
  AND c.created_at >= timestamptz '2026-11-13 00:00:00+00' -- só o que esta migration criou
  AND NOT EXISTS (SELECT 1 FROM public.product_commemorative_dates p WHERE p.commemorative_date_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.category_commemorative_dates k WHERE k.commemorative_date_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.variant_commemorative_dates v WHERE v.commemorative_date_id = c.id);
DELETE FROM public.target_audiences t
WHERE t.slug = 'produtor-rural'
  AND t.created_at >= timestamptz '2026-11-13 00:00:00+00'
  AND NOT EXISTS (SELECT 1 FROM public.product_target_audiences p WHERE p.target_audience_id = t.id)
  AND NOT EXISTS (SELECT 1 FROM public.category_target_audiences k WHERE k.target_audience_id = t.id);
