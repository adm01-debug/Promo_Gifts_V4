-- Rollback: 20261119213000_create_shipping_boxes
--
-- Remove a tabela das caixas de transporte. Reverter faz o motor de frete
-- (src/lib/freight) ficar sem caixa cadastrada: todo plano passa a sair como
-- "nao_cabe: nenhuma caixa ativa cadastrada", sem quebrar orçamento nenhum.
--
-- Antes do DROP, copia shipping_boxes para _backup_shipping_boxes_YYYYMMDD
-- (CONTRIBUTING.md), com RLS ligada e sem acesso de anon/authenticated.
-- Reexecutar no mesmo dia não sobrescreve o backup.
--
-- Restaurar: reaplicar a migration e
--   INSERT INTO public.shipping_boxes
--     (id, code, name, outer_height_cm, outer_width_cm, outer_length_cm,
--      wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,
--      is_active, sort_order, created_at, updated_at, deleted_at)
--   SELECT id, code, name, outer_height_cm, outer_width_cm, outer_length_cm,
--          wall_thickness_mm, empty_weight_g, max_weight_g, fill_factor,
--          is_active, sort_order, created_at, updated_at, deleted_at
--   FROM public._backup_shipping_boxes_YYYYMMDD
-- As três colunas inner_* ficam de fora do INSERT de propósito: são geradas.
--
-- O DROP TABLE leva junto o trigger, os índices e as quatro policies. A função
-- public.update_updated_at_column() é compartilhada e NÃO é removida.

DO $$
DECLARE
  b text := '_backup_shipping_boxes_' || to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDD');
BEGIN
  IF to_regclass('public.shipping_boxes') IS NOT NULL AND to_regclass('public.' || b) IS NULL THEN
    EXECUTE format('CREATE TABLE public.%I AS TABLE public.shipping_boxes', b);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', b);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', b);
  END IF;
END $$;

DROP TABLE IF EXISTS public.shipping_boxes;
