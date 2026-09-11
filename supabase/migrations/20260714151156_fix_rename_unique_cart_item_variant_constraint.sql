
-- ============================================================
-- BUG FIX CRÍTICO: ON CONFLICT ON CONSTRAINT unique_cart_item_variant
-- A RPC restore_seller_cart usa esse nome mas só existia um UNIQUE INDEX
-- chamado seller_cart_items_uniq_item — sem constraint nomeada,
-- o ON CONFLICT lançaria "constraint does not exist" em produção.
--
-- Estratégia: drop do unique index existente + criação como named constraint
-- com NULLS NOT DISTINCT (comportamento idêntico, nome correto).
-- ============================================================

-- Pré-condição: garantir que não há duplicatas (segurança antes do DROP)
DO $$
DECLARE cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM (
    SELECT cart_id, product_id, COALESCE(color_name,'__NULL__')
    FROM public.seller_cart_items
    GROUP BY cart_id, product_id, COALESCE(color_name,'__NULL__')
    HAVING COUNT(*) > 1
  ) t;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'Existem % linhas duplicadas — abortar migration!', cnt;
  END IF;
END;
$$;

-- Drop do unique index (criado com CREATE UNIQUE INDEX — não é constraint nomeada)
DROP INDEX IF EXISTS public.seller_cart_items_uniq_item;

-- Cria como named constraint (ON CONFLICT ON CONSTRAINT funciona com esta forma)
ALTER TABLE public.seller_cart_items
  ADD CONSTRAINT unique_cart_item_variant
  UNIQUE NULLS NOT DISTINCT (cart_id, product_id, color_name);

-- Confirma que a constraint existe agora
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_cart_item_variant'
      AND conrelid = 'public.seller_cart_items'::regclass
  ) THEN
    RAISE EXCEPTION 'unique_cart_item_variant NAO foi criada!';
  END IF;
  RAISE NOTICE 'OK: unique_cart_item_variant criada como named constraint';
END;
$$;
;
