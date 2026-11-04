-- T31: Fix multiple_permissive_policies (56 advisor violations across 12 tables)
-- Strategy A: DROP service_role policies (service_role bypasses RLS — fully safe)
-- Strategy B: Split ALL policies into FOR INSERT + FOR UPDATE + FOR DELETE
--             (removes SELECT overlap that causes violations)
-- Strategy C: Merge conflicting SELECT-only policies into one
-- ─────────────────────────────────────────────────────────────────────────────

-- ── A. DROP service_role policies (redundant) ──────────────────────────────
DROP POLICY "color_groups_service_role"    ON public.color_groups;
DROP POLICY "material_groups_service_role" ON public.material_groups;
DROP POLICY "pi_all_service"               ON public.product_images;
DROP POLICY "pv_all_service"               ON public.product_videos;

-- ── B1. ai_usage_quotas: admin_write ALL → INSERT + UPDATE + DELETE ─────────
DROP POLICY "ai_usage_quotas_admin_write" ON public.ai_usage_quotas;
CREATE POLICY "ai_usage_quotas_admin_insert" ON public.ai_usage_quotas
  FOR INSERT WITH CHECK (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "ai_usage_quotas_admin_update" ON public.ai_usage_quotas
  FOR UPDATE
  USING  (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role))
  WITH CHECK (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE POLICY "ai_usage_quotas_admin_delete" ON public.ai_usage_quotas
  FOR DELETE USING (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));

-- ── B2. collection_items: manage ALL → INSERT + UPDATE + DELETE ─────────────
DROP POLICY "Users can manage own collection items" ON public.collection_items;
CREATE POLICY "collection_items_own_insert" ON public.collection_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM collections
            WHERE collections.id = collection_items.collection_id
              AND collections.user_id = (SELECT auth.uid()))
  );
CREATE POLICY "collection_items_own_update" ON public.collection_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM collections
                 WHERE collections.id = collection_items.collection_id
                   AND collections.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM collections
                      WHERE collections.id = collection_items.collection_id
                        AND collections.user_id = (SELECT auth.uid())));
CREATE POLICY "collection_items_own_delete" ON public.collection_items
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM collections
            WHERE collections.id = collection_items.collection_id
              AND collections.user_id = (SELECT auth.uid()))
  );

-- ── B3. collections: manage ALL → INSERT + UPDATE + DELETE ──────────────────
DROP POLICY "Users can manage own collections" ON public.collections;
CREATE POLICY "collections_own_insert" ON public.collections
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "collections_own_update" ON public.collections
  FOR UPDATE TO authenticated
  USING  (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "collections_own_delete" ON public.collections
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- ── B4. color_groups: isolation ALL → INSERT + UPDATE + DELETE ───────────────
DROP POLICY "color_groups_isolation" ON public.color_groups;
CREATE POLICY "color_groups_isolation_insert" ON public.color_groups
  FOR INSERT WITH CHECK (
    organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
  );
CREATE POLICY "color_groups_isolation_update" ON public.color_groups
  FOR UPDATE
  USING  (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid)
  WITH CHECK (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid);
CREATE POLICY "color_groups_isolation_delete" ON public.color_groups
  FOR DELETE USING (
    organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
  );

-- ── B5. commemorative_date_colors: admin ALL → INSERT + UPDATE + DELETE ──────
DROP POLICY "cdc_admin_or_above" ON public.commemorative_date_colors;
CREATE POLICY "cdc_admin_insert" ON public.commemorative_date_colors
  FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
CREATE POLICY "cdc_admin_update" ON public.commemorative_date_colors
  FOR UPDATE USING  (is_admin_or_above((SELECT auth.uid())))
             WITH CHECK (is_admin_or_above((SELECT auth.uid())));
CREATE POLICY "cdc_admin_delete" ON public.commemorative_date_colors
  FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));

-- ── B6. commemorative_date_exclusions: admin ALL → INSERT + UPDATE + DELETE ──
DROP POLICY "cde_admin_or_above" ON public.commemorative_date_exclusions;
CREATE POLICY "cde_admin_insert" ON public.commemorative_date_exclusions
  FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
CREATE POLICY "cde_admin_update" ON public.commemorative_date_exclusions
  FOR UPDATE USING  (is_admin_or_above((SELECT auth.uid())))
             WITH CHECK (is_admin_or_above((SELECT auth.uid())));
CREATE POLICY "cde_admin_delete" ON public.commemorative_date_exclusions
  FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));

-- ── B7. commemorative_dates: admin ALL → INSERT + UPDATE + DELETE ────────────
DROP POLICY "Admins can manage commemorative dates" ON public.commemorative_dates;
CREATE POLICY "commemorative_dates_admin_insert" ON public.commemorative_dates
  FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
CREATE POLICY "commemorative_dates_admin_update" ON public.commemorative_dates
  FOR UPDATE USING  (is_admin_or_above((SELECT auth.uid())))
             WITH CHECK (is_admin_or_above((SELECT auth.uid())));
CREATE POLICY "commemorative_dates_admin_delete" ON public.commemorative_dates
  FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));

-- ── B8. material_groups: DROP both ALL policies entirely ─────────────────────
-- (mg_select/insert/update/delete already provide full org-level isolation via
--  user profile org membership — isolation policy is redundant)
DROP POLICY "material_groups_isolation" ON public.material_groups;

-- ── B9. variant_commemorative_dates: admin ALL → INSERT + UPDATE + DELETE ────
DROP POLICY "Admins or above manage variant commemorative dates"
  ON public.variant_commemorative_dates;
CREATE POLICY "vcd_admin_insert" ON public.variant_commemorative_dates
  FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
CREATE POLICY "vcd_admin_update" ON public.variant_commemorative_dates
  FOR UPDATE USING  (is_admin_or_above((SELECT auth.uid())))
             WITH CHECK (is_admin_or_above((SELECT auth.uid())));
CREATE POLICY "vcd_admin_delete" ON public.variant_commemorative_dates
  FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));

-- ── C1. product_images: merge two SELECT policies into one ───────────────────
-- pi_select_auth (authenticated, true) + product_images_select_public (public, is_active)
-- Merged: authenticated can see all (auth.uid() IS NOT NULL), anon sees only active
DROP POLICY "pi_select_auth"               ON public.product_images;
DROP POLICY "product_images_select_public" ON public.product_images;
CREATE POLICY "product_images_select" ON public.product_images
  FOR SELECT USING ((is_active = true) OR ((SELECT auth.uid()) IS NOT NULL));

-- ── C2. product_videos: merge two SELECT policies into one ───────────────────
DROP POLICY "pv_select_auth"               ON public.product_videos;
DROP POLICY "product_videos_select_public" ON public.product_videos;
CREATE POLICY "product_videos_select" ON public.product_videos
  FOR SELECT USING ((is_active = true) OR ((SELECT auth.uid()) IS NOT NULL));

-- ── C3. profiles: merge two SELECT policies into one ────────────────────────
DROP POLICY "Admins can read all profiles" ON public.profiles;
DROP POLICY "Users can read own profile"   ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    ((SELECT auth.uid()) = id) OR is_admin_or_above((SELECT auth.uid()))
  );
