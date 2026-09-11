-- Curadoria manual dos 17 cross-grupo multi-material (kits, cadernos capa+miolo, caneca palha-de-trigo, chaveiros zinco+PU),
-- derivada de leitura nome+descrição. REPLACE define o conjunto correto de materiais por produto (part=corpo, %=NULL).
-- Resolução por NOME do tipo (sem hardcode de UUID). Reversível. fn_sync regenera o jsonb = conjunto definido.
DO $$
BEGIN
  PERFORM set_config('app.bulk_import_mode','true', true);
  CREATE TEMP TABLE _map ON COMMIT DROP AS
  WITH mapping(sku, matname) AS (
    VALUES
    ('01644','Aço Inox'),('01644','Alumínio'),
    ('04098','Aço Inox'),
    ('05617','Nylon'),('05617','Couro Sintético (Ecológico)'),
    ('08542','Bambu'),('08542','Aço Inox'),
    ('10081','Aço Inox'),('10081','Alumínio'),
    ('12071','Aço Inox'),('12071','Nylon'),
    ('15160','Aço Inox'),
    ('18862','Fibras Naturais'),('18862','Polipropileno (PP)'),
    ('51738','Madeira'),
    ('93726','Cartão'),('93726','Papel Genérico'),
    ('93727','Cartão'),('93727','Papel Genérico'),
    ('93728','Cartão'),('93728','Papel Genérico'),
    ('CAD011P','Fibras Naturais'),('CAD011P','Papel Genérico'),
    ('CAD165','Plástico - rPET'),('CAD165','Papel Genérico'),
    ('CAD170','Plástico - rPET'),('CAD170','Papel Genérico'),
    ('CH7035P','Metal Genérico'),('CH7035P','Couro Sintético (Ecológico)'),
    ('CH7055P','Metal Genérico'),('CH7055P','Couro Sintético (Ecológico)')
  )
  SELECT p.id AS product_id, p.organization_id AS org, mt.id AS material_id
  FROM mapping m
  JOIN products p ON p.sku_promo = m.sku AND p.is_active
  JOIN material_types mt ON mt.name = m.matname AND mt.is_active;

  UPDATE product_materials SET is_active=false, updated_at=now()
  WHERE product_id IN (SELECT DISTINCT product_id FROM _map) AND is_active;

  INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, is_active, sort_order)
  SELECT org, product_id, material_id, 'corpo', NULL, true, 1 FROM _map
  ON CONFLICT (product_id, material_id) DO UPDATE SET is_active=true, percentage=NULL, part='corpo', updated_at=now();
END $$;;
