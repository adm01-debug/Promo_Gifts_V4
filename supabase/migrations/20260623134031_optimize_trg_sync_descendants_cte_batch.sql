
-- ████████████████████████████████████████████████████████████████████████████
-- MELHORIA #1: fn_trigger_sync_descendants_count
-- ANTES : WHILE loop → N UPDATEs sequenciais (1 por nível de profundidade)
-- DEPOIS: CTE batch  → 1 UPDATE batch para todos os ancestrais
-- GANHO : Inserção nível 4 = 4 round trips → 1 round trip (redução 4x)
-- SEGURO: GREATEST(0,…) guard mantido; depth safety limit = 15; AFTER trigger
-- ████████████████████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.fn_trigger_sync_descendants_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_delta INTEGER;
BEGIN
  -- ─────────────────────────────────────────────────────────────────────────
  -- INSERT: incrementar todos os ancestrais em +1 — CTE batch (1 UPDATE total)
  -- ─────────────────────────────────────────────────────────────────────────
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    WITH RECURSIVE ancestors(id, parent_id, depth) AS (
      SELECT c.id, c.parent_id, 1
      FROM   categories c
      WHERE  c.id = NEW.parent_id
      UNION ALL
      SELECT c.id, c.parent_id, a.depth + 1
      FROM   categories c
      JOIN   ancestors a ON c.id = a.parent_id
      WHERE  a.parent_id IS NOT NULL
        AND  a.depth < 15  -- safety: bem acima dos 6 níveis ativos
    )
    UPDATE categories
    SET    descendants_count = descendants_count + 1
    WHERE  id IN (SELECT id FROM ancestors);

    RETURN NEW;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- DELETE: decrementar ancestrais por (1 + subtree) — CTE batch
  -- OLD.descendants_count já reflete o estado pré-deleção (trigger AFTER)
  -- ─────────────────────────────────────────────────────────────────────────
  IF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    v_delta := 1 + COALESCE(OLD.descendants_count, 0);

    WITH RECURSIVE ancestors(id, parent_id, depth) AS (
      SELECT c.id, c.parent_id, 1
      FROM   categories c
      WHERE  c.id = OLD.parent_id
      UNION ALL
      SELECT c.id, c.parent_id, a.depth + 1
      FROM   categories c
      JOIN   ancestors a ON c.id = a.parent_id
      WHERE  a.parent_id IS NOT NULL
        AND  a.depth < 15
    )
    UPDATE categories
    SET    descendants_count = GREATEST(0, descendants_count - v_delta)
    WHERE  id IN (SELECT id FROM ancestors);

    RETURN OLD;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- UPDATE parent_id: abordagem delta nos dois ramos — 2 CTEs batch
  --
  -- v_delta = subtree sendo movida (a categoria + todos seus descendentes)
  -- Ancestrais compartilhados recebem -delta e +delta → net = 0 ✓
  -- Sem full-recount (que exigia 1 CTE por ancestral no loop anterior)
  -- ─────────────────────────────────────────────────────────────────────────
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    v_delta := 1 + COALESCE(OLD.descendants_count, 0);

    -- Ramo ANTIGO: decrementar (categoria + subtree saiu)
    IF OLD.parent_id IS NOT NULL THEN
      WITH RECURSIVE old_ancestors(id, parent_id, depth) AS (
        SELECT c.id, c.parent_id, 1
        FROM   categories c
        WHERE  c.id = OLD.parent_id
        UNION ALL
        SELECT c.id, c.parent_id, a.depth + 1
        FROM   categories c
        JOIN   old_ancestors a ON c.id = a.parent_id
        WHERE  a.parent_id IS NOT NULL
          AND  a.depth < 15
      )
      UPDATE categories
      SET    descendants_count = GREATEST(0, descendants_count - v_delta)
      WHERE  id IN (SELECT id FROM old_ancestors);
    END IF;

    -- Ramo NOVO: incrementar (categoria + subtree chegou)
    IF NEW.parent_id IS NOT NULL THEN
      WITH RECURSIVE new_ancestors(id, parent_id, depth) AS (
        SELECT c.id, c.parent_id, 1
        FROM   categories c
        WHERE  c.id = NEW.parent_id
        UNION ALL
        SELECT c.id, c.parent_id, a.depth + 1
        FROM   categories c
        JOIN   new_ancestors a ON c.id = a.parent_id
        WHERE  a.parent_id IS NOT NULL
          AND  a.depth < 15
      )
      UPDATE categories
      SET    descendants_count = descendants_count + v_delta
      WHERE  id IN (SELECT id FROM new_ancestors);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Garantir permissão
GRANT EXECUTE ON FUNCTION public.fn_trigger_sync_descendants_count() TO postgres, service_role;

COMMENT ON FUNCTION public.fn_trigger_sync_descendants_count() IS
'AFTER trigger (INSERT/DELETE/UPDATE) que mantém descendants_count de todos os
ancestrais de uma categoria. Usa CTE batch recursiva em vez de WHILE loop —
reduz de N round-trips (1/nível) para 1 UPDATE batch. Abordagem delta no UPDATE
parent_id evita full-recount por ancestral. Safety: depth < 15, GREATEST(0,…).
Otimizado em: 2026-06-23.';
;
