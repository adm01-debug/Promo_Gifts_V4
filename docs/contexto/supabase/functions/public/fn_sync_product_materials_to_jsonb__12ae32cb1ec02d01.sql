CREATE OR REPLACE FUNCTION public.fn_sync_product_materials_to_jsonb()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id   UUID;
  v_new_materials JSONB;
  v_primary_mat   TEXT;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  IF v_product_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Guard anti-loop
  PERFORM set_config('app.bulk_import_mode', 'true', true);

  -- Calcular novos valores a partir dos registros ativos
  SELECT 
    COALESCE(jsonb_agg(mt.name ORDER BY pm2.sort_order, mt.name), '[]'::jsonb),
    (SELECT mt2.name
     FROM product_materials pm3
     JOIN material_types mt2 ON mt2.id = pm3.material_id
     WHERE pm3.product_id = v_product_id AND pm3.is_active = true
     ORDER BY pm3.percentage DESC NULLS LAST, pm3.sort_order ASC
     LIMIT 1)
  INTO v_new_materials, v_primary_mat
  FROM product_materials pm2
  JOIN material_types mt ON mt.id = pm2.material_id
  WHERE pm2.product_id = v_product_id AND pm2.is_active = true;

  -- Atualizar ambos os campos em uma única operação
  UPDATE products
  SET materials     = v_new_materials,
      auto_material = v_primary_mat,
      updated_at    = NOW()
  WHERE id = v_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$
