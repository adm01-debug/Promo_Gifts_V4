-- MELHORIA 4: product_materials tinha 2 UNIQUE sobrepostas. A granular
-- (organization_id, product_id, material_id, part) e redundante: a UNIQUE
-- (product_id, material_id) e estritamente mais forte e e a chave usada por
-- ON CONFLICT em fn_link_product_materials / fn_process_composite_materials /
-- debug_link_material. Removida a granular (vestigial). Dedup preservado.
ALTER TABLE public.product_materials
  DROP CONSTRAINT product_materials_organization_id_product_id_material_id_pa_key;;
