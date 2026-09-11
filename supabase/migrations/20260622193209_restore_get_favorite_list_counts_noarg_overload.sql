
-- ============================================================
-- get_favorite_list_counts() — restaurar overload sem parâmetro
-- 
-- CONTEXTO: A overload () foi detectada como ausente na bateria
-- de validação pós-correção. O overload (_user_id uuid) criado
-- na migration anterior está correto; a versão () (que usa auth.uid()
-- internamente) precisou ser restaurada.
-- 
-- Body reconstruído da definição capturada no início da sessão:
--   SELECT fl.id, COUNT(fi.id)::bigint
--   FROM favorite_lists fl
--   LEFT JOIN favorite_items fi ON fi.list_id = fl.id
--   WHERE fl.user_id = (SELECT auth.uid())
--     AND fl.is_archived = false
--   GROUP BY fl.id ORDER BY fl.position ASC NULLS LAST, fl.created_at ASC
--
-- Grants originais: postgres/authenticated/service_role/anon = EXECUTE
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_favorite_list_counts()
RETURNS TABLE(list_id uuid, item_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    fl.id                    AS list_id,
    COUNT(fi.id)::bigint     AS item_count
  FROM favorite_lists fl
  LEFT JOIN favorite_items fi ON fi.list_id = fl.id
  WHERE fl.user_id = (SELECT auth.uid())
    AND fl.is_archived = false
  GROUP BY fl.id
  ORDER BY fl.position ASC NULLS LAST, fl.created_at ASC;
$$;

-- Grants idênticos ao original
GRANT EXECUTE ON FUNCTION public.get_favorite_list_counts()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_favorite_list_counts()        TO service_role;
GRANT EXECUTE ON FUNCTION public.get_favorite_list_counts()        TO anon;

-- Sanity-check: ambos os overloads devem existir
DO $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM pg_proc
  WHERE proname = 'get_favorite_list_counts';
  IF v_count != 2 THEN
    RAISE EXCEPTION 'Esperado exatamente 2 overloads, encontrado %', v_count;
  END IF;
END $$;
;
