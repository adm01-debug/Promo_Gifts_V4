-- Fix Gap-2b: reativar mapeamento CombinedSizes→dimensions_display (estava is_active=false)
-- Campo CombinedSizes presente em 3.612/3.612 linhas raw no formato "123 x 70 x 10 mm".
-- O override de fn_format_dimensions_display(length_cm, width_cm, height_cm) só ocorre
-- quando products.length_cm IS NOT NULL — NULL para produtos Spot (mapeados apenas em
-- box_length_cm/box_width_cm/box_height_cm). Logo, o valor de CombinedSizes persiste.
UPDATE supplier_field_mappings
   SET is_active = true, updated_at = now()
 WHERE supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
   AND source_field = 'CombinedSizes'
   AND target_field = 'dimensions_display';
-- Esperado: 1 linha afetada (idempotente se já ativo);
