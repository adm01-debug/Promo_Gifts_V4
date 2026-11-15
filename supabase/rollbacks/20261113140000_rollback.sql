-- Rollback: 20261113140000_marketing_tab_links_rls_and_endomarketing.sql
-- Volta ao estado anterior: vínculos de datas/público só com SELECT (aba Marketing não grava)
-- e sem endomarketing. Antes do DROP, copia endomarketing_themes e product_endomarketing para
-- _backup_<tabela>_YYYYMMDD (CONTRIBUTING.md), com RLS e sem acesso de anon/authenticated;
-- reexecução no mesmo dia não sobrescreve o backup. Restaurar: recriar as tabelas com a migration
-- e INSERT ... SELECT a partir do backup.
-- Vínculos manuais criados em product_commemorative_dates/product_target_audiences ficam (dados).
-- As 4 datas e o público semeados ficam: o seed é condicional (WHERE NOT EXISTS) e não há como
-- distinguir com segurança o que a migration criou do que um admin cadastrou depois.

DROP POLICY IF EXISTS "pcd_oa_read_all" ON public.product_commemorative_dates;
DROP POLICY IF EXISTS "pcd_oa_ins" ON public.product_commemorative_dates;
DROP POLICY IF EXISTS "pcd_oa_upd" ON public.product_commemorative_dates;
DROP POLICY IF EXISTS "pcd_oa_del" ON public.product_commemorative_dates;
DROP POLICY IF EXISTS "pta_oa_ins" ON public.product_target_audiences;
DROP POLICY IF EXISTS "pta_oa_upd" ON public.product_target_audiences;
DROP POLICY IF EXISTS "pta_oa_del" ON public.product_target_audiences;

DO $$
DECLARE
  d text := to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
  t text;
  b text;
BEGIN
  FOREACH t IN ARRAY ARRAY['endomarketing_themes', 'product_endomarketing'] LOOP
    b := '_backup_' || t || '_' || d;
    IF to_regclass('public.' || t) IS NOT NULL AND to_regclass('public.' || b) IS NULL THEN
      EXECUTE format('CREATE TABLE public.%I AS TABLE public.%I', b, t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);
    END IF;
  END LOOP;
END $$;

DROP TABLE IF EXISTS public.product_endomarketing;
DROP TABLE IF EXISTS public.endomarketing_themes;
