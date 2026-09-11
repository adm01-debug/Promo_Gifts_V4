-- ============================================================================
-- Módulo 03 (Materiais) — Backfill alinhado ao pipeline Bronze->Prata->Ouro
-- A2: insere material normalizado p/ 2 produtos ativos sem material
--     (o extrator de nome não reconhece "Caderno"->Papel nem "plástica"->Plástico;
--      provado via fn_extract_material_from_name() => []). Inserimos na fonte de
--      verdade (product_materials) e os triggers cascateiam materials + auto_material.
-- A1: recomputa auto_material para a "dívida de derivação" (322 produtos com
--     product_materials ativo porém auto_material NULL, pois a lógica de auto_material
--     foi adicionada à fn_sync depois). Usa a MESMA regra do trigger:
--     material dominante por percentage DESC NULLS LAST, sort_order ASC.
--     Não altera 'materials' => WHEN dos triggers de extração ficam falsos => sem cascata.
-- Guard: bulk_import_mode=true (defense-in-depth contra cascata reversa).
-- fix_version: 2026-06-26-mod03-backfill
-- ============================================================================
SELECT set_config('app.bulk_import_mode', 'true', true);

-- A2 ------------------------------------------------------------------------
INSERT INTO product_materials (organization_id, product_id, material_id, part, percentage, sort_order, is_active)
SELECT p.organization_id, p.id, v.mat_id, 'corpo', 100, 1, true
FROM products p
JOIN (VALUES
  ('15466F',  '5d1195c5-2f09-4403-b9dc-b3db0ad0f30f'::uuid),   -- Caderno -> Papel Genérico
  ('P@13190C','e0a1a83e-7ea7-41c8-87f9-87b2ad85be9e'::uuid)    -- Caneta plástica -> Plástico Genérico
) AS v(sku, mat_id) ON v.sku = p.sku_promo
WHERE p.is_active
  AND NOT EXISTS (SELECT 1 FROM product_materials pm WHERE pm.product_id = p.id AND pm.is_active);

-- A1 ------------------------------------------------------------------------
WITH dom AS (
  SELECT p.id AS pid,
         (SELECT mt.name
            FROM product_materials pm
            JOIN material_types mt ON mt.id = pm.material_id
           WHERE pm.product_id = p.id AND pm.is_active
           ORDER BY pm.percentage DESC NULLS LAST, pm.sort_order ASC
           LIMIT 1) AS primary_mat
  FROM products p
  WHERE p.auto_material IS NULL
    AND EXISTS (SELECT 1 FROM product_materials pm WHERE pm.product_id = p.id AND pm.is_active)
)
UPDATE products p
   SET auto_material = dom.primary_mat,
       updated_at    = now()
  FROM dom
 WHERE p.id = dom.pid
   AND dom.primary_mat IS NOT NULL;;
