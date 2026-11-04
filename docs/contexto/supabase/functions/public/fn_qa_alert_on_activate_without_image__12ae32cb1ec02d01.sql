CREATE OR REPLACE FUNCTION public.fn_qa_alert_on_activate_without_image()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_has_image boolean;
BEGIN
  -- Só dispara quando is_active muda de false/null → true
  IF NOT (OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active = true) THEN
    RETURN NEW;
  END IF;

  -- Checar se há alguma imagem
  SELECT EXISTS(
    SELECT 1 FROM product_images pi WHERE pi.product_id = NEW.id AND pi.is_active = true
  ) OR COALESCE(NEW.primary_image_url, '') <> ''
    OR (jsonb_typeof(NEW.images) = 'array' AND jsonb_array_length(NEW.images) > 0)
  INTO v_has_image;

  IF NOT v_has_image THEN
    -- 'activated_no_image' = 18 chars (dentro do limit de VARCHAR(20))
    NEW.sync_status := 'activated_no_image';

    INSERT INTO product_qa_image_alerts (
      product_id, supplier_id, sku_promo, product_name, alert_type
    )
    VALUES (
      NEW.id, NEW.supplier_id,
      COALESCE(NEW.sku_promo, NEW.sku),
      left(NEW.name, 200),
      'active_without_image'
    )
    ON CONFLICT DO NOTHING;

    RAISE WARNING '[QA-ALERT] Produto % (SKU: %) ativado SEM imagem!',
      left(NEW.name,40), COALESCE(NEW.sku_promo, NEW.sku);
  END IF;

  RETURN NEW;
END;
$function$
