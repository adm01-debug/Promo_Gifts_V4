
UPDATE products
SET category_id      = '1f004c4e-0d01-47b9-9b97-0fc4d8bca2d1',
    main_category_id = '1f004c4e-0d01-47b9-9b97-0fc4d8bca2d1',
    updated_at       = NOW()
WHERE id = '468505a1-3319-4eb4-ae28-1f9f2c7d6ff1'
  AND category_id IS NULL;
;
