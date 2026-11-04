UPDATE color_variations 
SET color_group_id = group_id
WHERE name IN ('Madeira', 'Kraft', 'Bambu', 'Bronze')
  AND color_group_id IS NULL;
