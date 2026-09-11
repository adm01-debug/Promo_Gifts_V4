-- SEGURANCA: vw_products_packaging_info expunha cost_price REAL para anon.
-- Mascara fail-safe por papel (revela so authenticated/service_role). ANTI-REGRESSAO: preservar o CASE.
CREATE OR REPLACE VIEW public.vw_products_packaging_info AS
 SELECT p.id, p.sku, p.supplier_reference, p.name, p.product_type, p.shape_type,
    p.height_cm, p.width_cm, p.length_cm, p.diameter_cm, p.weight_g,
    CASE p.shape_type
        WHEN 'cylindrical'::text THEN ((('ø'::text || COALESCE(p.diameter_cm::text, '?'::text)) || 'x'::text) || COALESCE(p.height_cm::text, '?'::text)) || 'cm'::text
        ELSE ((((COALESCE(p.width_cm::text, '?'::text) || 'x'::text) || COALESCE(p.height_cm::text, '?'::text)) || 'x'::text) || COALESCE(p.length_cm::text, '?'::text)) || 'cm'::text
    END AS dimensoes,
    (EXISTS ( SELECT 1 FROM product_included_packagings pip WHERE pip.product_id = p.id AND pip.active = true)) AS tem_embalagem_inclusa,
    ( SELECT count(*) AS count FROM product_included_packagings pip WHERE pip.product_id = p.id AND pip.active = true) AS qtd_inclusas,
    ( SELECT count(*) AS count FROM product_packaging_compatibility ppc WHERE ppc.product_id = p.id AND ppc.active = true) AS qtd_compativeis,
    p.supplier_id, s.name AS fornecedor,
    (CASE WHEN auth.role() = ANY (ARRAY['authenticated'::text,'service_role'::text]) THEN p.cost_price ELSE NULL::numeric END)::numeric(10,2) AS cost_price,
    p.is_active AS active
   FROM products p
     LEFT JOIN suppliers s ON s.id = p.supplier_id
  WHERE p.product_type = 'product'::text;;
