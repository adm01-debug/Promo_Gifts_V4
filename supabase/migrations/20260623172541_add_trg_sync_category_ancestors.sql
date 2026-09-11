
-- ████████████████████████████████████████████████████████████████████████████
-- GAP FIX: Trigger de manutenção automática de category_ancestors
--
-- PROBLEMA: category_ancestors era snapshot estático. INSERTs/UPDATEs de
-- categorias não atualizavam a closure table, gerando dessincronização silenciosa.
--
-- SOLUÇÃO: AFTER trigger (INSERT/DELETE/UPDATE) que mantém category_ancestors
-- sincronizada com a árvore parent_id em tempo real.
--
-- DESIGN:
--  INSERT → adicionar pares (ancestral, NEW.id) para todos ancestrais do novo pai
--  DELETE → FK CASCADE já remove pares; trigger limpa pares onde esse nó era ancestral
--           de descendentes que não foram deletados (ON DELETE SET NULL)
--  UPDATE parent_id → recalcular pares do nó e de toda sua sub-árvore
-- ████████████████████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.fn_trigger_sync_category_ancestors()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN

  -- ─── INSERT: adicionar pares ancestral→NEW.id para cada ancestral do pai ──
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    WITH RECURSIVE anc(id, parent_id, depth) AS (
      SELECT c.id, c.parent_id, 1
      FROM   categories c WHERE c.id = NEW.parent_id
      UNION ALL
      SELECT c.id, c.parent_id, a.depth + 1
      FROM   categories c JOIN anc a ON c.id = a.parent_id
      WHERE  a.parent_id IS NOT NULL AND a.depth < 15
    )
    INSERT INTO category_ancestors (ancestor_id, descendant_id, depth)
    SELECT a.id, NEW.id, a.depth
    FROM   anc a
    ON CONFLICT (ancestor_id, descendant_id) DO UPDATE
        SET depth = EXCLUDED.depth;

    RETURN NEW;
  END IF;

  -- ─── DELETE: remover pares onde o nó deletado era ANCESTRAL ────────────────
  -- (o FK CASCADE já cuida dos pares onde o nó é DESCENDENTE)
  IF TG_OP = 'DELETE' THEN
    DELETE FROM category_ancestors
    WHERE ancestor_id = OLD.id;
    RETURN OLD;
  END IF;

  -- ─── UPDATE parent_id: recalcular pares do nó + toda sub-árvore ───────────
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN

    -- Coletar toda a sub-árvore movida (o nó + seus descendentes)
    WITH RECURSIVE subtree(id) AS (
      SELECT NEW.id
      UNION ALL
      SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id
    ),
    -- Novos ancestrais de NEW.parent_id
    new_ancestors(anc_id, depth) AS (
      SELECT c.id, 1
      FROM   categories c WHERE c.id = NEW.parent_id
      UNION ALL
      SELECT c.id, a.depth + 1
      FROM   categories c JOIN new_ancestors a ON c.id = a.parent_id
      WHERE  a.anc_id IS NOT NULL AND a.depth < 15
      -- workaround: re-join via subquery
    )
    SELECT 1; -- placeholder; execução abaixo é sequencial

    -- 1. Remover TODOS os pares antigos do subtree movido com ancestrais fora do novo ramo
    DELETE FROM category_ancestors ca
    WHERE ca.descendant_id IN (
        -- subtree sendo movida
        SELECT s.id FROM (
            WITH RECURSIVE sub AS (
                SELECT NEW.id AS id
                UNION ALL
                SELECT c.id FROM categories c JOIN sub s ON c.parent_id = s.id
            ) SELECT id FROM sub
        ) s
    )
    AND ca.ancestor_id NOT IN (
        -- ancestrais que ainda são válidos (os do NOVO pai)
        WITH RECURSIVE anc AS (
            SELECT NEW.id AS id
            UNION ALL
            SELECT c.id FROM categories c JOIN anc a ON c.id = a.parent_id
            WHERE a.id IS NOT NULL
        ) SELECT id FROM anc WHERE id <> NEW.id
    );

    -- 2. Inserir novos pares: cada ancestral do NOVO pai → cada nó da subtree
    WITH RECURSIVE
    new_ancs(id, depth) AS (
        SELECT c.id, 1
        FROM   categories c WHERE c.id = NEW.parent_id
        UNION ALL
        SELECT c.id, a.depth + 1
        FROM   categories c JOIN new_ancs a ON c.id = a.parent_id
        WHERE  a.id IS NOT NULL AND a.depth < 15
    ),
    subtree(id, rel_depth) AS (
        SELECT NEW.id, 0
        UNION ALL
        SELECT c.id, s.rel_depth + 1
        FROM   categories c JOIN subtree s ON c.parent_id = s.id
    )
    INSERT INTO category_ancestors (ancestor_id, descendant_id, depth)
    SELECT a.id, s.id, a.depth + s.rel_depth
    FROM   new_ancs a
    CROSS  JOIN subtree s
    ON CONFLICT (ancestor_id, descendant_id) DO UPDATE
        SET depth = EXCLUDED.depth;

  END IF;

  RETURN NEW;
END;
$function$;

-- Criar o trigger AFTER em categories
DROP TRIGGER IF EXISTS trg_sync_category_ancestors ON categories;

CREATE TRIGGER trg_sync_category_ancestors
AFTER INSERT OR DELETE OR UPDATE OF parent_id
ON categories
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_sync_category_ancestors();

GRANT EXECUTE ON FUNCTION fn_trigger_sync_category_ancestors() TO postgres, service_role;

COMMENT ON FUNCTION fn_trigger_sync_category_ancestors() IS
'AFTER trigger (INSERT/DELETE/UPDATE parent_id) que mantém category_ancestors
sincronizada com a árvore parent_id em tempo real.
INSERT → adiciona pares ancestral→nó.
DELETE → remove pares onde nó era ancestral (CASCADE cuida dos descendente).
UPDATE parent_id → recalcula pares do nó + sub-árvore inteira.
Criado: 2026-06-23 (Gap Fix da Auditoria Fase 2).';
;
