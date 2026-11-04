CREATE OR REPLACE FUNCTION public.fn_remove_similarity_pairs_on_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  DELETE FROM product_relationships pr
  WHERE pr.relationship_type = 'similar'
    AND (pr.product_id = OLD.product_id OR pr.related_product_id = OLD.product_id)
    AND NOT EXISTS (
      SELECT 1
      FROM product_similarity_group_members m1
      JOIN product_similarity_group_members m2
        ON m1.group_id = m2.group_id
        AND m1.product_id != m2.product_id
        AND m1.supplier_id != m2.supplier_id
      JOIN product_similarity_groups g ON g.id = m1.group_id
      WHERE g.is_active = true
        AND m1.product_id = pr.product_id
        AND m2.product_id = pr.related_product_id
    );
  RETURN OLD;
END;
$function$
