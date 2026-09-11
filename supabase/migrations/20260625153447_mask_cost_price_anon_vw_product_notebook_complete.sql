-- SEGURANCA: vw_product_notebook_complete expunha cost_price REAL para anon.
-- Mascara fail-safe por papel (revela so authenticated/service_role). GROUP BY mantido (p.cost_price segue agrupado).
-- ANTI-REGRESSAO: preservar o CASE na coluna cost_price.
CREATE OR REPLACE VIEW public.vw_product_notebook_complete AS
 SELECT p.id AS product_id, p.name AS product_name, p.sku,
    (CASE WHEN auth.role() = ANY (ARRAY['authenticated'::text,'service_role'::text]) THEN p.cost_price ELSE NULL::numeric END)::numeric(10,2) AS cost_price,
    p.is_active, s.name AS supplier_name, pf.code AS format_code, pf.name AS format_name, pf.width_cm, pf.height_cm,
    pr.code AS ruling_code, pr.name AS ruling_name, pw.weight_gsm, pw.description AS weight_description,
    pc.code AS paper_color_code, pc.name AS paper_color_name, pns.sheet_count, bt.code AS binding_code, bt.name_pt AS binding_name,
    bc.code AS binding_color_code, bc.name AS binding_color_name, ct.code AS cover_type_code, ct.name AS cover_type_name,
    cm.code AS cover_material_code, cm.name AS cover_material_name, cm.is_eco_friendly, cf.code AS cover_finish_code, cf.name AS cover_finish_name,
    pns.source_supplier, pns.confidence_score, pns.manually_reviewed, pns.created_at AS spec_created_at, pns.updated_at AS spec_updated_at,
    COALESCE(array_agg(nf.code ORDER BY nf.display_order) FILTER (WHERE nf.code IS NOT NULL), ARRAY[]::text[]::character varying[]) AS feature_codes,
    COALESCE(array_agg(nf.name ORDER BY nf.display_order) FILTER (WHERE nf.name IS NOT NULL), ARRAY[]::text[]::character varying[]) AS feature_names
   FROM products p
     JOIN suppliers s ON s.id = p.supplier_id
     JOIN product_notebook_specs pns ON pns.product_id = p.id
     LEFT JOIN paper_formats pf ON pf.id = pns.paper_format_id
     LEFT JOIN paper_rulings pr ON pr.id = pns.paper_ruling_id
     LEFT JOIN paper_weights pw ON pw.id = pns.paper_weight_id
     LEFT JOIN paper_colors pc ON pc.id = pns.paper_color_id
     LEFT JOIN binding_types bt ON bt.id = pns.binding_type_id
     LEFT JOIN binding_colors bc ON bc.id = pns.binding_color_id
     LEFT JOIN cover_types ct ON ct.id = pns.cover_type_id
     LEFT JOIN cover_materials cm ON cm.id = pns.cover_material_id
     LEFT JOIN cover_finishes cf ON cf.id = pns.cover_finish_id
     LEFT JOIN product_notebook_features pnf ON pnf.product_id = p.id
     LEFT JOIN notebook_features nf ON nf.id = pnf.feature_id
  GROUP BY p.id, p.name, p.sku, p.cost_price, p.is_active, s.name, pf.code, pf.name, pf.width_cm, pf.height_cm, pr.code, pr.name, pw.weight_gsm, pw.description, pc.code, pc.name, pns.sheet_count, bt.code, bt.name_pt, bc.code, bc.name, ct.code, ct.name, cm.code, cm.name, cm.is_eco_friendly, cf.code, cf.name, pns.source_supplier, pns.confidence_score, pns.manually_reviewed, pns.created_at, pns.updated_at;;
