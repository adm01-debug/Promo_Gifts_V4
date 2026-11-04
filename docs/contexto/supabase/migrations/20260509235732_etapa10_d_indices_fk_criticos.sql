-- Índices em FKs críticas (HOT paths, evitam table scan em DELETE/UPDATE de parent)
-- 17 índices nas FKs mais propensas a uso

-- Mockups (Etapa 5) — JOIN frequente por produto/técnica
CREATE INDEX IF NOT EXISTS idx_generated_mockups_product_id    ON public.generated_mockups(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_mockups_technique_id  ON public.generated_mockups(technique_id) WHERE technique_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_mockups_approved_by   ON public.generated_mockups(approved_by_user_id) WHERE approved_by_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mockup_jobs_product_id          ON public.mockup_generation_jobs(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mockup_jobs_technique_id        ON public.mockup_generation_jobs(technique_id) WHERE technique_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mockup_credit_tx_account        ON public.mockup_credit_transactions(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_mockup_credit_tx_job            ON public.mockup_credit_transactions(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mockup_credit_tx_mockup         ON public.mockup_credit_transactions(mockup_id) WHERE mockup_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mockup_templates_technique      ON public.mockup_templates(default_technique_id) WHERE default_technique_id IS NOT NULL;

-- Workflow (Etapa 3C)
CREATE INDEX IF NOT EXISTS idx_discount_approvals_admin_id     ON public.discount_approval_requests(admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kit_templates_created_by        ON public.kit_templates(created_by) WHERE created_by IS NOT NULL;

-- Catálogo (HOT)
CREATE INDEX IF NOT EXISTS idx_attribute_def_group_id          ON public.attribute_definitions(group_id);
CREATE INDEX IF NOT EXISTS idx_collection_products_product_id  ON public.collection_products(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_variant_id        ON public.price_history(variant_id) WHERE variant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_color_variations_color_group    ON public.color_variations(color_group_id) WHERE color_group_id IS NOT NULL;

-- Filas/queues (background jobs)
CREATE INDEX IF NOT EXISTS idx_ai_desc_queue_org               ON public.ai_description_queue(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_sync_queue_org            ON public.media_sync_queue(organization_id) WHERE organization_id IS NOT NULL;
