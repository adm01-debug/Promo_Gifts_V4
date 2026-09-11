-- APLICADO: 2026-06-23
-- GAP-4a: products_count é nullable mas tem DEFAULT 0 e CHECK >= 0.
-- 0 NULLs verificados pré-execução → seguro para ADD NOT NULL.
-- Alinha com padrão de counters do schema (children_count, descendants_count
-- que já têm NOT NULL implícito via CHECK >= 0).

ALTER TABLE public.categories
  ALTER COLUMN products_count SET NOT NULL;;
