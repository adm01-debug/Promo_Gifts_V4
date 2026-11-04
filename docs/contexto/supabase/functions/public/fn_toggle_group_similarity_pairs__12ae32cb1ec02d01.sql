CREATE OR REPLACE FUNCTION public.fn_toggle_group_similarity_pairs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF OLD.is_active IS NOT DISTINCT FROM NEW.is_active THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active = true THEN
    INSERT INTO product_relationships
      (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
    SELECT m1.product_id, m2.product_id, 'similar', true, true, 0
    FROM product_similarity_group_members m1
    JOIN product_similarity_group_members m2
      ON m1.group_id = m2.group_id
      AND m1.product_id != m2.product_id
      AND m1.supplier_id != m2.supplier_id
    WHERE m1.group_id = NEW.id
    ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;
  ELSE
    DELETE FROM product_relationships pr
    WHERE pr.relationship_type = 'similar'
      AND EXISTS (
        SELECT 1
        FROM product_similarity_group_members m1
        JOIN product_similarity_group_members m2
          ON m1.group_id = m2.group_id
          AND m1.product_id != m2.product_id
          AND m1.supplier_id != m2.supplier_id
        WHERE m1.group_id = OLD.id
          AND m1.product_id = pr.product_id
          AND m2.product_id = pr.related_product_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM product_similarity_group_members ma
        JOIN product_similarity_group_members mb
          ON ma.group_id = mb.group_id
          AND ma.product_id != mb.product_id
          AND ma.supplier_id != mb.supplier_id
        JOIN product_similarity_groups g ON g.id = ma.group_id
        WHERE g.is_active = true
          AND g.id != OLD.id
          AND ma.product_id = pr.product_id
          AND mb.product_id = pr.related_product_id
      );
  END IF;

  RETURN NEW;
END;
$function$
