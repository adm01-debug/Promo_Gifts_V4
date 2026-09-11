-- SEGURANCA: vw_product_novelties_active expunha cost_price REAL para anon (vitrine publica).
-- Mascara fail-safe por papel: revela custo so p/ authenticated/service_role; anon recebe NULL.
-- Mantem acesso anon aos demais campos (nao quebra a vitrine). ANTI-REGRESSAO: preservar o CASE.
CREATE OR REPLACE VIEW public.vw_product_novelties_active AS
 SELECT pn.id AS novelty_id, pn.product_id, pn.supplier_id, pn.supplier_code, pn.supplier_product_code,
    pn.source, pn.detected_at, pn.expires_at, pn.is_active, pn.is_highlighted, pn.notes,
    pn.created_at AS novelty_created_at, pn.updated_at AS novelty_updated_at,
    p.name AS product_name, p.sku AS product_sku, p.supplier_reference, p.primary_image_url, p.sale_price,
    (CASE WHEN auth.role() = ANY (ARRAY['authenticated'::text,'service_role'::text]) THEN p.cost_price ELSE NULL::numeric END)::numeric(10,2) AS cost_price,
    p.stock_quantity, p.is_active AS product_active, p.is_stockout, p.created_at AS product_created_at,
    CASE WHEN pn.expires_at IS NULL THEN NULL::integer ELSE EXTRACT(day FROM pn.expires_at - now())::integer END AS days_remaining,
    CASE WHEN pn.expires_at IS NOT NULL AND (pn.expires_at - now()) < '7 days'::interval THEN true ELSE false END AS expiring_soon
   FROM product_novelties pn
     JOIN products p ON p.id = pn.product_id
  WHERE pn.is_active = true AND (pn.expires_at IS NULL OR pn.expires_at > now()) AND p.is_active = true AND p.is_stockout = false AND p.sale_price IS NOT NULL AND p.sale_price > 0::numeric AND p.primary_image_url IS NOT NULL AND p.primary_image_url <> ''::text;;
