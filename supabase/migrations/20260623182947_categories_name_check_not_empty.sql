-- APLICADO: 2026-06-23
-- GAP-1: name já tem NOT NULL. Adicionar CHECK que impede string vazia/só espaços.
-- Pre-check: 0 rows com name='' ou name NULL (verificado pré-execução).
-- Alinha categories com padrão de qualidade de dados 10/10.

ALTER TABLE public.categories
  ADD CONSTRAINT chk_categories_name_not_empty
  CHECK (length(trim(name)) > 0);

COMMENT ON CONSTRAINT chk_categories_name_not_empty
  ON public.categories IS
  'Garante que name nunca seja string vazia ou apenas espaços. '
  'Complementa o NOT NULL existente. Criado: 2026-06-23.';;
