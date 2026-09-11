
-- FIX 16: Auto-promote the next best image to is_primary=true when the current
-- primary image is deactivated (is_active set to false or is_primary cleared).
-- Without this, product_images would have no is_primary=true row after deactivation,
-- even though products.primary_image_url is correctly recalculated by the AFTER trigger.

CREATE OR REPLACE FUNCTION public.fn_autopromote_primary_on_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_next_id UUID;
BEGIN
  -- Only act when: was primary & active, now either inactive or no longer primary
  IF OLD.is_primary = true AND OLD.is_active = true THEN
    IF NEW.is_active = false OR NEW.is_primary = false THEN
      -- Check if any other primary already exists for this product
      IF NOT EXISTS (
        SELECT 1 FROM product_images
        WHERE product_id = OLD.product_id
          AND is_primary = true
          AND is_active = true
          AND id != OLD.id
      ) THEN
        -- Promote the next best active image (same priority as fn_sync_product_images_to_products)
        SELECT id INTO v_next_id
        FROM product_images
        WHERE product_id = OLD.product_id
          AND is_active = true
          AND id != OLD.id
          AND image_type NOT IN ('box','pouch','location','area','component')
        ORDER BY
          CASE
            WHEN image_type = 'main'                           THEN 0
            WHEN image_type IN ('gallery','product')           THEN 1
            WHEN image_type = 'ambient'                        THEN 2
            WHEN image_type = 'set'                            THEN 3
            WHEN image_type = 'logo'                           THEN 4
            ELSE 5
          END,
          display_order ASC NULLS LAST
        LIMIT 1;

        IF v_next_id IS NOT NULL THEN
          UPDATE product_images
          SET is_primary = true, updated_at = NOW()
          WHERE id = v_next_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fire AFTER so we can safely UPDATE another row (avoids trigger recursion on BEFORE)
CREATE TRIGGER trg_autopromote_primary_on_deactivation
  AFTER UPDATE OF is_active, is_primary
  ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_autopromote_primary_on_deactivation();

COMMENT ON FUNCTION public.fn_autopromote_primary_on_deactivation() IS
  'Quando a imagem primária ativa é desativada ou desmarcada, promove automaticamente a próxima melhor imagem ativa para is_primary=true. Mantém o invariante: todo produto com imagens ativas tem exatamente uma marcada como primária.';
;
