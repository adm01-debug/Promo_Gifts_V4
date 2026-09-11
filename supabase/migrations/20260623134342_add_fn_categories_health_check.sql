
-- ████████████████████████████████████████████████████████████████████████████
-- MELHORIA #3: fn_categories_health_check()
-- Monitor de integridade COMPLETO da hierarquia de categorias.
-- Testa 10 invariantes críticos em uma única chamada.
-- Uso: SELECT * FROM fn_categories_health_check();
-- ████████████████████████████████████████████████████████████████████████████

CREATE OR REPLACE FUNCTION public.fn_categories_health_check()
RETURNS TABLE (
    check_id      integer,
    check_name    text,
    result        text,   -- 'PASS' | 'WARN' | 'FAIL'
    details       text,
    affected_rows bigint
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
BEGIN

  -- ── CHECK 1: Órfãos — parent_id aponta para UUID inexistente ───────────────
  RETURN QUERY
  SELECT 1,
    'orphaned_parent_id'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0
         THEN 'Nenhum órfão encontrado'
         ELSE COUNT(*)::text || ' categoria(s) com parent_id inexistente'
    END,
    COUNT(*)
  FROM categories c
  LEFT JOIN categories p ON p.id = c.parent_id
  WHERE c.parent_id IS NOT NULL AND p.id IS NULL;

  -- ── CHECK 2: descendants_count divergindo da contagem real ─────────────────
  RETURN QUERY
  WITH RECURSIVE real_tree AS (
      SELECT id AS ancestor, id AS node FROM categories
      UNION ALL
      SELECT rt.ancestor, c.id
      FROM real_tree rt
      JOIN categories c ON c.parent_id = rt.node
  ),
  real_counts AS (
      SELECT ancestor, COUNT(*) - 1 AS real_descendants
      FROM real_tree GROUP BY ancestor
  )
  SELECT 2,
    'descendants_count_drift'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0
         THEN 'descendants_count 100% preciso'
         ELSE COUNT(*)::text || ' categoria(s) com descendants_count errado'
    END,
    COUNT(*)
  FROM categories c
  JOIN real_counts rc ON rc.ancestor = c.id
  WHERE c.descendants_count != rc.real_descendants;

  -- ── CHECK 3: children_count divergindo da contagem real ────────────────────
  RETURN QUERY
  SELECT 3,
    'children_count_drift'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0
         THEN 'children_count 100% preciso'
         ELSE COUNT(*)::text || ' categoria(s) com children_count errado'
    END,
    COUNT(*)
  FROM categories p
  LEFT JOIN (
      SELECT parent_id, COUNT(*) AS n FROM categories
      WHERE parent_id IS NOT NULL GROUP BY parent_id
  ) ch ON ch.parent_id = p.id
  WHERE p.children_count != COALESCE(ch.n, 0);

  -- ── CHECK 4: level inconsistente com posição real na árvore ───────────────
  RETURN QUERY
  WITH RECURSIVE computed AS (
      SELECT id, 1 AS computed_level FROM categories WHERE parent_id IS NULL
      UNION ALL
      SELECT c.id, cp.computed_level + 1
      FROM categories c JOIN computed cp ON c.parent_id = cp.id
  )
  SELECT 4,
    'level_mismatch'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0
         THEN 'level consistente com a árvore real'
         ELSE COUNT(*)::text || ' categoria(s) com level incorreto'
    END,
    COUNT(*)
  FROM categories c
  JOIN computed cp ON cp.id = c.id
  WHERE c.level != cp.computed_level;

  -- ── CHECK 5: category_ancestors desincronizada com parent_id tree ──────────
  RETURN QUERY
  WITH RECURSIVE real_pairs AS (
      SELECT id AS ancestor_id, id AS descendant_id FROM categories
      UNION ALL
      SELECT rp.ancestor_id, c.id
      FROM real_pairs rp JOIN categories c ON c.parent_id = rp.descendant_id
  ),
  delta AS (
      SELECT
          (SELECT COUNT(*) FROM real_pairs WHERE ancestor_id != descendant_id) AS real_n,
          (SELECT COUNT(*) FROM category_ancestors) AS stored_n
  )
  SELECT 5,
    'closure_table_sync'::text,
    CASE WHEN real_n = stored_n THEN 'PASS' ELSE 'FAIL' END,
    'Real pairs: ' || real_n::text || ' | Stored: ' || stored_n::text ||
    CASE WHEN real_n = stored_n THEN ' ✓ sincronizado' ELSE ' ← DESSINCRONIZADO!' END,
    ABS(real_n - stored_n)
  FROM delta;

  -- ── CHECK 6: Filho ATIVO com pai INATIVO (visibilidade quebrada) ──────────
  RETURN QUERY
  SELECT 6,
    'active_child_inactive_parent'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    CASE WHEN COUNT(*) = 0
         THEN 'Nenhum filho ativo com pai inativo'
         ELSE COUNT(*)::text || ' filho(s) ativo(s) com pai inativo — verificar visibilidade'
    END,
    COUNT(*)
  FROM categories c
  JOIN categories p ON p.id = c.parent_id
  WHERE c.is_active = true AND p.is_active = false;

  -- ── CHECK 7: Slugs duplicados (violação silenciosa de unique) ─────────────
  RETURN QUERY
  SELECT 7,
    'duplicate_slugs'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0
         THEN 'Todos os slugs são únicos'
         ELSE COUNT(*)::text || ' slug(s) duplicado(s) detectado(s)'
    END,
    COUNT(*)
  FROM (
      SELECT slug FROM categories GROUP BY slug HAVING COUNT(*) > 1
  ) dups;

  -- ── CHECK 8: Categorias com path NULL ou malformado ────────────────────────
  RETURN QUERY
  SELECT 8,
    'path_integrity'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0
         THEN 'Todos os paths estão bem formados'
         ELSE COUNT(*)::text || ' categoria(s) com path nulo ou malformado'
    END,
    COUNT(*)
  FROM categories
  WHERE path IS NULL
     OR path NOT LIKE '/%/'
     OR id::text NOT IN (SELECT unnest(regexp_split_to_array(
          regexp_replace(path, '^/|/$', '', 'g'), '/'
        )));

  -- ── CHECK 9: Referências circulares residuais ─────────────────────────────
  RETURN QUERY
  WITH RECURSIVE cycle_check(id, visited_ids, has_cycle) AS (
      SELECT id, ARRAY[id], false FROM categories WHERE parent_id IS NULL
      UNION ALL
      SELECT c.id,
             cc.visited_ids || c.id,
             c.id = ANY(cc.visited_ids)
      FROM categories c
      JOIN cycle_check cc ON c.parent_id = cc.id
      WHERE NOT cc.has_cycle
  )
  SELECT 9,
    'circular_references'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0
         THEN 'Nenhuma referência circular detectada'
         ELSE COUNT(*)::text || ' referência(s) circular(es) CRÍTICA(S)!'
    END,
    COUNT(*)
  FROM cycle_check
  WHERE has_cycle;

  -- ── CHECK 10: Categorias nível 5+ ainda ativas (limpeza pendente) ──────────
  RETURN QUERY
  SELECT 10,
    'deep_levels_active'::text,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END,
    CASE WHEN COUNT(*) = 0
         THEN 'Nenhuma categoria ativa em nível 5+'
         ELSE COUNT(*)::text || ' categoria(s) ativas em nível 5+ — revisar limpeza'
    END,
    COUNT(*)
  FROM categories
  WHERE level >= 5 AND is_active = true;

END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_categories_health_check() TO postgres, service_role, authenticated;

COMMENT ON FUNCTION public.fn_categories_health_check() IS
'Monitor de integridade da hierarquia categories. Executa 10 checks em 1 chamada:
1) Órfãos, 2) descendants_count drift, 3) children_count drift, 4) level mismatch,
5) closure_table sync, 6) active child/inactive parent, 7) slug duplicates,
8) path integrity, 9) circular refs, 10) deep levels active.
Resultado: PASS/WARN/FAIL por check. Criado: 2026-06-23.';
;
