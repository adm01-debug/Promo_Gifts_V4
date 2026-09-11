
-- FIX #8A: Adicionar low_stock_threshold à tabela suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 10
    CONSTRAINT chk_low_stock_threshold_positive CHECK (low_stock_threshold > 0);

COMMENT ON COLUMN public.suppliers.low_stock_threshold IS
'Threshold de estoque baixo para o badge "Estoque Baixo" no catálogo. Padrão 10 unidades. Configurável por fornecedor pois volumes variam muito (XBZ/Spot: pequenos lotes, Asia Import: grandes volumes).';
;
