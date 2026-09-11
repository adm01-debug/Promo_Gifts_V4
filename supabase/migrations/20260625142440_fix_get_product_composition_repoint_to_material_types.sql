-- MELHORIA 1: get_product_composition referenciava tabela 'materials' (inexistente)
-- e coluna 'material_group_id' (inexistente) — sobra de refatoração. Repontado para
-- material_types + group_id. Anti-regressao: manter este corpo (Lovable pode reverter).
CREATE OR REPLACE FUNCTION public.get_product_composition(p_product_id uuid)
RETURNS TABLE(material_name character varying, group_name character varying, part character varying, percentage numeric)
LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
BEGIN
  RETURN QUERY
  SELECT mt.name, mg.name, pm.part, pm.percentage
  FROM product_materials pm
  JOIN material_types mt ON mt.id = pm.material_id
  JOIN material_groups mg ON mg.id = mt.group_id
  WHERE pm.product_id = p_product_id AND pm.is_active = true
  ORDER BY pm.sort_order;
END;
$fn$;
COMMENT ON FUNCTION public.get_product_composition(uuid) IS
'Composicao de material de um produto (material_types + group). Corrigido 2026-06-25: referenciava tabela materials/material_group_id inexistentes. fix_version=2026-06-25.';;
