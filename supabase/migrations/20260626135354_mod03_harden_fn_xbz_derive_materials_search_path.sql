-- Hardening 10/10: fixa search_path na unica funcao de material sem ele.
-- ALTER (nao CREATE OR REPLACE) p/ nao tocar no corpo (regex) e evitar risco de transcricao.
ALTER FUNCTION public.fn_xbz_derive_materials(text, text) SET search_path TO 'public';

COMMENT ON FUNCTION public.fn_xbz_derive_materials(text, text) IS
  'Deriva materiais XBZ a partir de nome/subtipo (regex puro, IMMUTABLE). '
  'fix_version 2026-06-26: SET search_path=public adicionado (anti-regressao Lovable - NAO REMOVER).';;
