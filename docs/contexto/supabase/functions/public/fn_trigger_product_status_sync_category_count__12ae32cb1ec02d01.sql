CREATE OR REPLACE FUNCTION public.fn_trigger_product_status_sync_category_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cat_id uuid;
  v_count integer;
BEGIN
  -- Só executa se is_active ou is_deleted realmente mudou
  IF (OLD.is_active IS NOT DISTINCT FROM NEW.is_active) 
     AND (OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted) THEN
    RETURN NEW;
  END IF;

  -- Recalcular products_count em TODAS as categorias desse produto
  FOR v_cat_id IN
    SELECT category_id FROM product_category_assignments WHERE product_id = NEW.id
  LOOP
    SELECT COUNT(DISTINCT pca.product_id) INTO v_count
    FROM product_category_assignments pca
    JOIN products p ON p.id = pca.product_id
    WHERE pca.category_id = v_cat_id
      AND p.is_active = true
      AND (p.is_deleted = false OR p.is_deleted IS NULL);

    UPDATE categories SET products_count = v_count
    WHERE id = v_cat_id;
  END LOOP;

  RETURN NEW;
END;
$function$
