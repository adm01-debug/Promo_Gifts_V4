
-- ============================================================
-- ETAPA 8: Criar pg_cron jobs de manutenção SEO automática
-- Job A: Populate SEO de novos produtos (diário 05:00)
-- Job B: Recalcular scores produtos não auditados (diário 05:30)
-- ============================================================

-- -----------------------------------------------
-- JOB A: seo-populate-new-products
-- Roda todo dia às 05:00 — popula produtos sem slug
-- Custo baixíssimo: só toca quem está sem SEO
-- -----------------------------------------------
SELECT cron.schedule(
    'seo-populate-new-products',
    '0 5 * * *',
    $$
    SELECT fn_populate_all_products_seo(
        p_supplier_id := NULL::uuid,
        p_force       := false
    );
    $$
);

-- -----------------------------------------------
-- JOB B: seo-recalculate-stale-scores
-- Roda todo dia às 05:30 — recalcula scores não auditados há +24h
-- p_only_stale=true = não reprocessa produtos recém-auditados
-- -----------------------------------------------
SELECT cron.schedule(
    'seo-recalculate-stale-scores',
    '30 5 * * *',
    $$
    SELECT fn_update_all_seo_scores(
        p_only_stale  := true,
        p_supplier_id := NULL::uuid
    );
    $$
);
;
