
-- ████████████████████████████████████████████████████████████████████████████
-- FIX v2: fn_trigger_sync_category_ancestors — reescrita completa do UPDATE case
-- Bug anterior: CTE com named columns (anc_id) mas join tentava usar a.parent_id
-- Correção: CTEs simples sem named columns, terminação por parent_id IS NULL
-- ████████████████████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.fn_trigger_sync_category_ancestors()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN

  -- ─── INSERT ──────────────────────────────────────────────────────────────
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    WITH RECURSIVE anc AS (
      SELECT c.id, c.parent_id, 1 AS depth
      FROM   categories c WHERE c.id = NEW.parent_id
      UNION ALL
      SELECT c.id, c.parent_id, a.depth + 1
      FROM   categories c
      JOIN   anc a ON c.id = a.parent_id
      WHERE  a.parent_id IS NOT NULL AND a.depth < 15
    )
    INSERT INTO category_ancestors (ancestor_id, descendant_id, depth)
    SELECT a.id, NEW.id, a.depth
    FROM   anc a
    ON CONFLICT (ancestor_id, descendant_id)
        DO UPDATE SET depth = EXCLUDED.depth;
    RETURN NEW;
  END IF;

  -- ─── DELETE ──────────────────────────────────────────────────────────────
  -- FK CASCADE já cuida dos pares onde o nó é DESCENDENTE.
  -- Aqui limpamos pares onde o nó deletado era ANCESTRAL de descendentes
  -- que migraram para NULL (ON DELETE SET NULL → viraram raízes).
  IF TG_OP = 'DELETE' THEN
    DELETE FROM category_ancestors WHERE ancestor_id = OLD.id;
    RETURN OLD;
  END IF;

  -- ─── UPDATE parent_id ────────────────────────────────────────────────────
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN

    -- Passo 1: Remover pares EXTERNOS ao subtree (de ancestrais fora do subtree)
    -- "Externos" = ancestor_id NÃO pertence ao próprio subtree movido
    DELETE FROM category_ancestors ca
    WHERE ca.descendant_id IN (
      -- Toda a sub-árvore sendo movida (NEW.id + seus descendentes)
      WITH RECURSIVE sub AS (
        SELECT NEW.id AS id
        UNION ALL
        SELECT c.id FROM categories c
        JOIN   sub s ON c.parent_id = s.id
      )
      SELECT id FROM sub
    )
    AND ca.ancestor_id NOT IN (
      -- Os nós INTERNOS do subtree (não devem ser removidos)
      WITH RECURSIVE sub AS (
        SELECT NEW.id AS id
        UNION ALL
        SELECT c.id FROM categories c
        JOIN   sub s ON c.parent_id = s.id
      )
      SELECT id FROM sub
    );

    -- Passo 2: Inserir novos pares externos (ancestrais de NEW.parent_id × subtree)
    IF NEW.parent_id IS NOT NULL THEN
      WITH RECURSIVE
      new_anc AS (
        SELECT c.id, c.parent_id, 1 AS depth
        FROM   categories c WHERE c.id = NEW.parent_id
        UNION ALL
        SELECT c.id, c.parent_id, a.depth + 1
        FROM   categories c
        JOIN   new_anc a ON c.id = a.parent_id
        WHERE  a.parent_id IS NOT NULL AND a.depth < 15
      ),
      sub AS (
        SELECT NEW.id AS id, 0 AS rel_depth
        UNION ALL
        SELECT c.id, s.rel_depth + 1
        FROM   categories c
        JOIN   sub s ON c.parent_id = s.id
      )
      INSERT INTO category_ancestors (ancestor_id, descendant_id, depth)
      SELECT na.id, s.id, na.depth + s.rel_depth
      FROM   new_anc na
      CROSS  JOIN sub s
      ON CONFLICT (ancestor_id, descendant_id)
          DO UPDATE SET depth = EXCLUDED.depth;
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION fn_trigger_sync_category_ancestors() IS
'AFTER trigger (INSERT/DELETE/UPDATE parent_id) que mantém category_ancestors
sincronizada com a árvore parent_id em tempo real.
v2 (2026-06-23): Fix no UPDATE case — CTEs simples sem named columns incorretos.
INSERT → adiciona pares ancestral→nó para cada ancestral do pai.
DELETE → remove pares onde nó era ancestral (FK CASCADE cobre descendentes).
UPDATE parent_id → (1) remove pares externos antigos, (2) insere pares externos novos.
Criado: 2026-06-23.';
;
