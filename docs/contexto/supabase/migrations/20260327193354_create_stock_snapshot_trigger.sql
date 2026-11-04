-- ============================================================
-- TRIGGER: Captura automática de mudanças de estoque e preço
-- Dispara em QUALQUER UPDATE de stock ou cost_price
-- Zero dependência do n8n — funciona com qualquer source
-- ============================================================

CREATE OR REPLACE FUNCTION fn_capture_stock_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_id uuid;
  v_stock_changed boolean;
  v_price_changed boolean;
  v_change_type varchar(20);
BEGIN
  -- Detectar o que mudou
  v_stock_changed := (
    OLD.stock_main_warehouse IS DISTINCT FROM NEW.stock_main_warehouse
    OR OLD.stock_other_warehouses IS DISTINCT FROM NEW.stock_other_warehouses
  );
  
  v_price_changed := (
    OLD.cost_price IS DISTINCT FROM NEW.cost_price
  );
  
  -- Se nada relevante mudou, sai sem fazer nada
  IF NOT v_stock_changed AND NOT v_price_changed THEN
    RETURN NEW;
  END IF;
  
  -- Determinar tipo de mudança
  IF v_stock_changed AND v_price_changed THEN
    v_change_type := 'both';
  ELSIF v_price_changed THEN
    v_change_type := 'price';
  ELSE
    v_change_type := 'stock';
  END IF;
  
  -- Buscar product_id via product_variants (desnormalização)
  SELECT pv.product_id INTO v_product_id
  FROM product_variants pv
  WHERE pv.id = NEW.variant_id;
  
  -- Se não encontrou product_id, ignora (variante órfã)
  IF v_product_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Inserir snapshot
  INSERT INTO stock_snapshots (
    variant_supplier_source_id,
    supplier_id,
    supplier_branch_id,
    variant_id,
    product_id,
    stock_main_old,
    stock_main_new,
    stock_other_old,
    stock_other_new,
    cost_price_old,
    cost_price_new,
    change_type,
    captured_at
  ) VALUES (
    NEW.id,
    NEW.supplier_id,
    NEW.supplier_branch_id,
    NEW.variant_id,
    v_product_id,
    CASE WHEN v_stock_changed THEN OLD.stock_main_warehouse ELSE NULL END,
    CASE WHEN v_stock_changed THEN NEW.stock_main_warehouse ELSE NULL END,
    CASE WHEN v_stock_changed THEN OLD.stock_other_warehouses ELSE NULL END,
    CASE WHEN v_stock_changed THEN NEW.stock_other_warehouses ELSE NULL END,
    CASE WHEN v_price_changed THEN OLD.cost_price ELSE NULL END,
    CASE WHEN v_price_changed THEN NEW.cost_price ELSE NULL END,
    v_change_type,
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger AFTER UPDATE — não interfere nos triggers existentes
CREATE TRIGGER trg_capture_stock_snapshot
  AFTER UPDATE ON variant_supplier_sources
  FOR EACH ROW
  EXECUTE FUNCTION fn_capture_stock_snapshot();

COMMENT ON FUNCTION fn_capture_stock_snapshot() IS 'Captura snapshots de mudanças de estoque e preço em variant_supplier_sources. Grava na tabela stock_snapshots para análise histórica.';
