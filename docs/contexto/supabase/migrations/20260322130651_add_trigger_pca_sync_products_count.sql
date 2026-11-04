-- =================================================================
-- TRIGGER: Manter categories.products_count sincronizado via pca
-- Criado em: 2026-03-22
-- Motivo: O trigger anterior (update_category_products_count) estava
--         na tabela products usando main_category_id (apenas 14% preenchido).
--         A fonte verdadeira é product_category_assignments.
-- =================================================================

CREATE OR REPLACE FUNCTION fn_trigger_sync_pca_products_count()
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
$function$;

-- Criar trigger AFTER INSERT/UPDATE/DELETE em product_category_assignments
CREATE TRIGGER trg_pca_sync_products_count
AFTER INSERT OR UPDATE OR DELETE ON product_category_assignments
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_sync_pca_products_count();

-- Comentário explicativo
COMMENT ON FUNCTION fn_trigger_sync_pca_products_count() IS 
'Mantém categories.products_count sincronizado automaticamente.
Conta apenas produtos com is_deleted=false AND is_active=true.
Fonte: product_category_assignments (tabela de vínculo N:N).
Criado em 2026-03-22 para substituir o trigger antigo que usava products.main_category_id.';
