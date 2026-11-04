-- =================================================================
-- GAP 1 FIX: Trigger em products para recalcular products_count
-- quando is_active ou is_deleted muda.
-- Sem isso, desativar/reativar um produto deixa o cache stale.
-- Criado em: 2026-03-22
-- =================================================================

CREATE OR REPLACE FUNCTION fn_trigger_product_status_sync_category_count()
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
$function$;

CREATE TRIGGER trg_product_status_sync_category_count
AFTER UPDATE OF is_active, is_deleted ON products
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_product_status_sync_category_count();

COMMENT ON FUNCTION fn_trigger_product_status_sync_category_count() IS 
'Recalcula categories.products_count quando products.is_active ou is_deleted muda.
Complementa trg_pca_sync_products_count (que cobre INSERT/UPDATE/DELETE em pca).
Criado em 2026-03-22 para fechar GAP encontrado na auditoria.';
