-- is_active é flag de status booleana usada no RLS do catálogo público (filtra is_active=true) e no
-- trigger fn_enforce_inactive_variant_zero_stock (testa is_active IS NOT TRUE). NULL introduz lógica de
-- três valores (variante tratada como inativa/oculta de forma ambígua = bug magnet). Coluna tem default
-- true e 0 nulos. SET NOT NULL remove a ambiguidade; insert continua seguro (omitir => default true).
-- Dry-run 5/5: is_active=NULL rejeitado com 23502; is_active=true permitido.
ALTER TABLE public.product_variants ALTER COLUMN is_active SET NOT NULL;;
