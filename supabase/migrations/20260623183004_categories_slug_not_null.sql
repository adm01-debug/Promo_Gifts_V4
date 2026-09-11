-- APLICADO: 2026-06-23
-- GAP-2: slug é nullable, mas 0 NULLs existem (verificado pré-execução).
-- slug é campo crítico de roteamento URL. Deve ser NOT NULL para garantir
-- que nenhum ETL/bot crie categorias sem slug (quebraria o frontend).

ALTER TABLE public.categories
  ALTER COLUMN slug SET NOT NULL;

-- Complemento: CHECK que slug não seja vazio (defesa em profundidade)
ALTER TABLE public.categories
  ADD CONSTRAINT chk_categories_slug_not_empty
  CHECK (length(trim(slug)) > 0);

COMMENT ON CONSTRAINT chk_categories_slug_not_empty
  ON public.categories IS
  'Garante que slug nunca seja string vazia ou apenas espaços. '
  'Complementa o NOT NULL adicionado em 2026-06-23.';;
