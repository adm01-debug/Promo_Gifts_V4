CREATE OR REPLACE FUNCTION classification_audit.apply_high_confidence_suggestions(p_dry_run boolean DEFAULT true, p_min_matches integer DEFAULT 4)
 RETURNS TABLE(acao text, product_id uuid, produto text, categoria text, matches integer, score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'classification_audit'
AS $function$
BEGIN
  IF NOT p_dry_run THEN
    INSERT INTO product_category_assignments (product_id, category_id, is_primary)
    SELECT s.product_id, s.category_id, false
    FROM classification_audit.category_suggestions s
    JOIN products p ON p.id = s.product_id AND p.is_active
    WHERE NOT s.already_assigned
      AND s.matches >= p_min_matches
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN QUERY
  SELECT 
    CASE WHEN p_dry_run THEN 'DRY-RUN'::text ELSE 'APLICADO'::text END,
    s.product_id,
    p.name,
    c.full_path_readable,
    s.matches,
    s.score
  FROM classification_audit.category_suggestions s
  JOIN products p ON p.id = s.product_id AND p.is_active
  JOIN categories c ON c.id = s.category_id
  WHERE NOT s.already_assigned
    AND s.matches >= p_min_matches
  ORDER BY s.score DESC;
END;
$function$
