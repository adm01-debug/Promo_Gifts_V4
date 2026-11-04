CREATE OR REPLACE FUNCTION public.prevent_category_loops()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_depth CONSTANT INTEGER := 10;
  v_path_depth INTEGER;
BEGIN
  -- Sem parent_id: categoria raiz, nada a verificar
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Auto-referência direta (A → A): checar antes da CTE (mais barato)
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Self-reference: category % cannot be its own parent', NEW.id;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- CTE única: percorre a cadeia de ancestrais de NEW.parent_id para cima
  -- Detecta simultaneamente:
  --   (1) Se NEW.id aparece na cadeia → referência circular
  --   (2) Qual a profundidade máxima da cadeia → violação de max_depth
  -- ─────────────────────────────────────────────────────────────────────────
  WITH RECURSIVE ancestor_chain(id, parent_id, depth) AS (
    -- Ponto de partida: o pai direto de NEW
    SELECT c.id, c.parent_id, 1 AS depth
    FROM   categories c
    WHERE  c.id = NEW.parent_id

    UNION ALL

    -- Subir na hierarquia
    SELECT c.id, c.parent_id, a.depth + 1
    FROM   categories c
    JOIN   ancestor_chain a ON c.id = a.parent_id
    WHERE  a.parent_id IS NOT NULL
      AND  a.depth < v_max_depth  -- stopper de segurança
  )
  SELECT MAX(depth) INTO v_path_depth FROM ancestor_chain;

  -- Verificação de ciclo: NEW.id existe como ancestral de NEW.parent_id?
  IF EXISTS (
    WITH RECURSIVE ancestor_chain(id, parent_id, depth) AS (
      SELECT c.id, c.parent_id, 1
      FROM   categories c
      WHERE  c.id = NEW.parent_id
      UNION ALL
      SELECT c.id, c.parent_id, a.depth + 1
      FROM   categories c
      JOIN   ancestor_chain a ON c.id = a.parent_id
      WHERE  a.parent_id IS NOT NULL AND a.depth < v_max_depth
    )
    SELECT 1 FROM ancestor_chain WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION
      'Circular reference: category % cannot be its own ancestor (detected in chain of %)',
      NEW.id, v_path_depth;
  END IF;

  -- Verificação de profundidade máxima
  -- v_path_depth = profundidade do pai → NEW ficará em depth + 1
  IF COALESCE(v_path_depth, 0) >= v_max_depth THEN
    RAISE EXCEPTION
      'Max hierarchy depth (%) exceeded: parent chain already has % levels',
      v_max_depth, v_path_depth;
  END IF;

  RETURN NEW;
END;
$function$
