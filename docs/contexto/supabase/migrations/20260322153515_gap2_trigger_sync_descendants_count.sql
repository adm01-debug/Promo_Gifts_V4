-- =================================================================
-- GAP 2 FIX: Trigger para manter descendants_count sincronizado
-- Criado em: 2026-03-22
-- =================================================================

CREATE OR REPLACE FUNCTION fn_trigger_sync_descendants_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_ancestor_id uuid;
  v_count integer;
BEGIN
  -- INSERT: incrementar todos os ancestrais
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    v_ancestor_id := NEW.parent_id;
    WHILE v_ancestor_id IS NOT NULL LOOP
      UPDATE categories SET descendants_count = descendants_count + 1
      WHERE id = v_ancestor_id;
      SELECT parent_id INTO v_ancestor_id FROM categories WHERE id = v_ancestor_id;
    END LOOP;
  END IF;

  -- DELETE: decrementar todos os ancestrais (1 + sub-árvore)
  IF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    v_ancestor_id := OLD.parent_id;
    WHILE v_ancestor_id IS NOT NULL LOOP
      UPDATE categories SET descendants_count = GREATEST(0, descendants_count - 1 - OLD.descendants_count)
      WHERE id = v_ancestor_id;
      SELECT parent_id INTO v_ancestor_id FROM categories WHERE id = v_ancestor_id;
    END LOOP;
    RETURN OLD;
  END IF;

  -- UPDATE parent_id: recalcular ambos os ramos via full recount
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    -- Recalcular ancestrais ANTIGOS
    IF OLD.parent_id IS NOT NULL THEN
      v_ancestor_id := OLD.parent_id;
      WHILE v_ancestor_id IS NOT NULL LOOP
        WITH RECURSIVE dtree AS (
          SELECT id FROM categories WHERE parent_id = v_ancestor_id
          UNION ALL
          SELECT c.id FROM categories c JOIN dtree d ON c.parent_id = d.id
        )
        SELECT COUNT(*) INTO v_count FROM dtree;
        UPDATE categories SET descendants_count = v_count WHERE id = v_ancestor_id;
        SELECT parent_id INTO v_ancestor_id FROM categories WHERE id = v_ancestor_id;
      END LOOP;
    END IF;
    -- Recalcular ancestrais NOVOS
    IF NEW.parent_id IS NOT NULL THEN
      v_ancestor_id := NEW.parent_id;
      WHILE v_ancestor_id IS NOT NULL LOOP
        WITH RECURSIVE dtree AS (
          SELECT id FROM categories WHERE parent_id = v_ancestor_id
          UNION ALL
          SELECT c.id FROM categories c JOIN dtree d ON c.parent_id = d.id
        )
        SELECT COUNT(*) INTO v_count FROM dtree;
        UPDATE categories SET descendants_count = v_count WHERE id = v_ancestor_id;
        SELECT parent_id INTO v_ancestor_id FROM categories WHERE id = v_ancestor_id;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_descendants_count
AFTER INSERT OR UPDATE OF parent_id OR DELETE ON categories
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_sync_descendants_count();

COMMENT ON FUNCTION fn_trigger_sync_descendants_count() IS 
'Mantém categories.descendants_count sincronizado. INSERT incrementa ancestrais, DELETE decrementa, UPDATE parent_id recalcula ambos os ramos. Criado 2026-03-22.';
