
UPDATE categories
SET level = 4,
    updated_at = NOW()
WHERE name IN ('Blocos | Ecológicos','Blocos | Mesa')
  AND level = 3
  AND parent_id IN (SELECT id FROM categories WHERE name = 'Blocos' AND level = 3);
;
