
-- MELHORIA 9b: Achatar cadeias canônicas — encontrar raiz verdadeira via CTE recursiva

WITH RECURSIVE chain AS (
  -- Nós com cadeia: canonical aponta para não-raiz
  SELECT 
    pi.id AS node_id,
    pi.canonical_image_id AS current_root,
    0 AS depth
  FROM public.product_images pi
  JOIN public.product_images middle ON middle.id = pi.canonical_image_id
  WHERE pi.canonical_image_id IS NOT NULL
    AND middle.canonical_image_id IS NOT NULL

  UNION ALL

  -- Seguir a cadeia até encontrar raiz (canonical IS NULL)
  SELECT 
    chain.node_id,
    pi_next.canonical_image_id AS current_root,
    chain.depth + 1
  FROM chain
  JOIN public.product_images pi_next ON pi_next.id = chain.current_root
  WHERE chain.current_root IS NOT NULL
    AND chain.depth < 10  -- proteção contra ciclos
),
-- Raiz verdadeira = último nó sem canonical_image_id
true_roots AS (
  SELECT DISTINCT ON (node_id)
    node_id,
    current_root AS final_root_id
  FROM chain
  WHERE current_root IS NULL
  ORDER BY node_id, depth DESC
)
-- Atualizar para apontar diretamente para a raiz verdadeira
UPDATE public.product_images pi
SET canonical_image_id = tr.final_root_id,
    is_shared = true,
    last_modified_source = 'migration'
FROM true_roots tr
WHERE pi.id = tr.node_id
  AND (pi.canonical_image_id IS DISTINCT FROM tr.final_root_id);
;
