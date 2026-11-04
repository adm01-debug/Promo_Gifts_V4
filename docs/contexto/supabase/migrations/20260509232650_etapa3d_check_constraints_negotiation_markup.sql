-- Adicionar CHECK constraints que faltaram na migration anterior
ALTER TABLE public.quotes 
  ADD CONSTRAINT valid_negotiation_markup_range 
  CHECK (negotiation_markup_percent IS NULL OR (negotiation_markup_percent >= 0 AND negotiation_markup_percent <= 50));

ALTER TABLE public.quotes 
  ADD CONSTRAINT valid_discount_percent_range 
  CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100));

COMMENT ON CONSTRAINT valid_negotiation_markup_range ON public.quotes IS
  'Markup interno limitado a 0-50%. Inflar mais que isso indica problema de configuração ou abuso.';
