
-- DEFESA EM PROFUNDIDADE: discount_amount não-negativo (qualidade de dados).
-- Fecha a assimetria: discount_percent (CHECK 0-100) e negotiation_markup_percent
-- (CHECK 0-50) já eram guardados, mas discount_amount não tinha limite inferior.
-- O app já rejeita via validateDiscount ("O valor do desconto não pode ser negativo"),
-- mas SQL bruto/migração futura poderia inserir negativo, causando overcharge
-- (total = subtotal - discount_amount → aumenta o total).
-- Verificado: 0 linhas existentes violam (amount_negativo=0).
-- NULL permitido para manter consistência com os outros CHECKs.
ALTER TABLE public.quotes
  ADD CONSTRAINT valid_discount_amount_nonnegative
  CHECK (discount_amount IS NULL OR discount_amount >= 0);
;
