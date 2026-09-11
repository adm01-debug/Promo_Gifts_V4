-- SEGURANCA: vw_packagings_catalog expunha cost_price REAL para anon.
-- Mascara fail-safe por papel (revela so authenticated/service_role). ANTI-REGRESSAO: preservar o CASE.
CREATE OR REPLACE VIEW public.vw_packagings_catalog AS
 SELECT p.id, p.sku, p.supplier_reference, p.name,
    p.internal_height_cm, p.internal_width_cm, p.internal_length_cm,
    p.height_cm AS ext_height, p.width_cm AS ext_width, p.length_cm AS ext_length,
    p.packaging_material, p.weight_g, p.supplier_id, s.name AS fornecedor,
    (CASE WHEN auth.role() = ANY (ARRAY['authenticated'::text,'service_role'::text]) THEN p.cost_price ELSE NULL::numeric END)::numeric(10,2) AS cost_price,
    ( SELECT count(*) AS count FROM product_packaging_compatibility ppc WHERE ppc.packaging_id = p.id AND ppc.active = true) AS qtd_produtos_compativeis
   FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.product_type = 'packaging'::text AND p.is_active = true;;
