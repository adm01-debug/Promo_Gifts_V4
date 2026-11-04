CREATE OR REPLACE FUNCTION public.fn_derive_similarity_pairs_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM product_similarity_groups
    WHERE id = NEW.group_id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO product_relationships
    (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
  SELECT NEW.product_id, m.product_id, 'similar', true, true, 0
  FROM product_similarity_group_members m
  WHERE m.group_id = NEW.group_id
    AND m.product_id != NEW.product_id
    AND m.supplier_id != NEW.supplier_id
  ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;

  INSERT INTO product_relationships
    (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
  SELECT m.product_id, NEW.product_id, 'similar', true, true, 0
  FROM product_similarity_group_members m
  WHERE m.group_id = NEW.group_id
    AND m.product_id != NEW.product_id
    AND m.supplier_id != NEW.supplier_id
  ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;

  RETURN NEW;
END;
$function$
