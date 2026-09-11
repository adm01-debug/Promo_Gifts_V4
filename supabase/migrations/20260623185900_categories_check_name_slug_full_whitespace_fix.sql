-- APLICADO: 2026-06-23
-- GAP-5 descoberto durante Auditoria Rodada 3:
-- trim() no PostgreSQL só remove ASCII space (0x20).
-- Tab (\t), newline (\n), carriage return (\r), form feed (\f) NÃO são removidos.
-- Resultado: nomes/slugs com apenas \t ou \n passavam pelo CHECK anterior.
--
-- FIX: substituir trim() por regexp_replace com padrão \s (whitespace completo POSIX)
-- ANTES: CHECK (length(TRIM(BOTH FROM name)) > 0)
-- DEPOIS: CHECK (name !~ E'^[[:space:]]*$')
-- Leitura: "name não pode ser composto APENAS de caracteres whitespace"
-- Cobre: space, tab, newline, carriage return, form feed, vertical tab
-- ─────────────────────────────────────────────────────────────────────────────

-- name: substituir constraint fraca pela robusta
ALTER TABLE public.categories
  DROP CONSTRAINT chk_categories_name_not_empty;

ALTER TABLE public.categories
  ADD CONSTRAINT chk_categories_name_not_empty
  CHECK (name !~ E'^[[:space:]]*$');

COMMENT ON CONSTRAINT chk_categories_name_not_empty
  ON public.categories IS
  'Garante que name nunca seja vazio ou composto apenas de whitespace. '
  'Cobre: space, tab, newline, carriage return, form feed, vertical tab. '
  'Fix v2 (2026-06-23): substituiu trim() por regex [[:space:]] para cobertura completa.';

-- slug: substituir constraint fraca pela robusta
ALTER TABLE public.categories
  DROP CONSTRAINT chk_categories_slug_not_empty;

ALTER TABLE public.categories
  ADD CONSTRAINT chk_categories_slug_not_empty
  CHECK (slug !~ E'^[[:space:]]*$');

COMMENT ON CONSTRAINT chk_categories_slug_not_empty
  ON public.categories IS
  'Garante que slug nunca seja vazio ou composto apenas de whitespace. '
  'Cobre: space, tab, newline, carriage return, form feed, vertical tab. '
  'Fix v2 (2026-06-23): substituiu trim() por regex [[:space:]] para cobertura completa.';;
