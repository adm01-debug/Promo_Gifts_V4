
-- ████████████████████████████████████████████████████████████████████████████
-- MELHORIA #4 — PARTE A: fn_rebuild_category_ancestors()
-- Função de reparo/rebuild da Closure Table.
-- Útil quando: migrações manuais, imports em massa, ou dessincronização detectada.
-- Uso: SELECT fn_rebuild_category_ancestors(); → retorna (deleted, inserted)
-- ████████████████████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.fn_rebuild_category_ancestors()
RETURNS TABLE (deleted_rows bigint, inserted_rows bigint, duration_ms numeric)
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
$function$;

GRANT EXECUTE ON FUNCTION public.fn_rebuild_category_ancestors() TO postgres, service_role;

COMMENT ON FUNCTION public.fn_rebuild_category_ancestors() IS
'Rebuild completo da closure table category_ancestors a partir do parent_id tree.
TRUNCATE + INSERT via CTE recursiva com depth safety limit = 15.
Retorna (deleted_rows, inserted_rows, duration_ms). Criado: 2026-06-23.
Uso: SELECT * FROM fn_rebuild_category_ancestors();';


-- ████████████████████████████████████████████████████████████████████████████
-- MELHORIA #4 — PARTE B: Desativar 2 categorias WARN (lv5, já is_visible=false)
-- Investigação confirmou: produtos têm 8-9 categorias; essas são granularidade
-- excessiva de uma taxonomia mais profunda que foi simplificada.
-- ████████████████████████████████████████████████████████████████████████████

UPDATE categories
SET 
    is_active  = false,
    updated_at = now()
WHERE id IN (
    '6b5895e2-a280-4b9f-b23b-b6869c897e75',  -- Kit Churrasco | Emb. Papel | 03 Peças (lv5)
    'cafa5167-927f-4fdc-8dfd-b5fede22a446'   -- Kit Churrasco | Emb. Alumínio | 05 Peças (lv5)
)
AND level >= 5
AND is_visible = false   -- guard: só desativa se já estava oculto
AND is_active = true;    -- idempotente: só atualiza se ainda estava ativo
;
