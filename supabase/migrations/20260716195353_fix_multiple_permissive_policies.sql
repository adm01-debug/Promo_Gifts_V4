-- Migration 035: Consolidate multiple permissive RLS policies

-- ─── Pattern A: Split FOR ALL admin → INSERT/UPDATE/DELETE ──────────────────

-- 1) kit_component_enrichment_raw
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'kit_component_enrichment_raw') THEN
    DROP POLICY IF EXISTS kcer_admin_all ON public.kit_component_enrichment_raw;
    CREATE POLICY kcer_admin_insert ON public.kit_component_enrichment_raw
      FOR INSERT TO public WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY kcer_admin_update ON public.kit_component_enrichment_raw
      FOR UPDATE TO public
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY kcer_admin_delete ON public.kit_component_enrichment_raw
      FOR DELETE TO public USING (is_admin_or_above((SELECT auth.uid())));
    RAISE NOTICE '✓ kit_component_enrichment_raw: split kcer_admin_all → INSERT/UPDATE/DELETE';
  END IF;
END;
$$;

-- 2) kit_component_padronizacao
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'kit_component_padronizacao') THEN
    DROP POLICY IF EXISTS kcpad_admin_write ON public.kit_component_padronizacao;
    CREATE POLICY kcpad_admin_insert ON public.kit_component_padronizacao
      FOR INSERT TO public WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY kcpad_admin_update ON public.kit_component_padronizacao
      FOR UPDATE TO public
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY kcpad_admin_delete ON public.kit_component_padronizacao
      FOR DELETE TO public USING (is_admin_or_above((SELECT auth.uid())));
    RAISE NOTICE '✓ kit_component_padronizacao: split kcpad_admin_write → INSERT/UPDATE/DELETE';
  END IF;
END;
$$;

-- 3) color_synonym_map
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'color_synonym_map') THEN
    DROP POLICY IF EXISTS csm_write_admin ON public.color_synonym_map;
    CREATE POLICY csm_admin_insert ON public.color_synonym_map
      FOR INSERT TO authenticated WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY csm_admin_update ON public.color_synonym_map
      FOR UPDATE TO authenticated
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY csm_admin_delete ON public.color_synonym_map
      FOR DELETE TO authenticated USING (is_admin_or_above((SELECT auth.uid())));
    RAISE NOTICE '✓ color_synonym_map: split csm_write_admin → INSERT/UPDATE/DELETE';
  END IF;
END;
$$;

-- 4) product_qa_image_alerts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'product_qa_image_alerts') THEN
    DROP POLICY IF EXISTS qa_alerts_write_admin ON public.product_qa_image_alerts;
    CREATE POLICY qa_alerts_admin_insert ON public.product_qa_image_alerts
      FOR INSERT TO authenticated WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY qa_alerts_admin_update ON public.product_qa_image_alerts
      FOR UPDATE TO authenticated
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY qa_alerts_admin_delete ON public.product_qa_image_alerts
      FOR DELETE TO authenticated USING (is_admin_or_above((SELECT auth.uid())));
    RAISE NOTICE '✓ product_qa_image_alerts: split qa_alerts_write_admin → INSERT/UPDATE/DELETE';
  END IF;
END;
$$;

-- 5) qa_image_coverage_log
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'qa_image_coverage_log') THEN
    DROP POLICY IF EXISTS qa_coverage_write_admin ON public.qa_image_coverage_log;
    CREATE POLICY qa_coverage_admin_insert ON public.qa_image_coverage_log
      FOR INSERT TO authenticated WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY qa_coverage_admin_update ON public.qa_image_coverage_log
      FOR UPDATE TO authenticated
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
    CREATE POLICY qa_coverage_admin_delete ON public.qa_image_coverage_log
      FOR DELETE TO authenticated USING (is_admin_or_above((SELECT auth.uid())));
    RAISE NOTICE '✓ qa_image_coverage_log: split qa_coverage_write_admin → INSERT/UPDATE/DELETE';
  END IF;
END;
$$;

-- ─── Pattern B: Merge two SELECT policies into one ──────────────────────────

-- 6) collection_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'collection_items') THEN
    DROP POLICY IF EXISTS "Public can view items of public collections" ON public.collection_items;
    DROP POLICY IF EXISTS collection_items_own_select ON public.collection_items;
    CREATE POLICY collection_items_select ON public.collection_items
      FOR SELECT TO public
      USING (
        EXISTS (
          SELECT 1 FROM collections
          WHERE collections.id = collection_items.collection_id
            AND collections.user_id = (SELECT auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM collections c
          WHERE c.id = collection_items.collection_id
            AND c.is_public = true
            AND c.share_token IS NOT NULL
            AND (c.share_expires_at IS NULL OR c.share_expires_at > now())
        )
      );
    RAISE NOTICE '✓ collection_items: merged 2 SELECT policies → collection_items_select';
  END IF;
END;
$$;

-- 7) magazine_templates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'magazine_templates') THEN
    DROP POLICY IF EXISTS templates_org_read ON public.magazine_templates;
    DROP POLICY IF EXISTS templates_owner_all ON public.magazine_templates;
    CREATE POLICY magazine_templates_select ON public.magazine_templates
      FOR SELECT TO authenticated
      USING (
        owner_id = (SELECT auth.uid())
        OR (
          shared_in_org = true
          AND organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = magazine_templates.organization_id
              AND om.user_id = (SELECT auth.uid())
          )
        )
      );
    CREATE POLICY magazine_templates_insert ON public.magazine_templates
      FOR INSERT TO authenticated
      WITH CHECK (owner_id = (SELECT auth.uid()));
    CREATE POLICY magazine_templates_update ON public.magazine_templates
      FOR UPDATE TO authenticated
      USING (owner_id = (SELECT auth.uid()))
      WITH CHECK (owner_id = (SELECT auth.uid()));
    CREATE POLICY magazine_templates_delete ON public.magazine_templates
      FOR DELETE TO authenticated
      USING (owner_id = (SELECT auth.uid()));
    RAISE NOTICE '✓ magazine_templates: merged SELECT + split write → 4 policies';
  END IF;
END;
$$;

-- 8) magazines
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'magazines') THEN
    DROP POLICY IF EXISTS magazines_all ON public.magazines;
    DROP POLICY IF EXISTS magazines_org_read ON public.magazines;
    CREATE POLICY magazines_select ON public.magazines
      FOR SELECT TO authenticated
      USING (
        has_role((SELECT auth.uid()), 'admin'::app_role)
        OR ((owner_id = (SELECT auth.uid())) AND (deleted_at IS NULL))
        OR (
          organization_id IS NOT NULL
          AND deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = magazines.organization_id
              AND om.user_id = (SELECT auth.uid())
          )
        )
      );
    CREATE POLICY magazines_insert ON public.magazines
      FOR INSERT TO authenticated
      WITH CHECK (
        has_role((SELECT auth.uid()), 'admin'::app_role)
        OR owner_id = (SELECT auth.uid())
      );
    CREATE POLICY magazines_update ON public.magazines
      FOR UPDATE TO authenticated
      USING (
        has_role((SELECT auth.uid()), 'admin'::app_role)
        OR ((owner_id = (SELECT auth.uid())) AND (deleted_at IS NULL))
      )
      WITH CHECK (
        has_role((SELECT auth.uid()), 'admin'::app_role)
        OR owner_id = (SELECT auth.uid())
      );
    CREATE POLICY magazines_delete ON public.magazines
      FOR DELETE TO authenticated
      USING (
        has_role((SELECT auth.uid()), 'admin'::app_role)
        OR owner_id = (SELECT auth.uid())
      );
    RAISE NOTICE '✓ magazines: merged SELECT + split write → 4 policies';
  END IF;
END;
$$;

-- ─── Pattern C: Narrow TO public → TO anon ──────────────────────────────────

-- 9) product_attributes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'product_attributes') THEN
    DROP POLICY IF EXISTS pa_select_public ON public.product_attributes;
    CREATE POLICY pa_select_anon ON public.product_attributes
      FOR SELECT TO anon
      USING ((is_active = true) AND (is_visible = true));
    RAISE NOTICE '✓ product_attributes: replaced pa_select_public (TO public) → pa_select_anon (TO anon)';
  END IF;
END;
$$;

-- ─── Validation ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  dropped_still_exists text[] := ARRAY[]::text[];
  check_pairs text[][] := ARRAY[
    ARRAY['kit_component_enrichment_raw', 'kcer_admin_all'],
    ARRAY['kit_component_padronizacao',   'kcpad_admin_write'],
    ARRAY['color_synonym_map',            'csm_write_admin'],
    ARRAY['product_qa_image_alerts',      'qa_alerts_write_admin'],
    ARRAY['qa_image_coverage_log',        'qa_coverage_write_admin'],
    ARRAY['collection_items',             'collection_items_own_select'],
    ARRAY['magazine_templates',           'templates_org_read'],
    ARRAY['magazine_templates',           'templates_owner_all'],
    ARRAY['magazines',                    'magazines_all'],
    ARRAY['magazines',                    'magazines_org_read'],
    ARRAY['product_attributes',           'pa_select_public']
  ];
  pair text[];
  still_found boolean;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY check_pairs LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = pair[1]
        AND policyname = pair[2]
    ) INTO still_found;
    IF still_found THEN
      dropped_still_exists := dropped_still_exists || (pair[1] || '.' || pair[2]);
    END IF;
  END LOOP;

  IF array_length(dropped_still_exists, 1) > 0 THEN
    RAISE WARNING 'Policies still present after drop: %', array_to_string(dropped_still_exists, ', ');
  ELSE
    RAISE NOTICE '✓ All target policies dropped successfully';
  END IF;

  RAISE NOTICE 'Migration 035 complete.';
END;
$$;;
