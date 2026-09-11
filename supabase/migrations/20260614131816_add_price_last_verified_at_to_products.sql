
-- ============================================================
-- FIX #19A: Nova coluna price_last_verified_at
-- Distingue "preço verificado" (check) de "preço alterado" (price_updated_at)
-- XBZ: preços raramente mudam mas são verificados a cada sync
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_last_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.products.price_last_verified_at IS
'Última vez que o preço foi VERIFICADO (independente de ter mudado). Diferente de price_updated_at que só muda quando o preço muda. Usado para o badge #19 Freshness de Preço: stale = NOW()-price_last_verified_at > price_freshness_threshold_days. Atualizado pelo pipeline de sync de cada fornecedor.';
;
