CREATE OR REPLACE FUNCTION public.soft_delete_product(p_product_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_auth_id uuid;
BEGIN
  -- Criar token de autorização one-shot
  INSERT INTO product_deactivation_tokens(product_id,authorized_by)
  VALUES(p_product_id,auth.uid())
  RETURNING id INTO v_auth_id;

  UPDATE products SET is_deleted=true, deleted_at=NOW(), is_active=false, updated_at=NOW()
  WHERE id=p_product_id;

  DELETE FROM product_deactivation_tokens WHERE id=v_auth_id;
  RETURN FOUND;
END;
$function$
