-- ============================================================
-- MELHORIA 4B: Aposentar supplier_price_tiers (snapshot órfão de 13/06)
-- Após 4A, nenhuma função/view/matview/FK/cron a referencia.
-- Era a 2ª fonte de verdade de preço, divergindo da viva (VSS) em ~18%.
-- Dados preservados em _archive_supplier_price_tiers_20260626 (31.157 linhas).
-- Resultado: fonte ÚNICA de preço (VSS), drift impossível por construção.
-- ============================================================
CREATE TABLE IF NOT EXISTS public._archive_supplier_price_tiers_20260626 AS
  SELECT * FROM public.supplier_price_tiers;

COMMENT ON TABLE public._archive_supplier_price_tiers_20260626 IS
  'Archive de supplier_price_tiers (aposentada 2026-06-26). Snapshot stale de 13/06; substituída pela fonte viva VSS via get_variant_price. Reversível se necessário.';

DROP TABLE public.supplier_price_tiers CASCADE;

NOTIFY pgrst, 'reload schema';;
