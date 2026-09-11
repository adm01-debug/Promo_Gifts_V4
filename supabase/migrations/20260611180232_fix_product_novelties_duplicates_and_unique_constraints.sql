
BEGIN;

DELETE FROM product_novelties
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY product_id, COALESCE(supplier_id::text, 'null')
             ORDER BY created_at ASC
           ) AS rn
    FROM product_novelties
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_novelties_product_supplier
  ON product_novelties (product_id, supplier_id)
  WHERE supplier_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_novelties_product_no_supplier
  ON product_novelties (product_id)
  WHERE supplier_id IS NULL;

COMMIT;
;
