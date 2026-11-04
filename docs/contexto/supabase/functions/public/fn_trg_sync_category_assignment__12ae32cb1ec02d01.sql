CREATE OR REPLACE FUNCTION public.fn_trg_sync_category_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Só age se category_id foi definido/mudou e existe valor válido
  IF NEW.category_id IS NULL OR NEW.category_id IS NOT DISTINCT FROM OLD.category_id THEN
    RETURN NEW;
  END IF;

  -- Inserir no PCA SOMENTE se o produto ainda não tem NENHUMA categoria
  -- (não sobrescreve curadoria manual ou categorizações mais específicas)
  INSERT INTO product_category_assignments (product_id, category_id, is_primary, display_order, created_at)
  SELECT NEW.id, NEW.category_id, true, 0, now()
  WHERE NOT EXISTS (
    SELECT 1 FROM product_category_assignments pca WHERE pca.product_id = NEW.id
  )
  ON CONFLICT (product_id, category_id) DO NOTHING;

  RETURN NEW;
END;
$function$
