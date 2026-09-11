CREATE OR REPLACE VIEW public.v_kit_component_identity_health AS
SELECT
  s.name                                                                              AS supplier,
  count(*)                                                                            AS variant_component_rows,
  count(DISTINCT k.kit_product_id)                                                    AS kits,
  count(DISTINCT k.component_id)                                                      AS components,
  count(*) FILTER (WHERE k.component_sku IS NOT NULL)                                 AS with_qualified_code,
  count(*) FILTER (WHERE k.item_color_id IS NOT NULL)                                 AS with_canonical_color,
  count(*) FILTER (WHERE k.primary_image_url IS NOT NULL)                             AS with_image,
  round(100.0*count(*) FILTER (WHERE k.item_color_id   IS NOT NULL)/NULLIF(count(*),0),1) AS pct_color,
  round(100.0*count(*) FILTER (WHERE k.primary_image_url IS NOT NULL)/NULLIF(count(*),0),1) AS pct_image
FROM public.kit_component_variant_skus k
JOIN public.products  p ON p.id = k.kit_product_id
JOIN public.suppliers s ON s.id = p.supplier_id
GROUP BY s.name
ORDER BY 2 DESC;

COMMENT ON VIEW public.v_kit_component_identity_health IS
  'Saúde honesta da identidade de componente por fornecedor: linhas materializadas, cobertura de código qualificado, cor canônica e imagem real. pct_image=0 para XBZ/Asia/Só Marcas é verídico (sem fonte de foto por componente).';

NOTIFY pgrst, 'reload schema';;
