
-- ══════════════════════════════════════════════════════════════
-- M8: CHECK constraint de comprimento máximo em products.name
-- Rationale: max atual = 183 chars (Spot). Limit 250 é 36% acima
-- do pior caso real, dá margem p/ Spot continuar mas bloqueia
-- nomes > 250 chars que definitivamente são erros de pipeline.
-- NOT VALID + VALIDATE separado: valida sem lock exclusivo.
-- Como 0 registros violam (max=183), VALIDATE é instantâneo.
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_name_max_length
  CHECK (length(name) <= 250)
  NOT VALID;

-- Validar sem lock de tabela (seguro em produção)
ALTER TABLE public.products
  VALIDATE CONSTRAINT chk_products_name_max_length;
;
