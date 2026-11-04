CREATE OR REPLACE FUNCTION public.fn_trigger_sync_pca_products_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_category_id uuid;
  v_count integer;
BEGIN
  -- Determinar qual category_id foi afetado
  IF TG_OP = 'DELETE' THEN
    v_category_id := OLD.category_id;
  ELSIF TG_OP = 'INSERT' THEN
    v_category_id := NEW.category_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Se category_id mudou, atualizar ambos
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      -- Decrementar a antiga
      SELECT COUNT(DISTINCT pca.product_id) INTO v_count
      FROM product_category_assignments pca
      JOIN products p ON p.id = pca.product_id
      WHERE pca.category_id = OLD.category_id
        AND (p.is_deleted = false OR p.is_deleted IS NULL)
        AND p.is_active = true;
      
      UPDATE categories SET products_count = v_count
      WHERE id = OLD.category_id;
    END IF;
    v_category_id := NEW.category_id;
  END IF;

  -- Recalcular contagem real para a categoria afetada
  SELECT COUNT(DISTINCT pca.product_id) INTO v_count
  FROM product_category_assignments pca
  JOIN products p ON p.id = pca.product_id
  WHERE pca.category_id = v_category_id
    AND (p.is_deleted = false OR p.is_deleted IS NULL)
    AND p.is_active = true;

  UPDATE categories SET products_count = v_count
  WHERE id = v_category_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$
