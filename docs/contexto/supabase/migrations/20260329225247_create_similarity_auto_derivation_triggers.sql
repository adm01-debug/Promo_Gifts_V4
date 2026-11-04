-- ============================================================
-- TRIGGER 1: AUTO-DERIVAÇÃO DE PARES AO INSERIR MEMBRO
-- Quando um novo membro é adicionado a um grupo ativo,
-- gera pares cross-supplier bidireccionais com ON CONFLICT.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_derive_similarity_pairs_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Só processa se o grupo está ativo
  IF NOT EXISTS (
    SELECT 1 FROM product_similarity_groups
    WHERE id = NEW.group_id AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Pares: NOVO membro → membros existentes (cross-supplier)
  INSERT INTO product_relationships
    (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
  SELECT
    NEW.product_id,
    m.product_id,
    'similar',
    true,
    true,
    0
  FROM product_similarity_group_members m
  WHERE m.group_id = NEW.group_id
    AND m.product_id != NEW.product_id
    AND m.supplier_id != NEW.supplier_id
  ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;

  -- Pares reversos: membros existentes → NOVO membro
  INSERT INTO product_relationships
    (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
  SELECT
    m.product_id,
    NEW.product_id,
    'similar',
    true,
    true,
    0
  FROM product_similarity_group_members m
  WHERE m.group_id = NEW.group_id
    AND m.product_id != NEW.product_id
    AND m.supplier_id != NEW.supplier_id
  ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_derive_similarity_on_member_insert
  AFTER INSERT ON product_similarity_group_members
  FOR EACH ROW
  EXECUTE FUNCTION fn_derive_similarity_pairs_on_insert();


-- ============================================================
-- TRIGGER 2: LIMPEZA DE PARES AO REMOVER MEMBRO
-- Ao remover um membro, deleta pares envolvendo esse produto
-- que NÃO são sustentados por nenhum outro grupo ativo.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_remove_similarity_pairs_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM product_relationships pr
  WHERE pr.relationship_type = 'similar'
    -- Par envolve o produto removido
    AND (pr.product_id = OLD.product_id OR pr.related_product_id = OLD.product_id)
    -- Só deleta se NENHUM grupo ativo ainda sustenta esse par
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

CREATE TRIGGER trg_remove_similarity_on_member_delete
  AFTER DELETE ON product_similarity_group_members
  FOR EACH ROW
  EXECUTE FUNCTION fn_remove_similarity_pairs_on_delete();


-- ============================================================
-- TRIGGER 3: TOGGLE DE GRUPO (is_active)
-- Desativar grupo → remove pares órfãos.
-- Ativar grupo → regenera pares cross-supplier.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_toggle_group_similarity_pairs()
RETURNS TRIGGER AS $$
BEGIN
  -- Só atua quando is_active muda
  IF OLD.is_active IS NOT DISTINCT FROM NEW.is_active THEN
    RETURN NEW;
  END IF;

  IF NEW.is_active = true THEN
    -- Grupo REATIVADO: regenerar todos os pares cross-supplier
    INSERT INTO product_relationships
      (product_id, related_product_id, relationship_type, is_bidirectional, is_active, display_order)
    SELECT
      m1.product_id,
      m2.product_id,
      'similar',
      true,
      true,
      0
    FROM product_similarity_group_members m1
    JOIN product_similarity_group_members m2
      ON m1.group_id = m2.group_id
      AND m1.product_id != m2.product_id
      AND m1.supplier_id != m2.supplier_id
    WHERE m1.group_id = NEW.id
    ON CONFLICT (product_id, related_product_id, relationship_type) DO NOTHING;

  ELSE
    -- Grupo DESATIVADO: remover pares que não são sustentados por outro grupo ativo
    DELETE FROM product_relationships pr
    WHERE pr.relationship_type = 'similar'
      -- Par foi gerado por ESTE grupo
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
      -- Mas NÃO é sustentado por OUTRO grupo ativo
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

CREATE TRIGGER trg_toggle_group_similarity_pairs
  AFTER UPDATE OF is_active ON product_similarity_groups
  FOR EACH ROW
  EXECUTE FUNCTION fn_toggle_group_similarity_pairs();
