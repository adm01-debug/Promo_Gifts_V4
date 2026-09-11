
-- FIX #17A: Adicionar CHECK constraint em gender
-- Apenas valores canônicos aceitos (ou NULL)
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_gender_valid
  CHECK (gender IS NULL OR gender IN ('masculino', 'feminino', 'infantil', 'unissex'));

COMMENT ON COLUMN public.products.gender IS
'Gênero do produto para badge #17. Valores válidos: masculino | feminino | infantil | unissex | NULL (sem gênero). Constraint chk_products_gender_valid impede valores livres.';
;
