-- Restaura material dos produtos ativos esvaziados (jsonb=[] e zero pm) usando a função oficial
-- fn_extract_materials_from_name (varre nome+descrição). Resolve ~11; os demais (sem keyword) ficam para etapa manual.
-- p_replace_existing=false: como não há pm, procede com a extração. fn_sync regenera jsonb+auto_material.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT p.id FROM products p
           WHERE p.is_active AND NOT EXISTS (SELECT 1 FROM product_materials pm WHERE pm.product_id=p.id AND pm.is_active)
  LOOP
    PERFORM public.fn_extract_materials_from_name(r.id, false);
  END LOOP;
END $$;;
