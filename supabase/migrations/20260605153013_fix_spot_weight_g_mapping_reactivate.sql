-- Fix Gap-1: reativar mapeamento Weight→weight_g (estava is_active=false)
-- Causa: fn_process_raw_v2 usa de-para declarativo; sem este mapeamento ativo,
-- novos produtos Spot importados via v2 não receberiam weight_g (coluna integer em gramas).
-- Campo Weight presente em 3.612/3.612 linhas raw. source_unit=g, target_unit=g (direct).
-- O BUG-1 FIX (ROUND em v_int_cols_products) garante cast seguro de decimais.
UPDATE supplier_field_mappings
   SET is_active = true, updated_at = now()
 WHERE supplier_id = 'bcfc0d02-44c6-48ae-8472-12b1a3f3d8e0'
   AND source_field = 'Weight'
   AND target_field = 'weight_g';
-- Esperado: 1 linha afetada (idempotente se já ativo);
