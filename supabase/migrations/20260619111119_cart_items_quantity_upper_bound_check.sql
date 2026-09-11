
-- Integridade do módulo Carrinhos: completa o invariante de quantidade em
-- seller_cart_items para 1 <= quantity <= 999999.
-- Migration local 20260618120000 que não foi aplicada em produção.

LOCK TABLE public.seller_cart_items IN SHARE ROW EXCLUSIVE MODE;

UPDATE public.seller_cart_items
SET quantity = 999999
WHERE quantity > 999999;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.seller_cart_items'::regclass
      AND conname = 'seller_cart_items_quantity_max'
  ) THEN
    ALTER TABLE public.seller_cart_items
      ADD CONSTRAINT seller_cart_items_quantity_max CHECK (quantity <= 999999);
  END IF;
END $$;
;
