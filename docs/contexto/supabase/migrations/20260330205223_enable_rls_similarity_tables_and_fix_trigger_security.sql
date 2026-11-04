-- ============================================================
-- PARTE 1: Ativar RLS nas tabelas de similaridade
-- Sem policy de escrita = bloqueio total para anon/authenticated
-- service_role bypassa RLS automaticamente (MCP)
-- ============================================================

ALTER TABLE product_similarity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_similarity_group_members ENABLE ROW LEVEL SECURITY;

-- Leitura pública (dados de catálogo, como products/categories)
CREATE POLICY psg_public_read 
  ON product_similarity_groups 
  FOR SELECT 
  USING (true);

CREATE POLICY psgm_public_read 
  ON product_similarity_group_members 
  FOR SELECT 
  USING (true);

-- ============================================================
-- PARTE 2: Converter triggers para SECURITY DEFINER
-- Necessário porque:
-- 1. fn_sync_product_deactivation_to_similarity:
--    Chamado por authenticated (admin atualiza products.is_active)
--    Precisa DELETE em group_members (agora com RLS)
-- 2. fn_derive/remove/toggle:
--    Escrevem em product_relationships (já tem RLS)
--    Hoje funcionam via service_role (MCP), mas DEFINER
--    garante robustez para qualquer contexto futuro
-- ============================================================

-- fn_validate_member_supplier → DEFINER (lê products, corrige supplier)
CREATE OR REPLACE FUNCTION fn_validate_member_supplier()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_real_supplier uuid;
BEGIN
  SELECT supplier_id INTO v_real_supplier
  FROM products WHERE id = NEW.product_id;
  IF v_real_supplier IS NULL THEN
    RAISE EXCEPTION 'Produto % não encontrado na tabela products', NEW.product_id;
  END IF;
  NEW.supplier_id := v_real_supplier;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- fn_derive_similarity_pairs_on_insert → DEFINER (escreve em product_relationships)
CREATE OR REPLACE FUNCTION fn_derive_similarity_pairs_on_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM product_similarity_groups
    WHERE id = NEW.group_id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO product_relationships
    (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
  SELECT NEW.product_id, m.product_id, 'similar', true, true, 0
  FROM product_similarity_group_members m
  WHERE m.group_id = NEW.group_id
    AND m.product_id != NEW.product_id
    AND m.supplier_id != NEW.supplier_id
  ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;

  INSERT INTO product_relationships
    (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
  SELECT m.product_id, NEW.product_id, 'similar', true, true, 0
  FROM product_similarity_group_members m
  WHERE m.group_id = NEW.group_id
    AND m.product_id != NEW.product_id
    AND m.supplier_id != NEW.supplier_id
  ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- fn_remove_similarity_pairs_on_delete → DEFINER (deleta de product_relationships)
CREATE OR REPLACE FUNCTION fn_remove_similarity_pairs_on_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM product_relationships pr
  WHERE pr.relationship_type = 'similar'
    AND (pr.product_id = OLD.product_id OR pr.related_product_id = OLD.product_id)
    AND NOT EXISTS (
      SELECT 1
      FROM product_similarity_group_members m1
      JOIN product_similarity_group_members m2
        ON m1.group_id = m2.group_id
        AND m1.product_id != m2.product_id
        AND m1.supplier_id != m2.supplier_id
      JOIN product_similarity_groups g ON g.id = m1.group_id
      WHERE g.is_active = true
        AND m1.product_id = pr.product_id
        AND m2.product_id = pr.related_product_id
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- fn_toggle_group_similarity_pairs → DEFINER (escreve/deleta product_relationships)
CREATE OR REPLACE FUNCTION fn_toggle_group_similarity_pairs()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_active IS NOT DISTINCT FROM NEW.is_active THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active = true THEN
    INSERT INTO product_relationships
      (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
    SELECT m1.product_id, m2.product_id, 'similar', true, true, 0
    FROM product_similarity_group_members m1
    JOIN product_similarity_group_members m2
      ON m1.group_id = m2.group_id
      AND m1.product_id != m2.product_id
      AND m1.supplier_id != m2.supplier_id
    WHERE m1.group_id = NEW.id
    ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;
  ELSE
    DELETE FROM product_relationships pr
    WHERE pr.relationship_type = 'similar'
      AND EXISTS (
        SELECT 1
        FROM product_similarity_group_members m1
        JOIN product_similarity_group_members m2
          ON m1.group_id = m2.group_id
          AND m1.product_id != m2.product_id
          AND m1.supplier_id != m2.supplier_id
        WHERE m1.group_id = OLD.id
          AND m1.product_id = pr.product_id
          AND m2.product_id = pr.related_product_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM product_similarity_group_members ma
        JOIN product_similarity_group_members mb
          ON ma.group_id = mb.group_id
          AND ma.product_id != mb.product_id
          AND ma.supplier_id != mb.supplier_id
        JOIN product_similarity_groups g ON g.id = ma.group_id
        WHERE g.is_active = true
          AND g.id != OLD.id
          AND ma.product_id = pr.product_id
          AND mb.product_id = pr.related_product_id
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- fn_sync_product_deactivation_to_similarity → DEFINER (deleta de group_members com RLS)
CREATE OR REPLACE FUNCTION fn_sync_product_deactivation_to_similarity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    DELETE FROM product_similarity_group_members
    WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
