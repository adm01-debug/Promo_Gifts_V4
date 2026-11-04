-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ A1-1c: Reescreve 114 policies + 1 função + 1 trigger                    │
-- │                                                                         │
-- │ Mapping de helpers (decisões aprovadas Joaquim 10/05/2026):             │
-- │   is_admin_strict(uid)         → is_dev(uid)             [27 policies]  │
-- │   is_supervisor_or_above(uid)  → is_admin_or_above OR    [23 policies]  │
-- │                                  is_coord_or_above (caso a caso)        │
-- │   is_admin(uid) (legacy)       → is_admin_or_above OR    [59 policies]  │
-- │                                  is_coord_or_above (caso a caso)        │
-- │   profiles.role='admin'        → is_admin_or_above        [4 policies]  │
-- │   fn_is_admin_user             → is_admin_or_above        [1 policy]    │
-- │                                                                         │
-- │ Função fn_is_admin_user: vira alias de is_admin_or_above (preserva      │
-- │ contrato com p_user_id uuid DEFAULT NULL pra callers existentes).       │
-- │                                                                         │
-- │ Trigger fn_grant_default_role_on_profile: mapping novo                  │
-- │   profile.role='admin'   → admin                                        │
-- │   profile.role='manager' → coordenador                                  │
-- │   profile.role IN ('sales','seller') → vendedor                         │
-- │   profile.role='dev'     → dev                                          │
-- │   default                → vendedor                                     │
-- │                                                                         │
-- │ Restore point pré-A1-1c (PITR contínuo):                                │
-- │   timestamp: 2026-05-10 17:09:34 UTC                                    │
-- │   lsn:       D6/31000168                                                │
-- │   wal_file:  00000001000000D600000031                                   │
-- │                                                                         │
-- │ FORA DE ESCOPO (não tocadas, vão pra A1-X futuras):                     │
-- │   - 64 policies que usam is_org_*/user_is_org_member (sistema paralelo) │
-- │   - 8 policies que já usam is_dev (mantidas)                            │
-- │   - 272 policies sem ref a role (auth.uid puro, etc.)                   │
-- └─────────────────────────────────────────────────────────────────────────┘

-- ===== BLOCO 1: Função fn_is_admin_user vira alias de is_admin_or_above =====
-- Preserva nome do parâmetro (p_user_id) e DEFAULT NULL pro contrato.

CREATE OR REPLACE FUNCTION public.fn_is_admin_user(p_user_id uuid DEFAULT NULL)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT public.is_admin_or_above(COALESCE(p_user_id, auth.uid()));
$$;

COMMENT ON FUNCTION public.fn_is_admin_user(uuid) IS
  'A1-1c: alias de is_admin_or_above. Mantida por compat com callers existentes (frontend/edges). Em A1-X futuro, considerar deprecation se zero usos detectados.';

-- ===== BLOCO 2: Trigger fn_grant_default_role_on_profile com mapping 4-níveis =====

CREATE OR REPLACE FUNCTION public.fn_grant_default_role_on_profile()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.role = 'admin'             THEN 'admin'::public.app_role
        WHEN NEW.role = 'manager'           THEN 'coordenador'::public.app_role
        WHEN NEW.role IN ('sales','seller') THEN 'vendedor'::public.app_role
        WHEN NEW.role = 'dev'               THEN 'dev'::public.app_role
        ELSE 'vendedor'::public.app_role
      END,
      NEW.id  -- self-granted; trigger only fires on first INSERT
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_grant_default_role_on_profile() IS
  'A1-1c: cria linha em user_roles na criacao de profile, mapeando profile.role (text) para app_role (enum 4-niveis). Default seguro: vendedor.';

-- ===== BLOCO 3: Reescrita das 114 policies =====
-- Estratégia: DROP IF EXISTS + CREATE com expressão que preserva subqueries e
-- self-checks (auth.uid()), trocando apenas o helper de papel.

-- ─── _unif_pending_log (1) ───
DROP POLICY IF EXISTS "_unif_pending_log_dev_only" ON public._unif_pending_log;
CREATE POLICY "_unif_pending_log_dev_only" ON public._unif_pending_log
  FOR ALL TO authenticated
  USING (public.is_dev(auth.uid()))
  WITH CHECK (public.is_dev(auth.uid()));

-- ─── _unif_settings_arquivo (1) ───
DROP POLICY IF EXISTS "_unif_settings_arquivo_dev_only" ON public._unif_settings_arquivo;
CREATE POLICY "_unif_settings_arquivo_dev_only" ON public._unif_settings_arquivo
  FOR ALL TO authenticated
  USING (public.is_dev(auth.uid()))
  WITH CHECK (public.is_dev(auth.uid()));

-- ─── admin_audit_log (1) ───
DROP POLICY IF EXISTS "Supervisors can insert audit entries" ON public.admin_audit_log;
CREATE POLICY "Admins or above can insert audit entries" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()) AND user_id = auth.uid());

-- ─── analytics_events (2) ───
DROP POLICY IF EXISTS "ae_delete_dev" ON public.analytics_events;
CREATE POLICY "ae_delete_dev" ON public.analytics_events
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "ae_select_own_or_supervisor" ON public.analytics_events;
CREATE POLICY "ae_select_own_or_coord" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

-- ─── auto_tag_rules (3) ───
DROP POLICY IF EXISTS "atr_admin_insert" ON public.auto_tag_rules;
CREATE POLICY "atr_admin_insert" ON public.auto_tag_rules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "atr_admin_update" ON public.auto_tag_rules;
CREATE POLICY "atr_admin_update" ON public.auto_tag_rules
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "atr_dev_delete" ON public.auto_tag_rules;
CREATE POLICY "atr_dev_delete" ON public.auto_tag_rules
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── bot_detection_log (1) ───
DROP POLICY IF EXISTS "Admins can read bot log" ON public.bot_detection_log;
CREATE POLICY "Admins can read bot log" ON public.bot_detection_log
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

-- ─── category_accessory_categories (3) ───
DROP POLICY IF EXISTS "cat_admin_insert" ON public.category_accessory_categories;
CREATE POLICY "cat_admin_insert" ON public.category_accessory_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_admin_update" ON public.category_accessory_categories;
CREATE POLICY "cat_admin_update" ON public.category_accessory_categories
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_dev_delete" ON public.category_accessory_categories;
CREATE POLICY "cat_dev_delete" ON public.category_accessory_categories
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── category_colors (3) ───
DROP POLICY IF EXISTS "cat_admin_insert" ON public.category_colors;
CREATE POLICY "cat_admin_insert" ON public.category_colors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_admin_update" ON public.category_colors;
CREATE POLICY "cat_admin_update" ON public.category_colors
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_dev_delete" ON public.category_colors;
CREATE POLICY "cat_dev_delete" ON public.category_colors
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── category_commemorative_dates (3) ───
DROP POLICY IF EXISTS "cat_admin_insert" ON public.category_commemorative_dates;
CREATE POLICY "cat_admin_insert" ON public.category_commemorative_dates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_admin_update" ON public.category_commemorative_dates;
CREATE POLICY "cat_admin_update" ON public.category_commemorative_dates
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_dev_delete" ON public.category_commemorative_dates;
CREATE POLICY "cat_dev_delete" ON public.category_commemorative_dates
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── category_copywriting_config (3) ───
DROP POLICY IF EXISTS "cat_admin_insert" ON public.category_copywriting_config;
CREATE POLICY "cat_admin_insert" ON public.category_copywriting_config
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_admin_update" ON public.category_copywriting_config;
CREATE POLICY "cat_admin_update" ON public.category_copywriting_config
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_dev_delete" ON public.category_copywriting_config;
CREATE POLICY "cat_dev_delete" ON public.category_copywriting_config
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── category_target_audiences (3) ───
DROP POLICY IF EXISTS "cat_admin_insert" ON public.category_target_audiences;
CREATE POLICY "cat_admin_insert" ON public.category_target_audiences
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_admin_update" ON public.category_target_audiences;
CREATE POLICY "cat_admin_update" ON public.category_target_audiences
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_dev_delete" ON public.category_target_audiences;
CREATE POLICY "cat_dev_delete" ON public.category_target_audiences
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── category_variation_types (3) ───
DROP POLICY IF EXISTS "cat_admin_insert" ON public.category_variation_types;
CREATE POLICY "cat_admin_insert" ON public.category_variation_types
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_admin_update" ON public.category_variation_types;
CREATE POLICY "cat_admin_update" ON public.category_variation_types
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "cat_dev_delete" ON public.category_variation_types;
CREATE POLICY "cat_dev_delete" ON public.category_variation_types
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── commemorative_date_colors (1, lia profiles.role direto) ───
DROP POLICY IF EXISTS "cdc_admin" ON public.commemorative_date_colors;
CREATE POLICY "cdc_admin_or_above" ON public.commemorative_date_colors
  FOR ALL TO public
  USING (public.is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_above((SELECT auth.uid())));

-- ─── commemorative_date_exclusions (1, lia profiles.role direto) ───
DROP POLICY IF EXISTS "cde_admin" ON public.commemorative_date_exclusions;
CREATE POLICY "cde_admin_or_above" ON public.commemorative_date_exclusions
  FOR ALL TO public
  USING (public.is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_above((SELECT auth.uid())));

-- ─── commemorative_dates (1, lia profiles.role direto) ───
DROP POLICY IF EXISTS "Admins can manage commemorative dates" ON public.commemorative_dates;
CREATE POLICY "Admins can manage commemorative dates" ON public.commemorative_dates
  FOR ALL TO public
  USING (public.is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_above((SELECT auth.uid())));

-- ─── custom_kits (3) ───
DROP POLICY IF EXISTS "ck_delete_own_or_supervisor" ON public.custom_kits;
CREATE POLICY "ck_delete_own_or_coord" ON public.custom_kits
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "ck_select_own_or_supervisor" ON public.custom_kits;
CREATE POLICY "ck_select_own_or_coord" ON public.custom_kits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "ck_update_own_or_supervisor" ON public.custom_kits;
CREATE POLICY "ck_update_own_or_coord" ON public.custom_kits
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

-- ─── discount_approval_requests (3) ───
DROP POLICY IF EXISTS "dar_delete_dev_only" ON public.discount_approval_requests;
CREATE POLICY "dar_delete_dev_only" ON public.discount_approval_requests
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "dar_select_scope" ON public.discount_approval_requests;
CREATE POLICY "dar_select_scope" ON public.discount_approval_requests
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "dar_update_scope" ON public.discount_approval_requests;
CREATE POLICY "dar_update_scope" ON public.discount_approval_requests
  FOR UPDATE TO authenticated
  USING (public.is_coord_or_above(auth.uid()))
  WITH CHECK (public.is_coord_or_above(auth.uid()));

-- ─── eco_material_config (3) ───
DROP POLICY IF EXISTS "emc_admin_insert" ON public.eco_material_config;
CREATE POLICY "emc_admin_insert" ON public.eco_material_config
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "emc_admin_update" ON public.eco_material_config;
CREATE POLICY "emc_admin_update" ON public.eco_material_config
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "emc_dev_delete" ON public.eco_material_config;
CREATE POLICY "emc_dev_delete" ON public.eco_material_config
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── edge_function_invocations (2) ───
DROP POLICY IF EXISTS "efi_delete_dev_only" ON public.edge_function_invocations;
CREATE POLICY "efi_delete_dev_only" ON public.edge_function_invocations
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "efi_select_supervisor_or_above" ON public.edge_function_invocations;
CREATE POLICY "efi_select_coord_or_above" ON public.edge_function_invocations
  FOR SELECT TO authenticated
  USING (public.is_coord_or_above(auth.uid()));

-- ─── external_connections_sync_log (1) ───
DROP POLICY IF EXISTS "Admins read external_connections_sync_log" ON public.external_connections_sync_log;
CREATE POLICY "Admins read external_connections_sync_log" ON public.external_connections_sync_log
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

-- ─── favorite_items (2) ───
DROP POLICY IF EXISTS "fi_delete_own" ON public.favorite_items;
CREATE POLICY "fi_delete_own" ON public.favorite_items
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "fi_select_own_list_or_admin" ON public.favorite_items;
CREATE POLICY "fi_select_own_list_or_coord" ON public.favorite_items
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_coord_or_above(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.favorite_lists l
      WHERE l.id = favorite_items.list_id AND l.user_id = auth.uid()
    )
  );

-- ─── favorite_items_trash (2) ───
DROP POLICY IF EXISTS "fit_delete_own" ON public.favorite_items_trash;
CREATE POLICY "fit_delete_own" ON public.favorite_items_trash
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "fit_select_own" ON public.favorite_items_trash;
CREATE POLICY "fit_select_own" ON public.favorite_items_trash
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

-- ─── favorite_lists (2) ───
DROP POLICY IF EXISTS "fl_delete_own_or_admin" ON public.favorite_lists;
CREATE POLICY "fl_delete_own_or_coord" ON public.favorite_lists
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "fl_select_own_or_supervisor" ON public.favorite_lists;
CREATE POLICY "fl_select_own_or_coord" ON public.favorite_lists
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

-- ─── file_scan_logs (1) ───
DROP POLICY IF EXISTS "Admins can read file_scan_logs" ON public.file_scan_logs;
CREATE POLICY "Admins can read file_scan_logs" ON public.file_scan_logs
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

-- ─── generated_mockups (3) ───
DROP POLICY IF EXISTS "gm_delete_own_or_admin" ON public.generated_mockups;
CREATE POLICY "gm_delete_own_or_admin" ON public.generated_mockups
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "gm_select_own_or_admin" ON public.generated_mockups;
CREATE POLICY "gm_select_own_or_admin" ON public.generated_mockups
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "gm_update_own_or_admin" ON public.generated_mockups;
CREATE POLICY "gm_update_own_or_admin" ON public.generated_mockups
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_above(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_or_above(auth.uid()));

-- ─── inbound_webhook_endpoints (1) ───
DROP POLICY IF EXISTS "Admins manage inbound_webhook_endpoints" ON public.inbound_webhook_endpoints;
CREATE POLICY "Admins manage inbound_webhook_endpoints" ON public.inbound_webhook_endpoints
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ─── inbound_webhook_events (2) ───
DROP POLICY IF EXISTS "Admins delete inbound_webhook_events" ON public.inbound_webhook_events;
CREATE POLICY "Admins delete inbound_webhook_events" ON public.inbound_webhook_events
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins read inbound_webhook_events" ON public.inbound_webhook_events;
CREATE POLICY "Admins read inbound_webhook_events" ON public.inbound_webhook_events
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

-- ─── integration_credentials (4) ───
DROP POLICY IF EXISTS "Admins can delete integration credentials" ON public.integration_credentials;
CREATE POLICY "Admins can delete integration credentials" ON public.integration_credentials
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert integration credentials" ON public.integration_credentials;
CREATE POLICY "Admins can insert integration credentials" ON public.integration_credentials
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can update integration credentials" ON public.integration_credentials;
CREATE POLICY "Admins can update integration credentials" ON public.integration_credentials
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins can view integration credentials" ON public.integration_credentials;
CREATE POLICY "Admins can view integration credentials" ON public.integration_credentials
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

-- ─── ip_access_control (1) ───
DROP POLICY IF EXISTS "Admins can manage ip_access_control" ON public.ip_access_control;
CREATE POLICY "Admins can manage ip_access_control" ON public.ip_access_control
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ─── kit_component_print_areas (3) ───
DROP POLICY IF EXISTS "kcpa_admin_delete" ON public.kit_component_print_areas;
CREATE POLICY "kcpa_dev_delete" ON public.kit_component_print_areas
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "kcpa_admin_insert" ON public.kit_component_print_areas;
CREATE POLICY "kcpa_admin_insert" ON public.kit_component_print_areas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "kcpa_admin_update" ON public.kit_component_print_areas;
CREATE POLICY "kcpa_admin_update" ON public.kit_component_print_areas
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ─── kit_component_types (3) ───
DROP POLICY IF EXISTS "kct_admin_delete" ON public.kit_component_types;
CREATE POLICY "kct_dev_delete" ON public.kit_component_types
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "kct_admin_insert" ON public.kit_component_types;
CREATE POLICY "kct_admin_insert" ON public.kit_component_types
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "kct_admin_update" ON public.kit_component_types;
CREATE POLICY "kct_admin_update" ON public.kit_component_types
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ─── kit_templates (4) ───
DROP POLICY IF EXISTS "kt_delete_dev" ON public.kit_templates;
CREATE POLICY "kt_delete_dev" ON public.kit_templates
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "kt_insert_supervisor" ON public.kit_templates;
CREATE POLICY "kt_insert_coord" ON public.kit_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "kt_select_authenticated" ON public.kit_templates;
CREATE POLICY "kt_select_authenticated" ON public.kit_templates
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "kt_update_supervisor" ON public.kit_templates;
CREATE POLICY "kt_update_coord" ON public.kit_templates
  FOR UPDATE TO authenticated
  USING (public.is_coord_or_above(auth.uid()))
  WITH CHECK (public.is_coord_or_above(auth.uid()));

-- ─── mockup_approval_links (3) ───
DROP POLICY IF EXISTS "mal_authenticated_select" ON public.mockup_approval_links;
CREATE POLICY "mal_authenticated_select" ON public.mockup_approval_links
  FOR SELECT TO authenticated
  USING (
    is_active = true 
    OR public.is_admin_or_above(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.mockup_generation_jobs j
      WHERE j.id = mockup_approval_links.job_id AND j.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "mal_delete_admin" ON public.mockup_approval_links;
CREATE POLICY "mal_delete_admin" ON public.mockup_approval_links
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "mal_update_own_or_admin" ON public.mockup_approval_links;
CREATE POLICY "mal_update_own_or_admin" ON public.mockup_approval_links
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_above(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.mockup_generation_jobs j
      WHERE j.id = mockup_approval_links.job_id AND j.user_id = auth.uid()
    )
  );

-- ─── mockup_credit_transactions (1) ───
DROP POLICY IF EXISTS "mct_select_own_or_supervisor" ON public.mockup_credit_transactions;
CREATE POLICY "mct_select_own_or_coord" ON public.mockup_credit_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_coord_or_above(auth.uid()));

-- ─── mockup_credits (2) ───
DROP POLICY IF EXISTS "mc_admin_manage" ON public.mockup_credits;
CREATE POLICY "mc_admin_manage" ON public.mockup_credits
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "mc_select_own_or_supervisor" ON public.mockup_credits;
CREATE POLICY "mc_select_own_or_coord" ON public.mockup_credits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_coord_or_above(auth.uid()));

-- ─── mockup_generation_jobs (3) ───
DROP POLICY IF EXISTS "mgj_delete_admin" ON public.mockup_generation_jobs;
CREATE POLICY "mgj_delete_dev" ON public.mockup_generation_jobs
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "mgj_select_own_or_admin" ON public.mockup_generation_jobs;
CREATE POLICY "mgj_select_own_or_coord" ON public.mockup_generation_jobs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_coord_or_above(auth.uid()));

DROP POLICY IF EXISTS "mgj_update_own_or_admin" ON public.mockup_generation_jobs;
CREATE POLICY "mgj_update_own_or_coord" ON public.mockup_generation_jobs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_coord_or_above(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_coord_or_above(auth.uid()));

-- ─── mockup_templates (2) ───
DROP POLICY IF EXISTS "mt_admin_manage" ON public.mockup_templates;
CREATE POLICY "mt_admin_manage" ON public.mockup_templates
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "mt_select_active_or_admin" ON public.mockup_templates;
CREATE POLICY "mt_select_active_or_admin" ON public.mockup_templates
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin_or_above(auth.uid()));

-- ─── permissions (1) ───
DROP POLICY IF EXISTS "Devs manage permissions" ON public.permissions;
CREATE POLICY "Devs manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.is_dev(auth.uid()))
  WITH CHECK (public.is_dev(auth.uid()));

-- ─── personalization_techniques (2) ───
DROP POLICY IF EXISTS "pt_admin_manage" ON public.personalization_techniques;
CREATE POLICY "pt_admin_manage" ON public.personalization_techniques
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "pt_select_active_or_admin" ON public.personalization_techniques;
CREATE POLICY "pt_select_active_or_admin" ON public.personalization_techniques
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin_or_above(auth.uid()));

-- ─── produto_ramo_atividade (2) ───
DROP POLICY IF EXISTS "pra_delete_supervisor" ON public.produto_ramo_atividade;
CREATE POLICY "pra_delete_admin" ON public.produto_ramo_atividade
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "pra_update_supervisor" ON public.produto_ramo_atividade;
CREATE POLICY "pra_update_admin" ON public.produto_ramo_atividade
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ─── profiles (1, usava fn_is_admin_user — agora fn_is_admin_user é alias de is_admin_or_above; reescrever direto pra explicitar) ───
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT TO public
  USING (public.is_admin_or_above((SELECT auth.uid())));

-- ─── quote_approval_tokens (2, vão ser dropadas em A1-3 mas padronizar até lá) ───
DROP POLICY IF EXISTS "qat_delete_dev" ON public.quote_approval_tokens;
CREATE POLICY "qat_delete_dev" ON public.quote_approval_tokens
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "qat_select_owner" ON public.quote_approval_tokens;
CREATE POLICY "qat_select_owner" ON public.quote_approval_tokens
  FOR SELECT TO authenticated
  USING (
    public.is_coord_or_above(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_approval_tokens.quote_id 
        AND (q.seller_id = auth.uid() OR q.created_by = auth.uid() OR q.assigned_to = auth.uid())
    )
  );

-- ─── quote_history (2) ───
DROP POLICY IF EXISTS "Sellers and supervisors create quote_history" ON public.quote_history;
CREATE POLICY "Sellers and coord create quote_history" ON public.quote_history
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND (
      public.is_coord_or_above(auth.uid()) 
      OR EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id = quote_history.quote_id 
          AND (q.created_by = auth.uid() OR q.assigned_to = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Sellers and supervisors view quote_history" ON public.quote_history;
CREATE POLICY "Sellers and coord view quote_history" ON public.quote_history
  FOR SELECT TO authenticated
  USING (
    public.is_coord_or_above(auth.uid()) 
    OR EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_history.quote_id 
        AND (q.created_by = auth.uid() OR q.assigned_to = auth.uid())
    )
  );

-- ─── quote_item_personalizations (2) ───
DROP POLICY IF EXISTS "qip_delete_own_quote" ON public.quote_item_personalizations;
CREATE POLICY "qip_delete_own_quote" ON public.quote_item_personalizations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_items qi
      JOIN public.quotes q ON q.id = qi.quote_id
      WHERE qi.id = quote_item_personalizations.quote_item_id 
        AND (q.seller_id = auth.uid() OR public.is_coord_or_above(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "qip_select_own_quote" ON public.quote_item_personalizations;
CREATE POLICY "qip_select_own_quote" ON public.quote_item_personalizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_items qi
      JOIN public.quotes q ON q.id = qi.quote_id
      WHERE qi.id = quote_item_personalizations.quote_item_id 
        AND (q.seller_id = auth.uid() OR public.is_coord_or_above(auth.uid()))
    )
  );

-- ─── ramo_atividade (1) ───
DROP POLICY IF EXISTS "ra_admin_manage" ON public.ramo_atividade;
CREATE POLICY "ra_admin_manage" ON public.ramo_atividade
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ─── ramo_atividade_filho (1) ───
DROP POLICY IF EXISTS "raf_admin_manage" ON public.ramo_atividade_filho;
CREATE POLICY "raf_admin_manage" ON public.ramo_atividade_filho
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- ─── role_permissions (1) ───
DROP POLICY IF EXISTS "Devs manage role_permissions" ON public.role_permissions;
CREATE POLICY "Devs manage role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_dev(auth.uid()))
  WITH CHECK (public.is_dev(auth.uid()));

-- ─── seller_discount_limits (4) ───
DROP POLICY IF EXISTS "sdl_admin_delete" ON public.seller_discount_limits;
CREATE POLICY "sdl_admin_delete" ON public.seller_discount_limits
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "sdl_admin_insert" ON public.seller_discount_limits;
CREATE POLICY "sdl_admin_insert" ON public.seller_discount_limits
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "sdl_admin_update" ON public.seller_discount_limits;
CREATE POLICY "sdl_admin_update" ON public.seller_discount_limits
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "sdl_select_own_or_sup" ON public.seller_discount_limits;
CREATE POLICY "sdl_select_own_or_coord" ON public.seller_discount_limits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coord_or_above(auth.uid()));

-- ─── tabela_preco_gravacao_oficial (3) ───
DROP POLICY IF EXISTS "tpgo_admin_insert" ON public.tabela_preco_gravacao_oficial;
CREATE POLICY "tpgo_admin_insert" ON public.tabela_preco_gravacao_oficial
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "tpgo_admin_update" ON public.tabela_preco_gravacao_oficial;
CREATE POLICY "tpgo_admin_update" ON public.tabela_preco_gravacao_oficial
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "tpgo_dev_delete" ON public.tabela_preco_gravacao_oficial;
CREATE POLICY "tpgo_dev_delete" ON public.tabela_preco_gravacao_oficial
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── tabela_preco_gravacao_oficial_faixa (3) ───
DROP POLICY IF EXISTS "tpgof_admin_insert" ON public.tabela_preco_gravacao_oficial_faixa;
CREATE POLICY "tpgof_admin_insert" ON public.tabela_preco_gravacao_oficial_faixa
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "tpgof_admin_update" ON public.tabela_preco_gravacao_oficial_faixa;
CREATE POLICY "tpgof_admin_update" ON public.tabela_preco_gravacao_oficial_faixa
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "tpgof_dev_delete" ON public.tabela_preco_gravacao_oficial_faixa;
CREATE POLICY "tpgof_dev_delete" ON public.tabela_preco_gravacao_oficial_faixa
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── tecnicas_gravacao (3) ───
DROP POLICY IF EXISTS "tg_admin_insert" ON public.tecnicas_gravacao;
CREATE POLICY "tg_admin_insert" ON public.tecnicas_gravacao
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "tg_admin_update" ON public.tecnicas_gravacao;
CREATE POLICY "tg_admin_update" ON public.tecnicas_gravacao
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "tg_dev_delete" ON public.tecnicas_gravacao;
CREATE POLICY "tg_dev_delete" ON public.tecnicas_gravacao
  FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- ─── user_roles (4 — DECISÃO 1.a: admin agora gerencia, não mais só dev) ───
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

DROP POLICY IF EXISTS "Supervisors read all roles" ON public.user_roles;
CREATE POLICY "Coord and above read all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_coord_or_above(auth.uid()));

-- ─── variant_commemorative_dates (1, lia profiles.role direto) ───
DROP POLICY IF EXISTS "Admins can manage variant commemorative dates" ON public.variant_commemorative_dates;
CREATE POLICY "Admins or above manage variant commemorative dates" ON public.variant_commemorative_dates
  FOR ALL TO public
  USING (public.is_admin_or_above((SELECT auth.uid())))
  WITH CHECK (public.is_admin_or_above((SELECT auth.uid())));

-- ===== BLOCO 4: Validação pós-aplicação =====

DO $$
DECLARE
  _legacy_refs int;
  _joaquim_id  constant uuid := '75921d8b-611f-4413-9ce5-afccdb733d26';
  _abner_id    constant uuid := '697f84e2-c308-4e45-992c-c7762565ca65';
BEGIN
  -- Pós-condição 1: zero policies em public ainda referenciam helpers legados
  -- (excluindo a função fn_is_admin_user que virou alias e está OK ser referenciada)
  SELECT COUNT(*) INTO _legacy_refs
  FROM pg_policies
  WHERE schemaname='public'
    AND (
      COALESCE(qual::text,'') || COALESCE(with_check::text,'') ~* 'is_admin_strict'
      OR COALESCE(qual::text,'') || COALESCE(with_check::text,'') ~* 'is_supervisor_or_above'
      OR (COALESCE(qual::text,'') || COALESCE(with_check::text,'') ~* '(?<![_a-z])is_admin\s*\('
          AND COALESCE(qual::text,'') || COALESCE(with_check::text,'') !~* 'is_admin_strict'
          AND COALESCE(qual::text,'') || COALESCE(with_check::text,'') !~* 'is_admin_or_above'
          AND COALESCE(qual::text,'') || COALESCE(with_check::text,'') !~* 'is_admin_user')
      OR (COALESCE(qual::text,'') ~* 'FROM\s+profiles[^_a-z]' 
          AND COALESCE(qual::text,'') ~* 'role\s*=\s*''admin''')
    );
  IF _legacy_refs > 0 THEN
    RAISE EXCEPTION 'A1-1c POS-CONDICAO 1 FALHOU: % policies ainda referenciam helpers legados.', _legacy_refs;
  END IF;
  
  -- Pós-condição 2: Joaquim (admin) deve passar em is_admin_or_above
  IF NOT public.is_admin_or_above(_joaquim_id) THEN
    RAISE EXCEPTION 'A1-1c POS-CONDICAO 2: Joaquim deveria passar em is_admin_or_above mas nao passa.';
  END IF;
  
  -- Pós-condição 3: Joaquim NÃO deve passar em is_dev
  IF public.is_dev(_joaquim_id) THEN
    RAISE EXCEPTION 'A1-1c POS-CONDICAO 3: Joaquim ainda passa em is_dev (downgrade falhou).';
  END IF;
  
  -- Pós-condição 4: Abner (dev) deve passar em is_dev e em is_admin_or_above
  IF NOT (public.is_dev(_abner_id) AND public.is_admin_or_above(_abner_id)) THEN
    RAISE EXCEPTION 'A1-1c POS-CONDICAO 4: Abner deveria passar em is_dev e is_admin_or_above.';
  END IF;
  
  -- Pós-condição 5: fn_is_admin_user agora delega pra is_admin_or_above
  IF public.fn_is_admin_user(_joaquim_id) <> public.is_admin_or_above(_joaquim_id) THEN
    RAISE EXCEPTION 'A1-1c POS-CONDICAO 5: fn_is_admin_user nao retorna mesmo valor que is_admin_or_above.';
  END IF;
  
  RAISE NOTICE 'A1-1c OK: 114 policies + fn_is_admin_user + fn_grant_default_role_on_profile reescritos.';
END $$;
