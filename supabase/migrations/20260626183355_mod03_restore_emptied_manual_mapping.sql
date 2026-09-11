-- Restaura os 10 produtos esvaziados que a extração automática não cobriu (nome sem keyword de material).
-- Material derivado de nome+categoria (domínio): sacola/mochila->Poliéster, régua plástica->Plástico Genérico,
-- agenda/caderno/bloco cromato/papel->Cartão/Papel, garrafa/copo térmico->Aço Inox, lanterna->Alumínio.
-- Resolução por NOME do tipo (sem hardcode de UUID). Idempotente (só atinge ainda-vazios). fn_sync regenera jsonb.
WITH mapping(sku,matname) AS (
  VALUES ('09276','Poliéster'),('09277','Alumínio'),('13763A','Plástico Genérico'),
         ('14707','Poliéster'),('14930','Cartão'),('14932','Cartão'),
         ('15466A','Papel Genérico'),('E@09291','Aço Inox'),('E@09292','Aço Inox'),
         ('P@11933','Papel Genérico')
),
resolved AS (
  SELECT p.id AS product_id, p.organization_id AS org, mt.id AS material_id
  FROM mapping m
  JOIN products p ON p.sku_promo=m.sku
  JOIN material_types mt ON mt.name=m.matname AND mt.is_active
  WHERE p.is_active AND NOT EXISTS (SELECT 1 FROM product_materials pm WHERE pm.product_id=p.id AND pm.is_active)
)
INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, is_active, sort_order)
SELECT org, product_id, material_id, 'corpo', 100, true, 1 FROM resolved
ON CONFLICT (product_id, material_id) DO UPDATE SET is_active=true, updated_at=now();;
