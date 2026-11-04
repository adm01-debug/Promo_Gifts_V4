-- Fix CRITICAL: Tables with ALL access for PUBLIC (anonymous)

-- print_area_techniques: restrict write to service_role
DROP POLICY IF EXISTS service_role_all ON public.print_area_techniques;
CREATE POLICY pat_all_service ON public.print_area_techniques FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pat_select_auth ON public.print_area_techniques FOR SELECT TO authenticated USING (true);

-- product_images: restrict write to service_role
DROP POLICY IF EXISTS product_images_all_service ON public.product_images;
CREATE POLICY pi_all_service ON public.product_images FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pi_select_auth ON public.product_images FOR SELECT TO authenticated USING (true);

-- product_videos: restrict write to service_role
DROP POLICY IF EXISTS product_videos_all_service ON public.product_videos;
CREATE POLICY pv_all_service ON public.product_videos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY pv_select_auth ON public.product_videos FOR SELECT TO authenticated USING (true);

-- scraper tables: service_role only
DROP POLICY IF EXISTS service_role_full_access_checkpoints ON public.scraper_checkpoints;
CREATE POLICY sc_all_service ON public.scraper_checkpoints FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_full_access_staging ON public.scraper_images_staging;
CREATE POLICY sis_all_service ON public.scraper_images_staging FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS srv_sm_staging ON public.sm_images_staging;
CREATE POLICY smis_all_service ON public.sm_images_staging FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS srv_sm_parts ON public.sm_worker_partitions;
CREATE POLICY smwp_all_service ON public.sm_worker_partitions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- material_equivalences: restrict write to service_role
DROP POLICY IF EXISTS me_insert ON public.material_equivalences;
DROP POLICY IF EXISTS me_update ON public.material_equivalences;
DROP POLICY IF EXISTS me_delete ON public.material_equivalences;
CREATE POLICY me_all_service ON public.material_equivalences FOR ALL TO service_role USING (true) WITH CHECK (true);
