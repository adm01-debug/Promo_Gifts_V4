CREATE OR REPLACE FUNCTION public.fn_get_similar_products(p_product_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(similar_product_id uuid, direction text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  -- Direção outgoing: este produto é o "origin" (product_id = p_product_id)
  -- Usa o índice UNIQUE (product_id, related_product_id, relationship_type) → Bitmap Index Scan eficiente
  (
    SELECT pr.related_product_id AS similar_product_id,
           'outgoing'            AS direction
    FROM   public.product_relationships pr
    WHERE  pr.product_id        = p_product_id
      AND  pr.relationship_type = 'similar'
      AND  pr.is_active         = true
    ORDER  BY pr.related_product_id
  )
  UNION ALL
  -- Direção incoming: este produto está no lado "destination" (related_product_id = p_product_id)
  -- Usa o índice idx_product_relationships_related_product_id → Index Scan eficiente
  (
    SELECT pr.product_id   AS similar_product_id,
           'incoming'      AS direction
    FROM   public.product_relationships pr
    WHERE  pr.related_product_id = p_product_id
      AND  pr.relationship_type  = 'similar'
      AND  pr.is_active          = true
    ORDER  BY pr.product_id
  )
  LIMIT  p_limit
  OFFSET p_offset
$function$
