
-- ============================================================
-- BUG FIX: adiciona coluna shipping_deadline em seller_carts
-- Criada pelo Lovable em 20260713101342 mas nunca aplicada ao banco canônico
-- ============================================================
ALTER TABLE public.seller_carts
  ADD COLUMN IF NOT EXISTS shipping_deadline date NULL;

COMMENT ON COLUMN public.seller_carts.shipping_deadline IS
  'Prazo p/ envio: data limite (DATE) para enviar o pedido ao cliente. Null quando não definido.';
;
