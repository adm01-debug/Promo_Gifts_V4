-- Reconciliação: 2 produtos ATIVOS com material eco têm a categoria Ecologia mas faltava
-- a data comemorativa "Dia do Meio Ambiente" que o trigger fn_auto_link_eco_material vincula.
-- Aplica a MESMA regra canônica (set-based, idempotente, shape espelhado). Reversível via log.
-- ANTI-REGRESSAO: NÃO remover; alinha eco-material -> eco-date para produtos ativos.

CREATE TABLE IF NOT EXISTS public.eco_date_reconcile_log_20260626 (
  product_id uuid PRIMARY KEY,
  sku text,
  name text,
  commemorative_date_id uuid,
  reconciled_at timestamptz DEFAULT now()
);

INSERT INTO public.eco_date_reconcile_log_20260626(product_id, sku, name, commemorative_date_id)
SELECT DISTINCT pm.product_id, p.sku, p.name, '11b59fa3-14f1-4f5b-8c92-2e9bcb03e216'::uuid
FROM product_materials pm
JOIN eco_material_config e ON e.material_id=pm.material_id AND COALESCE(e.is_active,true)
JOIN products p ON p.id=pm.product_id
WHERE pm.is_active AND p.is_active AND p.is_deleted IS NOT TRUE
  AND NOT EXISTS (SELECT 1 FROM product_commemorative_dates pcd
                  WHERE pcd.product_id=pm.product_id
                    AND pcd.commemorative_date_id='11b59fa3-14f1-4f5b-8c92-2e9bcb03e216')
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO product_commemorative_dates
  (product_id, commemorative_date_id, source, category_id, is_featured, relevance_score, display_order, is_active)
SELECT DISTINCT pm.product_id, '11b59fa3-14f1-4f5b-8c92-2e9bcb03e216'::uuid,
       'category', NULL::uuid, false, 5, 0, true
FROM product_materials pm
JOIN eco_material_config e ON e.material_id=pm.material_id AND COALESCE(e.is_active,true)
JOIN products p ON p.id=pm.product_id
WHERE pm.is_active AND p.is_active AND p.is_deleted IS NOT TRUE
  AND NOT EXISTS (SELECT 1 FROM product_commemorative_dates pcd
                  WHERE pcd.product_id=pm.product_id
                    AND pcd.commemorative_date_id='11b59fa3-14f1-4f5b-8c92-2e9bcb03e216')
ON CONFLICT (product_id, commemorative_date_id) DO NOTHING;;
