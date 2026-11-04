-- ============================================================
-- Phase 5 Security Views (2026-05-31)
-- Roles: dev, supervisor, admin, manager, agente, coordenador, vendedor
-- ============================================================

-- 1. v_variant_sale_prices_public: hides cost_price_1..5 and markup_percent
CREATE OR REPLACE VIEW v_variant_sale_prices_public AS
SELECT
  variant_id,
  product_id,
  sku,
  color_name,
  min_qty_1, sale_price_1,
  min_qty_2, sale_price_2,
  min_qty_3, sale_price_3,
  min_qty_4, sale_price_4,
  min_qty_5, sale_price_5
FROM vw_variant_sale_prices;

GRANT SELECT ON v_variant_sale_prices_public TO anon, authenticated;
COMMENT ON VIEW v_variant_sale_prices_public IS 
  'Public-safe variant pricing: sale prices and quantity tiers only. cost_price and markup excluded.';


-- 2. v_price_history_safe: excludes old_values/new_values JSONB (may contain cost data)
CREATE OR REPLACE VIEW v_price_history_safe AS
SELECT
  id,
  variant_id,
  change_type,
  change_reason,
  changed_by,
  changed_at,
  source
FROM price_history;

GRANT SELECT ON v_price_history_safe TO authenticated;
COMMENT ON VIEW v_price_history_safe IS 
  'Safe price history: metadata only. JSONB price values (old_values, new_values) excluded.';


-- 3. Tighten price_history RLS: was open to all auth users, restrict to admin/supervisor+
DROP POLICY IF EXISTS "auth_read_price_history" ON price_history;
CREATE POLICY "admin_read_price_history" ON price_history
  FOR SELECT
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR has_role((SELECT auth.uid()), 'dev'::app_role)
    OR has_role((SELECT auth.uid()), 'supervisor'::app_role)
    OR has_role((SELECT auth.uid()), 'manager'::app_role)
  );
COMMENT ON POLICY "admin_read_price_history" ON price_history IS
  'Only admin, dev, supervisor, manager can read raw price history. Others use v_price_history_safe.';


-- 4. v_my_markup_config: org-isolated markup config view
-- markup_configurations already has 4 policies. This view gives an ergonomic
-- scoped read that the frontend can call without knowing the org_id.
CREATE OR REPLACE VIEW v_my_markup_config AS
SELECT
  mc.id,
  mc.organization_id,
  mc.supplier_id,
  mc.category_id,
  mc.product_id,
  mc.variant_id,
  mc.description,
  mc.is_active,
  mc.priority,
  mc.created_at,
  mc.updated_at
  -- markup_percent excluded from this public-facing view
FROM markup_configurations mc
INNER JOIN user_organizations uo ON uo.organization_id = mc.organization_id
WHERE uo.user_id = auth.uid()
  AND mc.is_active = TRUE;

GRANT SELECT ON v_my_markup_config TO authenticated;
COMMENT ON VIEW v_my_markup_config IS
  'Org-isolated markup config. Returns only current user org rules. markup_percent excluded.';


-- 5. Ensure system_kill_switches is readable by anon (required by kill-switch-client.ts)
ALTER TABLE IF EXISTS system_kill_switches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_kill_switches" ON system_kill_switches;
CREATE POLICY "anon_read_kill_switches" ON system_kill_switches
  FOR SELECT USING (true);
COMMENT ON POLICY "anon_read_kill_switches" ON system_kill_switches IS
  'Kill-switch state readable by anyone — governs routing, not data.';
