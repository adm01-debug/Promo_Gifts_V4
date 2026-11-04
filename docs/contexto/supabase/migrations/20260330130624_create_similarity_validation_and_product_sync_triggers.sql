-- ============================================================
-- GAP 1 FIX: Forçar supplier_id correto no membro
-- BEFORE INSERT OR UPDATE — sobrescreve supplier_id com o real
-- do produto, antes de os triggers AFTER dispararem
-- ============================================================
CREATE OR REPLACE FUNCTION fn_validate_member_supplier()
RETURNS TRIGGER AS $$
DECLARE
  v_real_supplier uuid;
BEGIN
  -- Buscar supplier real do produto
  SELECT supplier_id INTO v_real_supplier
  FROM products
  WHERE id = NEW.product_id;
  
  IF v_real_supplier IS NULL THEN
    RAISE EXCEPTION 'Produto % não encontrado na tabela products', NEW.product_id;
  END IF;
  
  -- Sobrescrever silenciosamente com o valor correto
  NEW.supplier_id := v_real_supplier;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_member_supplier
  BEFORE INSERT OR UPDATE ON product_similarity_group_members
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_member_supplier();


-- ============================================================
-- GAP 3 FIX: Sincronizar desativação de produto com membros
-- Quando products.is_active muda para FALSE,
-- remove o produto de todos os grupos de similaridade.
-- O trigger AFTER DELETE existente (trg_remove_similarity_on_member_delete)
-- cuida automaticamente de limpar os pares órfãos.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_sync_product_deactivation_to_similarity()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atua quando is_active muda de TRUE para FALSE
  IF OLD.is_active = true AND NEW.is_active = false THEN
    DELETE FROM product_similarity_group_members
    WHERE product_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_product_deactivation_to_similarity
  AFTER UPDATE OF is_active ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_product_deactivation_to_similarity();
