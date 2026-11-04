CREATE OR REPLACE FUNCTION public.fn_rebuild_category_ancestors()
 RETURNS TABLE(deleted_rows bigint, inserted_rows bigint, duration_ms numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted  bigint;
  v_inserted bigint;
  v_start    timestamptz := clock_timestamp();
BEGIN
  -- Contar antes para reporting
  SELECT COUNT(*) INTO v_deleted FROM category_ancestors;

  -- Limpar e reconstruir atomicamente
  TRUNCATE category_ancestors;

  -- Inserir todos os pares antepassado→descendente via CTE recursiva
  -- Nota: exclui self-references (ancestor_id != descendant_id)
  WITH RECURSIVE tree AS (
    -- Base: cada categoria é "ancestral de si mesma" (ponto de partida)
    SELECT id AS ancestor_id, id AS node_id, 0 AS depth
    FROM   categories

    UNION ALL

    -- Expandir: cada filho passa a ser descendente de todos os ancestrais do pai
    SELECT t.ancestor_id, c.id AS node_id, t.depth + 1
    FROM   tree t
    JOIN   categories c ON c.parent_id = t.node_id
    WHERE  t.depth < 15  -- safety depth limit
  )
  INSERT INTO category_ancestors (ancestor_id, descendant_id, depth)
  SELECT DISTINCT ancestor_id, node_id, MIN(depth) OVER (PARTITION BY ancestor_id, node_id)
  FROM tree
  WHERE ancestor_id != node_id  -- excluir self-references
  ON CONFLICT (ancestor_id, descendant_id) DO UPDATE
    SET depth = EXCLUDED.depth;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN QUERY SELECT v_deleted, v_inserted, 
    EXTRACT(milliseconds FROM clock_timestamp() - v_start)::numeric(10,2);
END;
$function$
