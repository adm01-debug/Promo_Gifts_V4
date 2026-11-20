-- Rollback: 20261120013000_add_products_ships_separately
--
-- Remove a coluna products.ships_separately.
--
-- Não há backup a fazer: a coluna é um booleano com DEFAULT false e não guarda
-- nada além do próprio flag "não mistura". Para restaurar, reaplique a migration
-- e remarque os produtos (o conjunto marcado antes do rollback pode ser listado
-- com SELECT id, sku FROM public.products WHERE ships_separately antes de rodá-lo).
--
-- Antes de reverter, o código que lê a coluna (formulário de produto, importação
-- em massa e relatório de frete) precisa estar fora de produção: sem a coluna,
-- o select/insert que a cita devolve erro 400.

ALTER TABLE public.products
  DROP COLUMN IF EXISTS ships_separately;
